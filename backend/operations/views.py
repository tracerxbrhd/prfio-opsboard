from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Activity, Task, User
from .permissions import ProjectPermission, TaskPermission
from .serializers import (
    ActivitySerializer,
    ProjectSerializer,
    TaskSerializer,
    UserSerializer,
)
from .services import analytics, project_queryset, record_activity, workload


class LoginThrottle(AnonRateThrottle):
    scope = "login"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginThrottle]

    def post(self, request):
        email = request.data.get("email", "")
        password = request.data.get("password", "")
        if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
            raise ValidationError({"detail": "Enter your email and password."})
        user_record = User.objects.filter(email__iexact=email.strip()).first()
        user = authenticate(
            request,
            username=user_record.username if user_record else email,
            password=password,
        )
        if not user:
            return Response(
                {"detail": "Email or password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]

    def get_queryset(self):
        return project_queryset()

    @transaction.atomic
    def perform_create(self, serializer):
        project = serializer.save()
        record_activity(self.request.user, f"created {project.name}", project)

    @transaction.atomic
    def perform_update(self, serializer):
        project = serializer.save()
        record_activity(self.request.user, f"updated {project.name}", project)

    @transaction.atomic
    def perform_destroy(self, instance):
        record_activity(self.request.user, f"deleted project {instance.name}")
        instance.delete()

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def archive(self, request, pk=None):
        project = self.get_object()
        archived = request.data.get("archived", True)
        if not isinstance(archived, bool):
            raise ValidationError({"archived": "Use true or false."})
        project.archived = archived
        project.save(update_fields=["archived", "updated_at"])
        record_activity(
            request.user,
            f"{'archived' if archived else 'restored'} {project.name}",
            project,
        )
        return Response(self.get_serializer(project).data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, TaskPermission]

    def get_queryset(self):
        queryset = Task.objects.select_related("project", "assignee")
        project = self.request.query_params.get("project")
        if project:
            if not project.isdigit():
                raise ValidationError({"project": "Use a project ID."})
            queryset = queryset.filter(project_id=project)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        task = serializer.save()
        record_activity(self.request.user, f"created task {task.title}", task.project)

    @transaction.atomic
    def perform_update(self, serializer):
        task = serializer.save()
        record_activity(
            self.request.user,
            f"updated {task.title} · {task.get_status_display()}",
            task.project,
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.project.archived:
            raise ValidationError({"project": "Restore this project before deleting its tasks."})
        record_activity(self.request.user, f"deleted task {instance.title}", instance.project)
        instance.delete()


class TeamView(APIView):
    def get(self, request):
        return Response(workload())


class TeamRoleView(APIView):
    @transaction.atomic
    def patch(self, request, pk):
        if request.user.role != "admin" and not request.user.is_superuser:
            raise PermissionDenied("Only admins can change team roles.")
        if set(request.data) != {"role"} or request.data.get("role") not in User.Role.values:
            raise ValidationError({"role": "Choose admin, manager or member."})
        if pk == request.user.id:
            raise ValidationError({"role": "You cannot change your own role."})
        try:
            user = User.objects.select_for_update().get(pk=pk, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Team member not found."}, status=404)
        if user.is_superuser:
            raise ValidationError({"role": "Superuser roles are managed in Django admin."})
        user.role = request.data["role"]
        user.save(update_fields=["role"])
        record_activity(request.user, f"changed {user.get_full_name()}'s role to {user.role}")
        return Response(UserSerializer(user).data)


class AnalyticsView(APIView):
    def get(self, request):
        days = request.query_params.get("days", "14")
        if days not in ("7", "14", "30"):
            raise ValidationError({"days": "Choose 7, 14 or 30 days."})
        return Response(analytics(int(days)))


class ActivityView(APIView):
    def get(self, request):
        return Response(
            ActivitySerializer(Activity.objects.select_related("actor")[:100], many=True).data
        )


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        User.objects.exists()
        return Response({"status": "ok"})
