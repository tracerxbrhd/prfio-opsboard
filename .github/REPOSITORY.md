# Repository metadata

Description: Team operations workspace for managing projects, workloads, deadlines, and delivery in one place.

Topics: `react`, `django`, `django-rest-framework`, `postgresql`, `vite`, `project-management`, `dashboard`, `rest-api`, `docker`, `playwright`, `accessibility`

Publishing, after authenticating GitHub CLI from this directory:

```bash
gh repo create prfio-opsboard --public --source=. --remote=origin --push --description "Team operations workspace for managing projects, workloads, deadlines, and delivery in one place."
gh repo edit --add-topic react,django,django-rest-framework,postgresql,vite,project-management,dashboard,rest-api,docker,playwright,accessibility
```

Check for an existing repository before creating one. Do not force-push or replace an existing history. This full-stack app is intended for local Docker review or a dedicated host; GitHub Pages cannot host its Python API.
