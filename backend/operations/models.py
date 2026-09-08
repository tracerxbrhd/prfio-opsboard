from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        MEMBER = "member", "Member"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    job_title = models.CharField(max_length=80, default="Team member")
    capacity_hours = models.PositiveSmallIntegerField(
        default=40, validators=[MinValueValidator(1), MaxValueValidator(80)]
    )
    color = models.CharField(max_length=7, default="#3e796f")

    class Meta:
        ordering = ["first_name", "last_name"]


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "On track"
        AT_RISK = "at_risk", "At risk"
        COMPLETED = "completed", "Completed"

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=8, unique=True)
    client = models.CharField(max_length=80)
    description = models.TextField(blank=True, max_length=3000)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PLANNING)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="owned_projects")
    due_date = models.DateField()
    color = models.CharField(max_length=7, default="#277c70")
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["archived", "due_date", "id"]

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        IN_PROGRESS = "in_progress", "In progress"
        IN_REVIEW = "in_review", "In review"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, max_length=5000)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.BACKLOG)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    due_date = models.DateField()
    tags = models.JSONField(default=list, blank=True)
    estimate_hours = models.PositiveSmallIntegerField(
        default=4, validators=[MinValueValidator(1), MaxValueValidator(160)]
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "id"]
        indexes = [models.Index(fields=["status", "due_date"])]

    def save(self, *args, **kwargs):
        if self.status == self.Status.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != self.Status.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Activity(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message = models.CharField(max_length=250)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]
