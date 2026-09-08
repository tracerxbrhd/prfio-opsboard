from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityView,
    AnalyticsView,
    CsrfView,
    HealthView,
    LoginView,
    LogoutView,
    MeView,
    ProjectViewSet,
    TaskViewSet,
    TeamRoleView,
    TeamView,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")
urlpatterns = [
    path("auth/csrf/", CsrfView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("team/", TeamView.as_view()),
    path("team/<int:pk>/", TeamRoleView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
    path("activity/", ActivityView.as_view()),
    path("health/", HealthView.as_view()),
    path("", include(router.urls)),
]
