from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_lead(user):
    return user.is_authenticated and (user.role in ("admin", "manager") or user.is_superuser)


class ProjectPermission(BasePermission):
    message = "Only managers and admins can change projects; only admins can delete them."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        if request.method == "DELETE":
            return request.user.role == "admin" or request.user.is_superuser
        return is_lead(request.user)


class TaskPermission(BasePermission):
    message = "Members can update the status of their assigned tasks only."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS or request.method in ("PATCH", "PUT"):
            return True
        return is_lead(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS or is_lead(request.user):
            return True
        return obj.assignee_id == request.user.id and set(request.data) <= {"status"}
