from datetime import timedelta
from io import StringIO

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Activity, Project, Task, User


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class WorkspaceAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="test-password",
            role="admin",
            first_name="Alex",
        )
        cls.manager = User.objects.create_user(
            username="manager@example.com",
            email="manager@example.com",
            password="test-password",
            role="manager",
            first_name="Sam",
        )
        cls.member = User.objects.create_user(
            username="member@example.com",
            email="member@example.com",
            password="test-password",
            role="member",
            first_name="Maya",
        )
        cls.project = Project.objects.create(
            name="Merchant platform",
            code="MRC",
            client="Northstar",
            owner=cls.manager,
            due_date=timezone.localdate() + timedelta(days=7),
            status="active",
        )
        cls.task = Task.objects.create(
            project=cls.project,
            title="Review merchant onboarding",
            assignee=cls.member,
            due_date=timezone.localdate() - timedelta(days=1),
            estimate_hours=6,
        )

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def signed_in(self, user=None):
        self.client.force_authenticate(user or self.admin)

    def project_payload(self, **extra):
        return {
            "name": "Release operations",
            "code": "REL",
            "client": "Internal",
            "owner": self.manager.id,
            "due_date": str(timezone.localdate()),
            **extra,
        }

    def task_payload(self, **extra):
        return {
            "title": "Check rollback",
            "project": self.project.id,
            "assignee": self.member.id,
            "due_date": str(timezone.localdate()),
            **extra,
        }

    def test_protected_routes_require_authentication(self):
        for path in ["auth/me/", "projects/", "tasks/", "team/", "analytics/", "activity/"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/api/{path}").status_code, 403)

    def test_login_current_user_and_logout(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "  ADMIN@example.com ",
                "password": "test-password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "admin")
        self.assertNotIn("password", response.data)
        self.assertEqual(self.client.get("/api/auth/me/").data["id"], self.admin.id)
        self.assertTrue(self.client.cookies[settings.SESSION_COOKIE_NAME]["httponly"])
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_invalid_and_inactive_login(self):
        for payload in [
            {},
            {"email": [], "password": "bad"},
            {"email": "admin@example.com", "password": "wrong"},
        ]:
            self.assertEqual(
                self.client.post("/api/auth/login/", payload, format="json").status_code, 400
            )
        self.admin.is_active = False
        self.admin.save()
        self.assertEqual(
            self.client.post(
                "/api/auth/login/",
                {
                    "email": self.admin.email,
                    "password": "test-password",
                },
                format="json",
            ).status_code,
            400,
        )

    def test_workspace_cookies_preserve_other_local_app_sessions(self):
        self.assertEqual(settings.SESSION_COOKIE_NAME, "opsboard_sessionid")
        self.assertEqual(settings.CSRF_COOKIE_NAME, "opsboard_csrftoken")
        client = APIClient(enforce_csrf_checks=True)
        client.cookies["sessionid"] = "another-app-session"
        client.cookies["csrftoken"] = "a" * 32
        csrf = client.get("/api/auth/csrf/")
        self.assertIn(settings.CSRF_COOKIE_NAME, csrf.cookies)
        self.assertEqual(
            client.post(
                "/api/auth/login/",
                {"email": self.admin.email, "password": "test-password"},
                HTTP_X_CSRFTOKEN=csrf.data["csrfToken"],
            ).status_code,
            200,
        )
        self.assertEqual(client.get("/api/auth/me/").data["id"], self.admin.id)
        token = client.get("/api/auth/csrf/").data["csrfToken"]
        self.assertEqual(client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code, 204)
        self.assertEqual(client.get("/api/auth/me/").status_code, 403)
        self.assertEqual(client.cookies["sessionid"].value, "another-app-session")
        self.assertEqual(client.cookies["csrftoken"].value, "a" * 32)

    def test_login_throttles_repeated_attempts(self):
        for _ in range(10):
            self.client.post("/api/auth/login/", {"email": "none@example.com", "password": "wrong"})
        self.assertEqual(self.client.post("/api/auth/login/", {}).status_code, 429)

    def test_csrf_required_for_login_and_authenticated_mutations(self):
        client = APIClient(enforce_csrf_checks=True)
        payload = {"email": self.admin.email, "password": "test-password"}
        self.assertEqual(client.post("/api/auth/login/", payload).status_code, 403)
        token = client.get("/api/auth/csrf/").data["csrfToken"]
        self.assertEqual(
            client.post("/api/auth/login/", payload, HTTP_X_CSRFTOKEN=token).status_code, 200
        )
        self.assertEqual(client.post("/api/projects/", self.project_payload()).status_code, 403)
        token = client.get("/api/auth/csrf/").data["csrfToken"]
        self.assertEqual(
            client.post(
                "/api/projects/", self.project_payload(), HTTP_X_CSRFTOKEN=token
            ).status_code,
            201,
        )
        self.assertEqual(client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code, 204)

    def test_manager_project_create_read_edit_and_archive(self):
        self.signed_in(self.manager)
        response = self.client.post(
            "/api/projects/", self.project_payload(code="rel"), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["code"], "REL")
        url = f"/api/projects/{response.data['id']}/"
        self.assertEqual(self.client.get(url).data["progress"], 0)
        self.assertEqual(self.client.patch(url, {"name": "Launch operations"}).status_code, 200)
        self.assertEqual(
            self.client.post(f"{url}archive/", {"archived": True}, format="json").status_code, 200
        )
        self.assertTrue(self.client.get(url).data["archived"])
        self.assertEqual(
            self.client.post(f"{url}archive/", {"archived": False}, format="json").status_code, 200
        )
        self.assertFalse(self.client.get(url).data["archived"])
        self.assertTrue(Activity.objects.filter(message="created Release operations").exists())

    def test_only_admin_deletes_projects_and_cascades_tasks(self):
        url = f"/api/projects/{self.project.id}/"
        self.signed_in(self.manager)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.signed_in()
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Task.objects.filter(pk=self.task.id).exists())
        self.assertTrue(
            Activity.objects.filter(message="deleted project Merchant platform").exists()
        )

    def test_member_cannot_mutate_projects(self):
        self.signed_in(self.member)
        self.assertEqual(
            self.client.post("/api/projects/", self.project_payload()).status_code, 403
        )
        self.assertEqual(
            self.client.patch(f"/api/projects/{self.project.id}/", {"name": "No"}).status_code, 403
        )
        self.assertEqual(
            self.client.post(f"/api/projects/{self.project.id}/archive/", {}).status_code, 403
        )

    def test_project_validation(self):
        self.signed_in()
        for extra in [
            {"code": "MRC"},
            {"code": "mrc"},
            {"code": "1!"},
            {"name": ""},
            {"color": "red"},
            {"due_date": "invalid"},
            {"status": "unknown"},
            {"owner": 999999},
        ]:
            with self.subTest(extra=extra):
                self.assertEqual(
                    self.client.post(
                        "/api/projects/", self.project_payload(**extra), format="json"
                    ).status_code,
                    400,
                )

    def test_inactive_owner_and_archive_boolean_validation(self):
        self.signed_in()
        self.member.is_active = False
        self.member.save()
        self.assertEqual(
            self.client.post(
                "/api/projects/", self.project_payload(owner=self.member.id)
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                f"/api/projects/{self.project.id}/archive/", {"archived": "false"}, format="json"
            ).status_code,
            400,
        )

    def test_manager_task_crud_and_project_filter(self):
        self.signed_in(self.manager)
        response = self.client.post(
            "/api/tasks/", self.task_payload(tags=["QA", "qa", "Review"]), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["tags"], ["qa", "review"])
        url = f"/api/tasks/{response.data['id']}/"
        self.assertEqual(self.client.get(url).data["title"], "Check rollback")
        self.assertEqual(
            self.client.patch(url, {"priority": "urgent", "estimate_hours": 12}).status_code, 200
        )
        self.assertEqual(len(self.client.get(f"/api/tasks/?project={self.project.id}").data), 2)
        self.assertEqual(self.client.get("/api/tasks/?project=no").status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_member_updates_only_own_status(self):
        self.signed_in(self.member)
        url = f"/api/tasks/{self.task.id}/"
        self.assertEqual(self.client.patch(url, {"status": "in_progress"}).status_code, 200)
        self.assertEqual(self.client.patch(url, {"title": "Changed"}).status_code, 403)
        self.assertEqual(
            self.client.patch(url, {"status": "done", "assignee": self.admin.id}).status_code, 403
        )
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertEqual(self.client.post("/api/tasks/", self.task_payload()).status_code, 403)
        self.task.assignee = self.manager
        self.task.save()
        self.assertEqual(self.client.patch(url, {"status": "done"}).status_code, 403)

    def test_completion_timestamp_and_reopening(self):
        self.signed_in()
        url = f"/api/tasks/{self.task.id}/"
        completed = self.client.patch(url, {"status": "done"}).data["completed_at"]
        self.assertIsNotNone(completed)
        self.assertEqual(
            self.client.patch(url, {"priority": "high"}).data["completed_at"], completed
        )
        self.assertEqual(self.client.get(f"/api/projects/{self.project.id}/").data["progress"], 100)
        self.assertIsNone(self.client.patch(url, {"status": "backlog"}).data["completed_at"])
        self.assertEqual(self.client.get(f"/api/projects/{self.project.id}/").data["progress"], 0)

    def test_archived_projects_make_tasks_read_only(self):
        self.signed_in()
        self.project.archived = True
        self.project.save()
        self.assertEqual(
            self.client.post("/api/tasks/", self.task_payload(), format="json").status_code, 400
        )
        url = f"/api/tasks/{self.task.id}/"
        self.assertEqual(self.client.patch(url, {"status": "done"}).status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)
        other = Project.objects.create(**{**self.project_payload(), "owner": self.manager})
        self.assertEqual(self.client.patch(url, {"project": other.id}).status_code, 400)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_task_validation(self):
        self.signed_in()
        for extra in [
            {"title": ""},
            {"status": "bad"},
            {"priority": "critical"},
            {"estimate_hours": 0},
            {"estimate_hours": 161},
            {"due_date": "wrong"},
            {"project": 0},
            {"tags": "qa"},
            {"tags": ["a"] * 7},
            {"tags": [1]},
            {"tags": [""]},
            {"tags": ["a" * 25]},
        ]:
            with self.subTest(extra=extra):
                self.assertEqual(
                    self.client.post(
                        "/api/tasks/", self.task_payload(**extra), format="json"
                    ).status_code,
                    400,
                )

    def test_inactive_assignee_rejected_and_unassigned_allowed(self):
        self.signed_in()
        self.member.is_active = False
        self.member.save()
        self.assertEqual(
            self.client.post("/api/tasks/", self.task_payload(), format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post(
                "/api/tasks/", self.task_payload(assignee=None), format="json"
            ).status_code,
            201,
        )

    def test_analytics_and_workload_follow_database(self):
        self.signed_in()
        stats = self.client.get("/api/analytics/?days=7").data
        self.assertEqual(stats["active_projects"], 1)
        self.assertEqual(stats["total_tasks"], 1)
        self.assertEqual(stats["overdue_tasks"], 1)
        self.assertEqual(len(stats["series"]), 7)
        person = next(row for row in stats["workload"] if row["id"] == self.member.id)
        self.assertEqual(person["assigned_hours"], 6)
        self.assertEqual(person["utilization"], 15)
        self.client.patch(f"/api/tasks/{self.task.id}/", {"status": "done"})
        stats = self.client.get("/api/analytics/").data
        self.assertEqual(stats["completed_in_period"], 1)
        self.assertEqual(stats["overdue_tasks"], 0)
        self.assertEqual(sum(row["completed"] for row in stats["series"]), 1)
        self.project.archived = True
        self.project.save()
        stats = self.client.get("/api/analytics/").data
        self.assertEqual(stats["total_tasks"], 0)
        self.assertEqual(stats["active_projects"], 0)
        self.assertEqual(self.client.get("/api/analytics/?days=1").status_code, 400)
        self.assertEqual(len(self.client.get("/api/analytics/?days=30").data["series"]), 30)

    def test_role_change_requires_admin_and_cannot_change_self(self):
        url = f"/api/team/{self.member.id}/"
        self.signed_in(self.manager)
        self.assertEqual(self.client.patch(url, {"role": "admin"}).status_code, 403)
        self.signed_in()
        self.assertEqual(self.client.patch(url, {"role": "manager"}).status_code, 200)
        self.member.refresh_from_db()
        self.assertEqual(self.member.role, "manager")
        self.assertFalse(self.member.is_staff)
        self.assertEqual(
            self.client.patch(f"/api/team/{self.admin.id}/", {"role": "member"}).status_code, 400
        )
        self.assertEqual(self.client.patch(url, {"role": "other"}).status_code, 400)
        self.assertEqual(
            self.client.patch(url, {"role": "admin", "is_superuser": True}).status_code, 400
        )
        self.assertEqual(
            self.client.patch("/api/team/999999/", {"role": "member"}).status_code, 404
        )

    def test_activity_has_actor_and_health_is_public(self):
        self.assertEqual(self.client.get("/api/health/").data, {"status": "ok"})
        self.signed_in()
        self.client.patch(f"/api/tasks/{self.task.id}/", {"status": "done"})
        event = self.client.get("/api/activity/").data[0]
        self.assertEqual(event["actor"]["id"], self.admin.id)
        self.assertEqual(event["project"], self.project.id)
        self.assertIn("Done", event["message"])

    def test_technical_superuser_has_effective_admin_role(self):
        superuser = User.objects.create_superuser(
            username="owner@example.com", email="owner@example.com", password="owner-password"
        )
        self.signed_in(superuser)
        data = self.client.get("/api/auth/me/").data
        self.assertEqual(data["role"], "admin")
        self.assertTrue(data["can_access_admin"])
        self.assertTrue(data["role_locked"])
        self.signed_in()
        self.assertEqual(
            self.client.patch(f"/api/team/{superuser.id}/", {"role": "member"}).status_code, 400
        )

    def test_project_list_uses_annotated_counts_without_per_row_queries(self):
        self.signed_in()
        # Force authentication avoids a session query; owners and task totals share one SELECT.
        with self.assertNumQueries(1):
            self.assertEqual(self.client.get("/api/projects/").status_code, 200)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class DemoSeedTests(TestCase):
    @override_settings(DEBUG=True)
    def test_seed_is_complete_and_repeat_safe(self):
        output = StringIO()
        call_command("seed_demo", stdout=output)
        self.assertEqual(
            (User.objects.count(), Project.objects.count(), Task.objects.count()), (6, 6, 45)
        )
        admin = User.objects.get(email="admin@example.com")
        self.assertTrue(admin.check_password("demo-password"))
        self.assertNotEqual(admin.password, "demo-password")
        self.assertNotIn("demo-password", output.getvalue())
        admin.set_password("changed-password")
        admin.save()
        call_command("seed_demo", stdout=output)
        admin.refresh_from_db()
        self.assertTrue(admin.check_password("changed-password"))
        self.assertEqual(Task.objects.count(), 45)

    @override_settings(DEBUG=False)
    def test_demo_seed_refuses_production(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo")
