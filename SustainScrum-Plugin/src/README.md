# Forge backend (resolver)

This folder is the **server-side** part of the Forge app. Atlassian requires it to be named `src/` at the app root.

- **Entry:** `index.js` — exports `handler` for the resolver referenced in `manifest.yml` (`handler: index.handler`).
- **Role:** `resolver.define('…')` handlers, `invoke` targets, `storage`, and `asUser().requestJira(…)` calls to the Jira REST API.

The browser UI lives in **`../custom-ui/`** (React Custom UI builds), not here.
