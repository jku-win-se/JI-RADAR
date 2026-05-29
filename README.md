# JI-RADAR: Sustainability Tool Support for Requirements Engineering

JI-RADAR is an Atlassian Jira Forge application designed to systematically capture, assess, and trace sustainability-related impacts directly within the agile Requirements Engineering (RE) process.

By integrating the Sustainability Management Model (SuMM) into standard Jira workflows, this tool bridges the gap between abstract regulatory reporting requirements and day-to-day software development, without forcing stakeholders to abandon established project management platforms.

## ✨ Key Features
- SuMM Configuration: Tailor sustainability dimensions (Environment, Social, Technical, Economic, Individual) and their weights on a per-project basis.
- Contextual Issue Assessments: Capture and evaluate sustainability impacts directly within the Jira issue view using an interactive assessment wizard.
- Sustainability Dashboard: Generate sprint-level and product-level KPI reports, visualize data through heatmaps and trend graphs, and export results for external auditing.


## 🛠 Prerequisites

### For Users
1. Open a browser
2. (Create Atlassian account)
3. Log in to the Atlassian account with administrator privileges to the Jira target instance
4. Open the [install link](https://developer.atlassian.com/console/install/1263aaa7-d809-413b-80ed-9dd279c83ae0?signature=AYABeLant8xl980Xq%2B%2Fn3nAdt6cAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4IOp8r3eKNYw8z2v%2FEq3%2FfvrZguoGsXpNSaDveR%2FF%2Fo0B7KTLu77XBfpMMQJb0cLnIAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDDF0UIW1R7r38KufVAIBEIA7LyJjLntcfuEuAyfRDpsb3MgCzGuqmg9t3bqej20QGL6X0sS7qX4%2BKG6uiKb1Dv9k4mO89f2IOdgAVGwAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHijmwVTMt6Oj3F%2B0%2B0cVrojrS8yZ9ktpdfDxqPMSIkvHAGn6QGbD2eJ2v8p4Vk8Tev8AAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM2oTH3SlIHX5rE%2FsvAgEQgDvRHcagl7EflC51OqGkS9t5mjKlsieunsVULowTSdStjJuAMe1qHYEWa0vI60greJAyeBdgY5nPRxmWNgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeLKa7Dfn9BgbXaQmJGrkKztjV4vrreTkqr7wGwhqIYs5AZK2NjojnDOCSYsBtnDfVQAAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwLQkXO%2FNrx%2FrjnH44CARCAO%2BYefzmz5FK6%2BQSSOT93KDWaETmiOSdTtXRTDwPrlipfSt1MGY7GU5bJff7NN1RJ%2FGVgLRhgEaxaRyP%2BAgAAAAAMAAAQAAAAAAAAAAAAAAAAAFJde%2FUu4i38LAYelM3nw9T%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLQS4jQiNbvou4CrqOb8WVLYe2RDrQUKbppbedZNrtcgMXDKdx%2B5WSLr0GXnP1cb6vQ7O%2FYfru%2FbTg%2FyMtGXMsBRvc%3D&product=jira) and click on "Get app".
5. Then follow the installation dialog until app is installed.
6. Done!

### For Developers
_To build the app from source:_
- The [Forge CLI](https://developer.atlassian.com/platform/forge/cli-reference/) installed and an Atlassian account with permissions to deploy apps.
- **Node.js** (LTS version; ensure it matches the runtime specified in manifest.yml).

## 🚀 Build and Deploy
Most of the application code resides in the `SustainScrum-Plugin/` directory. 
To deploy the app to your Jira instance, run the following commands:

```bash
cd SustainScrum-Plugin

# Install backend dependencies
npm install

# Build the React Custom UI
cd custom-ui 
npm install 
npm run build 
cd ..

# Deploy to Atlassian Cloud
forge deploy
```

_Note: The `custom-ui` folder contains the React frontend (admin pages, issue panels, dashboards). The Forge resolver runs from `src/`. Check the nested README.md files in these directories for deeper technical details._

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
