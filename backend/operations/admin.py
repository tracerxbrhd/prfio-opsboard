from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Activity, Project, Task, User

admin.site.site_header = "OpsBoard administration"
admin.site.site_title = "OpsBoard admin"


@admin.register(User)
class OperationsUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Operations", {"fields": ("role", "job_title", "capacity_hours", "color")}),
    )
    list_display = ("email", "first_name", "last_name", "role", "is_active")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "owner", "due_date", "archived")
    list_filter = ("status", "archived")
    search_fields = ("name", "code", "client")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "assignee", "due_date")
    list_filter = ("status", "priority", "project")
    search_fields = ("title",)
    readonly_fields = ("completed_at",)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("actor", "message", "created_at")
    readonly_fields = ("actor", "message", "project", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
