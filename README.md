# SustainScrum

A Jira **Forge** app for sustainability assessments on issues: configure the *Sustainability Management Matrix (SuMM)*, capture assessments on the issue view, and use an optional **Sustainability Dashboard** (global or on the project page) with KPIs, heatmap, trends, sprint filter, and export.

Most of the code lives under **`SustainScrum-Plugin/`**.

## Prerequisites

- Jira **Cloud**
- [Forge CLI](https://developer.atlassian.com/platform/forge/cli-reference/) and an Atlassian account that can deploy the app
- **Node.js** (LTS; match the runtime section in `manifest.yml` if you change it)

## Build and deploy (short version)

From the plugin directory:

```bash
cd SustainScrum-Plugin
npm install
cd custom-ui && npm install && npm run build && cd ..
forge deploy
```

`custom-ui` holds the React Custom UI (separate entries for admin, issue panel, dashboard, etc.). The Forge resolver runs from **`src/`**. Each of those folders has a short `README.md` with more detail.

## Repository layout

| Path | What it is |
|------|------------|
| `SustainScrum-Plugin/src/` | Resolver: `invoke` handlers, Forge storage, Jira REST via `asUser()` and related APIs |
| `SustainScrum-Plugin/custom-ui/` | Custom UI source; after `npm run build`, the `build-*` folders referenced in `manifest.yml` |
| `SustainScrum-Plugin/manifest.yml` | Modules (admin page, project page, issue panel, global page, issue action) and OAuth scopes |

## Using it in Jira (outline)

1. Install the app or make it available in your site after deploy.
2. In the app **admin** area (or the global app page), define **SuMM** per project: dimensions, weights, questions.
3. On an **issue**, open the sustainability panel to create or view an assessment.
4. Open **Sustainability Dashboard** (where your instance exposes it—global or project tab), pick a project, and optionally a sprint and trends window.

Missing SuMM setup and other errors are surfaced in the UI.

## License / third parties

Package metadata and licenses are in each `package.json` where applicable. Atlassian Forge platform packages are subject to their respective terms.

---

*Developed in the context of a bachelor’s thesis; for academic citation or disclosure rules, follow your university’s requirements.*
