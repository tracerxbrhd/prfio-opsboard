import os
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from operations.models import Activity, Project, Task, User


class Command(BaseCommand):
    help = "Populate an empty workspace with a realistic, repeat-safe delivery team dataset."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo seeding is disabled when DJANGO_DEBUG=false.")
        if User.objects.exists() or Project.objects.exists():
            self.stdout.write(
                "Workspace already contains data; no records or passwords were changed."
            )
            return
        now = timezone.now()
        today = timezone.localdate()
        password = os.getenv("DEMO_PASSWORD", "demo-password")
        people = [
            ("Alex", "Morgan", "admin", "Operations lead", "#395b80", 40),
            ("Sam", "Rivera", "manager", "Product manager", "#a7754f", 32),
            ("Maya", "Chen", "member", "Product designer", "#728960", 40),
            ("Jordan", "Lee", "member", "Frontend engineer", "#6677a1", 40),
            ("Priya", "Shah", "member", "Backend engineer", "#ad716e", 40),
            ("Theo", "Bennett", "member", "Quality engineer", "#658d97", 32),
        ]
        users = []
        for index, (first, last, role, job, color, capacity) in enumerate(people):
            email = (
                ["admin@example.com", "manager@example.com", "member@example.com"][index]
                if index < 3
                else f"{first.lower()}@example.com"
            )
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first,
                last_name=last,
                role=role,
                job_title=job,
                color=color,
                capacity_hours=capacity,
                is_staff=index == 0,
                is_superuser=index == 0,
            )
            users.append(user)
        specs = [
            (
                "Merchant platform",
                "MRC",
                "Northstar Commerce",
                "active",
                12,
                "#277b70",
                1,
                "A faster workspace for independent merchants. This release brings unified inventory, clearer onboarding and reliable checkout to the Northstar platform.",
                [
                    "Map merchant onboarding states",
                    "Build inventory overview",
                    "Review payment error recovery",
                    "Complete checkout accessibility audit",
                    "Finalize order export schema",
                    "Validate tax calculation rules",
                    "Ship store settings navigation",
                    "Document API handover",
                    "Test inventory sync retries",
                    "Review pricing page content",
                ],
            ),
            (
                "Brand system / v2",
                "BRD",
                "Fieldwork Studio",
                "active",
                19,
                "#a97848",
                2,
                "One consistent visual language across product and communication. Define accessible tokens, reusable components and the guidelines that keep the team aligned.",
                [
                    "Audit existing component library",
                    "Publish typography tokens",
                    "Prepare illustration guidelines",
                    "Document interaction states",
                    "Design notification patterns",
                    "Review form accessibility",
                    "Build color contrast matrix",
                    "Deliver icon library",
                ],
            ),
            (
                "Customer insights",
                "CSI",
                "Northstar Commerce",
                "at_risk",
                6,
                "#677ca6",
                1,
                "Turn customer feedback into actionable product decisions. Connect research notes, support themes and purchase behavior in a shared reporting workflow.",
                [
                    "Resolve event tracking gaps",
                    "Interview returning customers",
                    "Define retention cohorts",
                    "Build feedback dashboard",
                    "Review consent handling",
                    "Validate reporting pipeline",
                    "Present research findings",
                ],
            ),
            (
                "Infrastructure refresh",
                "INF",
                "Internal operations",
                "active",
                25,
                "#7b8860",
                4,
                "Improve deployment confidence and reduce operational overhead. Harden environments, automate backups and make ownership explicit.",
                [
                    "Rotate service credentials",
                    "Configure backup recovery drill",
                    "Set up database alerts",
                    "Test deployment rollback",
                    "Document incident response",
                    "Audit dependency updates",
                    "Migrate staging environment",
                    "Review access policies",
                    "Measure API latency",
                ],
            ),
            (
                "Partner onboarding",
                "PRT",
                "Orbit Partners",
                "planning",
                35,
                "#896f80",
                0,
                "A repeatable onboarding journey for integration partners, from discovery through the first successful launch.",
                [
                    "Write partner welcome guide",
                    "Map integration requirements",
                    "Create sandbox checklist",
                    "Review partner contracts",
                    "Design onboarding milestones",
                    "Schedule pilot walkthrough",
                ],
            ),
            (
                "Workspace foundations",
                "WRK",
                "Internal operations",
                "completed",
                -8,
                "#73808a",
                0,
                "Establish the shared foundations for a focused delivery team: ownership, documentation and a consistent release process.",
                [
                    "Publish team operating guide",
                    "Set up release checklist",
                    "Define project ownership",
                    "Consolidate product documentation",
                    "Launch weekly delivery review",
                ],
            ),
        ]
        for pindex, (
            name,
            code,
            client,
            project_status,
            due,
            color,
            owner,
            description,
            titles,
        ) in enumerate(specs):
            project = Project.objects.create(
                name=name,
                code=code,
                client=client,
                status=project_status,
                due_date=today + timedelta(days=due),
                color=color,
                owner=users[owner],
                description=description,
            )
            for index, title in enumerate(titles):
                task_status = (
                    "done"
                    if project_status == "completed" or index < len(titles) // 2
                    else ["in_progress", "in_review", "backlog"][index % 3]
                )
                task = Task.objects.create(
                    project=project,
                    title=title,
                    description=f"{title} for {client}. Align the implementation with the project brief, review edge cases with the team, and attach findings to the delivery handover.\n\nAcceptance criteria:\n• The agreed workflow is complete and reviewed.\n• Keyboard and error states have been verified.\n• Documentation reflects the final decisions.",
                    status=task_status,
                    priority=["medium", "high", "low", "urgent"][index % 4],
                    assignee=users[(index + pindex) % len(users)],
                    due_date=today
                    + timedelta(
                        days=(-2 if index % 4 == 0 and task_status != "done" else index + pindex)
                    ),
                    tags=[
                        ["design", "review"],
                        ["engineering"],
                        ["research"],
                        ["delivery"],
                    ][index % 4],
                    estimate_hours=[4, 6, 8, 3, 5][index % 5],
                )
                Task.objects.filter(pk=task.pk).update(
                    created_at=now - timedelta(days=26 - index - pindex),
                    completed_at=(now - timedelta(days=(index * 3 + pindex) % 14, hours=index))
                    if task_status == "done"
                    else None,
                )
                if index > 2:
                    Activity.objects.create(
                        actor=task.assignee,
                        project=project,
                        message=f"{'completed' if task_status == 'done' else 'updated'} {title}",
                        created_at=now - timedelta(hours=index * 2 + pindex * 5),
                    )
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {User.objects.count()} people, {Project.objects.count()} projects, {Task.objects.count()} tasks."
            )
        )
