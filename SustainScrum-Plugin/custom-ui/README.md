# Custom UI (React frontend)

Jira **Custom UI** bundles that run in the browser (iframe). Built with Create React App; each Forge module (admin, issue panel, dashboard, …) has its own entry file `src/index-<entry>.js`.

- **Source:** `src/` (components, services)
- **Build outputs:** `build-admin`, `build-issue`, `build-dashboard`, `build-action`, `build-project` — paths are wired in `../manifest.yml`
- **Build:** from this directory, run `npm run build`

Backend logic invoked via `invoke('…')` is implemented in **`../src/index.js`**.
