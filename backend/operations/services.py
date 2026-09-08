from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Activity, Project, Task, User
from .serializers import UserSerializer


def record_activity(user, message, project=None):
    Activity.objects.create(actor=user, message=message[:250], project=project)


def project_queryset():
    return (
        Project.objects.select_related("owner")
        .annotate(
            total_tasks=Count("tasks"),
            completed_tasks=Count("tasks", filter=Q(tasks__status="done")),
        )
        .order_by("archived", "due_date", "id")
    )


def workload():
    users = User.objects.filter(is_active=True).annotate(
        open_tasks=Count(
            "tasks", filter=~Q(tasks__status="done") & Q(tasks__project__archived=False)
        ),
        assigned_hours=Sum(
            "tasks__estimate_hours",
            filter=~Q(tasks__status="done") & Q(tasks__project__archived=False),
        ),
        completed_tasks=Count(
            "tasks", filter=Q(tasks__status="done", tasks__project__archived=False)
        ),
    )
    return [
        {
            **UserSerializer(user).data,
            "open_tasks": user.open_tasks,
            "assigned_hours": user.assigned_hours or 0,
            "completed_tasks": user.completed_tasks,
            "utilization": round((user.assigned_hours or 0) / user.capacity_hours * 100),
        }
        for user in users
    ]


def analytics(days=14):
    today = timezone.localdate()
    tasks = Task.objects.filter(project__archived=False)
    start = today - timedelta(days=days - 1)
    completions = (
        tasks.filter(completed_at__date__gte=start)
        .values("completed_at__date")
        .annotate(count=Count("id"))
    )
    created = (
        tasks.filter(created_at__date__gte=start)
        .values("created_at__date")
        .annotate(count=Count("id"))
    )
    done_map = {str(row["completed_at__date"]): row["count"] for row in completions}
    new_map = {str(row["created_at__date"]): row["count"] for row in created}
    series = [
        {
            "date": str(start + timedelta(days=i)),
            "completed": done_map.get(str(start + timedelta(days=i)), 0),
            "created": new_map.get(str(start + timedelta(days=i)), 0),
        }
        for i in range(days)
    ]
    return {
        "active_projects": Project.objects.filter(archived=False)
        .exclude(status="completed")
        .count(),
        "total_tasks": tasks.count(),
        "completed_tasks": tasks.filter(status="done").count(),
        "overdue_tasks": tasks.exclude(status="done").filter(due_date__lt=today).count(),
        "due_this_week": tasks.exclude(status="done")
        .filter(due_date__gte=today, due_date__lte=today + timedelta(days=7))
        .count(),
        "completed_in_period": tasks.filter(completed_at__date__gte=start).count(),
        "statuses": [
            {"status": key, "label": label, "count": tasks.filter(status=key).count()}
            for key, label in Task.Status.choices
        ],
        "priorities": [
            {
                "priority": key,
                "label": label,
                "count": tasks.exclude(status="done").filter(priority=key).count(),
            }
            for key, label in Task.Priority.choices
        ],
        "series": series,
        "workload": workload(),
        "period_days": days,
    }
