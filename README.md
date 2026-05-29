# JI-RADAR: Sustainability Tool Support for Requirements Engineering

JI-RADAR is an Atlassian Jira Forge application designed to systematically capture, assess, and trace sustainability-related impacts directly within the agile Requirements Engineering (RE) process.

By integrating the Sustainability Management Model (SuMM) into standard Jira workflows, this tool bridges the gap between abstract regulatory reporting requirements and day-to-day software development, without forcing stakeholders to abandon established project management platforms.

## ✨ Key Features
- **SuMM Configuration:** Tailor sustainability dimensions (Environment, Social, Technical, Economic, Individual) and their weights on a per-project basis.
- **Contextual Issue Assessments:** Capture and evaluate sustainability impacts directly within the Jira issue view using an interactive assessment wizard.
- **Sustainability Dashboard:** Generate sprint-level and product-level KPI reports, visualize data through heatmaps and trend graphs, and export results for external auditing.


## 🛠 Prerequisites

### For Users
1. Open a browser
2. (Create Atlassian account)
3. Log in to the Atlassian account with administrator privileges to the Jira target instance.
4. Open the [install link](https://developer.atlassian.com/console/install/1263aaa7-d809-413b-80ed-9dd279c83ae0?signature=AYABeLant8xl980Xq%2B%2Fn3nAdt6cAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4IOp8r3eKNYw8z2v%2FEq3%2FfvrZguoGsXpNSaDveR%2FF%2Fo0B7KTLu77XBfpMMQJb0cLnIAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDDF0UIW1R7r38KufVAIBEIA7LyJjLntcfuEuAyfRDpsb3MgCzGuqmg9t3bqej20QGL6X0sS7qX4%2BKG6uiKb1Dv9k4mO89f2IOdgAVGwAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHijmwVTMt6Oj3F%2B0%2B0cVrojrS8yZ9ktpdfDxqPMSIkvHAGn6QGbD2eJ2v8p4Vk8Tev8AAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM2oTH3SlIHX5rE%2FsvAgEQgDvRHcagl7EflC51OqGkS9t5mjKlsieunsVULowTSdStjJuAMe1qHYEWa0vI60greJAyeBdgY5nPRxmWNgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeLKa7Dfn9BgbXaQmJGrkKztjV4vrreTkqr7wGwhqIYs5AZK2NjojnDOCSYsBtnDfVQAAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAwLQkXO%2FNrx%2FrjnH44CARCAO%2BYefzmz5FK6%2BQSSOT93KDWaETmiOSdTtXRTDwPrlipfSt1MGY7GU5bJff7NN1RJ%2FGVgLRhgEaxaRyP%2BAgAAAAAMAAAQAAAAAAAAAAAAAAAAAFJde%2FUu4i38LAYelM3nw9T%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLQS4jQiNbvou4CrqOb8WVLYe2RDrQUKbppbedZNrtcgMXDKdx%2B5WSLr0GXnP1cb6vQ7O%2FYfru%2FbTg%2FyMtGXMsBRvc%3D&product=jira) and click on "Get app".
5. Then follow the installation dialog until the app is installed.
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

## 📂 Repository layout

| Path | Description |
|------|------------|
| `SustainScrum-Plugin/src/` | Forge Resolver containing `invoke` handlers, Forge storage interactions, and Jira REST API integrations via `asUser()`. |
| `SustainScrum-Plugin/custom-ui/` | Source code for the Custom UI. Running `npm run build` generates the `build-*` directories referenced in the manifest. |
| `SustainScrum-Plugin/manifest.yml` | Defines Forge modules (admin page, project page, issue panel, global page, issue action) and OAuth scopes. |

## 📖 How to Use JI-RADAR
1. **Installation:** Deploy the app via Forge or install it via the provided distribution link to your Jira Cloud site.
2. **Setup the SuMM:** Navigate to the JI-RADAR Admin Area (or global app page) to configure the Sustainability Management Model for your project. Define the relevant dimensions, assign weights, and customize the assessment questions.
3. **Assess Artifacts:** Open any Jira issue (e.g., User Story, Task) and locate the Sustainability Assessment panel to execute the assessment wizard.
4. **Reporting & Insights:** Open the Sustainability Dashboard (available globally or as a project tab) to view aggregated metrics, filter by sprint, and export the generated KPI reports.

(Missing configurations or API errors will be surfaced dynamically within the UI.)

## 📝 License & Third-Party Software
Package metadata and licenses are located in the respective package.json files. Atlassian Forge platform packages and dependencies are subject to their respective Atlassian terms of service.
