import re

from rest_framework import serializers

from .models import Activity, Project, Task, User


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="get_full_name", read_only=True)
    role = serializers.SerializerMethodField()
    can_access_admin = serializers.BooleanField(source="is_staff", read_only=True)
    role_locked = serializers.BooleanField(source="is_superuser", read_only=True)

    def get_role(self, obj):
        return "admin" if obj.is_superuser else obj.role

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "job_title",
            "capacity_hours",
            "color",
            "can_access_admin",
            "role_locked",
        ]
        read_only_fields = fields


class ProjectSerializer(serializers.ModelSerializer):
    owner_detail = UserSerializer(source="owner", read_only=True)
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    progress = serializers.SerializerMethodField()

    def get_progress(self, obj):
        total = obj.total_tasks if hasattr(obj, "total_tasks") else obj.tasks.count()
        completed = (
            obj.completed_tasks
            if hasattr(obj, "completed_tasks")
            else obj.tasks.filter(status="done").count()
        )
        return round(completed / total * 100) if total else 0

    def validate_owner(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Choose an active project owner.")
        return value

    def validate_code(self, value):
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z][A-Z0-9-]{1,7}", value):
            raise serializers.ValidationError(
                "Use 2–8 uppercase letters, digits or hyphens, starting with a letter."
            )
        duplicates = Project.objects.filter(code=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("This project code is already in use.")
        return value

    def validate_color(self, value):
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise serializers.ValidationError("Use a six-digit hex color.")
        return value

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserSerializer(source="assignee", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True)
    project_archived = serializers.BooleanField(source="project.archived", read_only=True)

    def validate_tags(self, value):
        if not isinstance(value, list) or len(value) > 6:
            raise serializers.ValidationError("Provide a list of up to six tags.")
        if any(not isinstance(tag, str) or not tag.strip() or len(tag) > 24 for tag in value):
            raise serializers.ValidationError("Each tag must contain 1–24 characters.")
        return list(dict.fromkeys(tag.strip().lower() for tag in value))

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        if project and project.archived:
            raise serializers.ValidationError(
                {"project": "Restore this archived project before changing its tasks."}
            )
        if self.instance and self.instance.project.archived:
            raise serializers.ValidationError(
                {"project": "Restore this archived project before changing its tasks."}
            )
        assignee = attrs.get("assignee")
        if assignee and not assignee.is_active:
            raise serializers.ValidationError({"assignee": "Choose an active team member."})
        return attrs

    class Meta:
        model = Task
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "completed_at"]


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ["id", "actor", "message", "project", "created_at"]
