# AGENTS.md

## Scope

These instructions apply to files under `web/`.

## Product direction

This folder contains the static MVP for **Focus Reading Launcher**. It should feel like a quiet study ritual tool, not a generic todo list or productivity dashboard.

## Development rules

- Use plain HTML, CSS, and JavaScript unless the user explicitly asks for a framework.
- Keep the app deployable on GitHub Pages without a build step.
- Keep all user-visible copy in Chinese.
- Keep code identifiers, filenames, and directory names in English.
- Store MVP data in `localStorage` only.
- Do not add account login, backend services, payment flows, API keys, analytics, or remote data upload by default.
- Do not implement real web scraping or automatic PDF parsing unless explicitly requested.
- For PDF uploads, keep a clear placeholder or interface boundary until parsing is intentionally added.
- Preserve the core three-stage flow: entering ritual, focused reading, exiting ritual.
- Avoid noisy UI patterns. Prefer large buttons, calm colors, generous spacing, and minimal controls.
