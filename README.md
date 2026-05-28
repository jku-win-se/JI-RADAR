# SustainScrum

A Jira **Forge** app for sustainability assessments on issues: configure the *Sustainability Management Matrix (SuMM)*, capture assessments on the issue view, and use an optional **Sustainability Dashboard** (global or on the project page) with KPIs, heatmap, trends, sprint filter, and export.

Most of the code lives under **`SustainScrum-Plugin/`**.

---

## Prerequisites

- Jira **Cloud**
- [Forge CLI](https://developer.atlassian.com/platform/forge/cli-reference/) and an Atlassian account that can deploy the app
- **Node.js** (LTS; match the `runtime` section in `manifest.yml` if you change it)

## Build and deploy (short version)

From the plugin directory:

```bash
cd SustainScrum-Plugin
npm install
cd custom-ui && npm install && npm run build && cd ..
forge deploy
```

`custom-ui` holds the React Custom UI (separate entries for admin, issue panel, dashboard, action, project, etc.). The Forge resolver runs from **`src/`**. Each of those folders has a short `README.md` with more detail.

## Repository layout

| Path | What it is |
|------|------------|
| `SustainScrum-Plugin/src/` | Resolver: `invoke` handlers, Forge storage, Jira REST via `asUser()` and related APIs |
| `SustainScrum-Plugin/custom-ui/` | Custom UI source; after `npm run build`, the `build-*` folders referenced in `manifest.yml` |
| `SustainScrum-Plugin/manifest.yml` | Modules (admin page, project page, issue panel, issue context, global page, issue actions) and OAuth scopes |

---

## Installation (site administrators)

### How to get an installation link

1. Sign in to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps) with the account that owns the Forge app.
2. Open your app (e.g. **SustainScrum Plugin**).
3. Go to **Distribution**.
4. Under **Distribution controls**, enable **Sharing** (required fields: support/privacy details, etc., as prompted).
5. Select **Jira** (and any other products you need), then **copy the installation link** provided by Atlassian.

Official reference: [Distribute your Forge apps](https://developer.atlassian.com/platform/forge/distribute-your-apps/).

### Permanent links and academic papers

- **Third-party shorteners** (e.g. `biturl.top`, `bit.ly`) are **not** archival or “forever”: the service, account, or redirect target can change or disappear.
- Atlassian **generated install URLs** often include a **signed `signature` query parameter**; using **“Generate new link”** in the Developer Console **invalidates** the previous link.
- For a **stable artefact** in a paper or thesis, prefer: cite this **README** / **repository URL**, the **Marketplace listing** (if you publish there), or an **appendix** with instructions (“obtain current install link from the author or from Developer Console under app ID …”). The **Forge app identifier** in `manifest.yml` (`app.id`) is stable; the **full install URL with signature** is not guaranteed to remain valid indefinitely.

Deploy to **production** before sharing the link: `forge deploy --environment production`.

---

## English user guide

### Overview

| Area | Purpose |
|------|---------|
| **SuMM configuration** | Per project: define assessment **dimensions**, **weights**, and **question texts** for the Sustainability Management Matrix. |
| **Issue assessment** | Per issue: capture or edit SusAF-style scores via a guided **Assessment** UI. |
| **Green DoD / completion** | **Complete with Sustainability Check** validates rules (saved assessment, issue links, low-score justification where required) before transitioning toward **Done** (workflow permitting). |
| **Dashboard** | **KPIs**, **heatmap**, **trends**, optional **sprint** filter, **export** (global app page and/or project tab). |

Exact menu labels match the Forge module titles in `manifest.yml` (see below).

### First-time setup (admin)

1. After installation, open the Forge app **admin page** titled **SustainScrum Plugin**.
2. Configure **SuMM** for each target **project**: dimensions, weights, and wizard questions.
3. Without this configuration, the issue UI or dashboard may show empty states or guidance messages.

### Project app: **SustainScrum**

In a Jira project, open the **SustainScrum** app entry. It exposes two tabs:

| Tab | Route | Purpose |
|-----|-------|---------|
| **SuMM Configuration** | `summ` | Edit SuMM in project context. |
| **Sustainability Dashboard** | `dashboard` | Project-scoped dashboard (KPIs, heatmap, trends, filters, export as implemented). |

### Global page: **Sustainability Dashboard**

If your site surfaces the global Forge page **Sustainability Dashboard**, open it from the Jira / Apps navigation (wording depends on your Jira layout). Select a **project**, optional **sprint** and **trends** window, and use **export** where available.

### Working on an issue

1. Open an issue in the **new Jira issue view**.
2. Open **⋯** (More actions).
3. **Assess sustainability** — opens a **large modal** with the same experience as the **Sustainability Panel** (summary, Green DoD checklist, **Start Sustainability Assessment** / edit flow). This is the most reliable entry point across sites.
4. Optionally, if Jira shows them:  
   - **Sustainability** collapsible block in the **right sidebar** (issue context), and/or  
   - **Sustainability Panel** in the Forge apps chrome on the issue (issue panel).
5. Complete the **Sustainability Assessment** wizard; for very low scores (e.g. ≤ 2), add the **justification** text when prompted — required for the completion check.
6. Ensure at least one **Linked work item** on the issue for traceability (as enforced by the completion action).
7. When ready: **⋯ → Complete with Sustainability Check** — read the checklist, then **Complete Issue** if your workflow allows the transition to Done.

### Manifest module titles (reference)

- Admin: **SustainScrum Plugin**  
- Project app: **SustainScrum** (tabs: **SuMM Configuration**, **Sustainability Dashboard**)  
- Global: **Sustainability Dashboard**  
- Issue (where shown): **Sustainability Panel**, **Sustainability** (context label)  
- Issue actions: **Assess sustainability**, **Complete with Sustainability Check**

### Troubleshooting (short)

| Symptom | Check |
|---------|--------|
| Dashboard empty | SuMM configured; assessments exist for issues in the project. |
| Wizard / storage errors | SuMM completed for that project in admin or project **SuMM Configuration**. |
| Completion fails | Assessment saved, **Linked work items** present, justification for low scores if required. |
| No sidebar panel | Use **⋯ → Assess sustainability** — issue panel/context visibility varies by Jira UI. |

---

## Using it in Jira (one-line outline)

1. Install the app (see **Installation** above).
2. Configure **SuMM** per project via **SustainScrum Plugin** (admin) and/or **SuMM Configuration** (project).
3. On an issue: **⋯ → Assess sustainability**; then **⋯ → Complete with Sustainability Check** when Green DoD rules are satisfied.
4. Open **Sustainability Dashboard** (global or project tab) for aggregates and export.

Missing SuMM setup and other errors are surfaced in the UI.

## License / third parties

Package metadata and licenses are in each `package.json` where applicable. Atlassian Forge platform packages are subject to their respective terms.
