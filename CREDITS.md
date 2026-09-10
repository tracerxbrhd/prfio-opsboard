# Credits

## Design research

Reviewed on 7 September 2026. These references informed patterns and decisions; no external page design or proprietary implementation was copied.

- [Carbon Design System: dashboards](https://carbondesignsystem.com/data-visualization/dashboards/) — information hierarchy, predictable data colors, and removing ornament that competes with comparison.
- [Carbon Design System: data tables](https://carbondesignsystem.com/components/data-table/usage/) — clear row identity, explicit filters, toolbar placement, and readable operational density. OpsBoard implements its own React components and CSS.
- [MDN: native modal dialogs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) — native focus containment, inert background content, and Escape dismissal.
- [MDN: reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — optional motion that respects the operating-system preference.

## Icons and artwork

[Flaticon project-management icon](https://www.flaticon.com/free-icon/project-management_14991755) was selected as a reference for a coherent line-based productivity family. Its page lists a license requiring attribution and an SVG download/account flow. Automated acquisition of a verifiable licensed SVG pack was not available in this environment.

The shipped app therefore uses the requested fallback: original, locally authored SVG path icons in `frontend/src/icons.jsx`, plus an original geometric wordmark and favicon. They are consistent at a 24-unit viewbox with matching stroke weight. **No Flaticon asset is distributed**, so the app does not imply a license or attribution relationship for its original fallback paths. Replace the fallback only after obtaining the appropriate Flaticon resource and its required attribution.

The login workstream drawing, progress bars, donut chart, and timeline are original CSS/SVG compositions. Charts use project data from the API. There are no remote photographs, decorative stock images, image placeholders, or externally hosted assets.

## Typography

IBM Plex Sans and IBM Plex Mono are by IBM, distributed locally through Fontsource under the SIL Open Font License 1.1. The original font license notices are retained in [docs/licenses](docs/licenses). Only the Latin subsets and used weights are bundled.

- [IBM Plex](https://github.com/IBM/plex)
- [Fontsource IBM Plex Sans](https://fontsource.org/fonts/ibm-plex-sans)
- [Fontsource IBM Plex Mono](https://fontsource.org/fonts/ibm-plex-mono)

## Software

| Software | Use | License |
| --- | --- | --- |
| React / React DOM | Client UI | MIT |
| React Router | Workspace navigation | MIT |
| Vite | Development server and build | MIT |
| Django | Application framework and administration | BSD-3-Clause |
| Django REST Framework | REST endpoints, validation, permissions | BSD-3-Clause |
| django-cors-headers | Explicit CORS policy | MIT |
| dj-database-url | Database URL configuration | BSD-3-Clause |
| Psycopg | PostgreSQL adapter | LGPL-3.0 |
| Gunicorn | WSGI process server | MIT |
| PostgreSQL | Production database | PostgreSQL License |
| Nginx | Static serving and same-origin reverse proxy | BSD-2-Clause |
| Playwright | Browser automation | Apache-2.0 |
| axe-core / axe Playwright integration | Automated accessibility verification | MPL-2.0 |
| ESLint, Prettier, Ruff | Static analysis and formatting | MIT |

Dependency licenses remain with their packages. `frontend/package-lock.json` and `requirements.txt` record exact installed dependency versions. OpsBoard application source is covered by the repository MIT license; third-party licenses retain their original terms.

Demo project briefs, people, tasks, labels, and product copy were written for this workspace. They do not imply customer relationships or commercial delivery history.
