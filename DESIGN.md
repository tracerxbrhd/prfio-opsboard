# OpsBoard design

## Concept

A quiet operations desk: dependable navigation, visible ownership, and work that can be scanned before it is opened. The product uses flat surfaces, a dark permanent rail, compact tables, and restrained workstream colors. Its identity is an operational tool rather than a marketing landing page.

## Palette

| Token | Color | Purpose |
| --- | --- | --- |
| Navy | `#132a30` | Navigation and brand anchor |
| Ink | `#21332f` / `#233731` | Primary reading text and ink token |
| Teal | `#277b69` / `#25755f` | Delivery signals and primary buttons |
| Paper | `#ffffff` | Work surfaces |
| Canvas | `#f5f6f2` | Separation between work surfaces |
| Pale sage | `#c4d9b3` | Selected navigation and restrained highlights |
| Amber | `#b58236` family | Deadline and delivery risk |

Secondary text colors were measured with axe and adjusted to meet WCAG AA contrast on the delivered core screens. Status uses words as well as color; urgency includes directional marks. Teammate avatars use a stable muted background and high-contrast initials.

## Typography and spacing

IBM Plex Sans provides a readable industrial character. IBM Plex Mono is reserved for identifiers, numeric captions, dates, and section labels. Body text is 14px, main headings scale from 27px to 36px, and the login display reaches 76px. Small operational labels have an 11px floor. Font files are self-hosted.

The spacing rhythm follows 4px increments, with 16–24px panel padding and 34px desktop page gutters. The rail is 236px. At 800px it becomes a modal navigation drawer; the workspace then uses the full screen width. At 580px the content uses 17px gutters and single-column forms. Tables keep semantic rows and scroll inside their panel instead of making the entire page scroll sideways.

## Shapes and composition

Work panels use restrained 5–6px corners and thin borders. Small role and status chips carry meaning. The login view pairs a large typographic left column with a focused form. The overview places workstreams beside capacity, followed by delivery rhythm and activity. Team cards and task details provide different reading structures without importing a component framework.

## Motion and interaction

Transitions last 150–230ms: focus rings, hover states, small page entrance, drawer movement, and bar-width changes. There are no animated ambient backgrounds or continuous attention effects. `prefers-reduced-motion: reduce` disables animation and transition. Form dialogs use the native top layer; Escape closes them and focus returns to the invoking control. The mobile drawer makes background content inert and restores focus on dismissal.

Charts show exact day data on pointer hover or keyboard focus. Analytics provides a data-table alternative. Empty states explain the lack of matching work, failed submissions retain entered content, and destructive operations describe the affected records before confirmation.

## References and differentiation

The Carbon dashboard and data-table guidance informed the hierarchy; MDN informed dialog and reduced-motion behavior. Full links and attribution decisions are in [CREDITS.md](CREDITS.md).

OpsBoard intentionally uses a navy operational rail, Plex typography, compact tables, and muted teal. These distinguish it from the editorial studio, organic retreat, warm restaurant system, translucent support workspace, and map-led data story elsewhere in the portfolio.
