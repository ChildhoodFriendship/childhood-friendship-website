---
title: TMACS Webapp project
created: 2026-09-24
updated: 2026-09-24
type: project
tags: [project, integration, deployment]
project: tmacs-webapp
status: active
confidence: high
sources: [package.json, angular.json, src/main.ts, src/app/app.routes.ts, src/environments/build-config.ts, src/environments/environment.ts, src/environments/environment.prod.ts]
---

# TMACS Webapp project

## Purpose

`macs-webapp` is an Angular browser client for the TMACS traffic-management platform. It provides authenticated access to operational, device, map, reporting, public-transport, and traffic-control modules through a configurable shell.

## Repository

- Repository root: `.`
- Current working branch at snapshot: `tmacs-web`
- Package version at snapshot: `2.0.1`
- Build: `npm run build`
- Lint: `npm run lint`
- Development run: `npm run serve-it`, `npm run serve-en`, or `npm run serve-fi`
- Automated test command: none declared in `package.json`

## System shape

- Browser entry point: `src/main.ts`
- Routes: `login` and `home`; unknown paths redirect to `login` (`src/app/app.routes.ts`).
- Application shell: top bar, environment-selected sidebar, layout selector, and dynamic component container.
- Transport: authenticated HTTP requests to the TMACS web-service API plus MQTT over secure WebSockets for live device updates.
- Locales: English, Italian, and Finnish bundles under `src/bundle/`.
- Configuration: build target and locale selection in `angular.json`; environment and product branding in `src/environments/` and `src/environments/build-config.ts`.

### Product variants

The active `src/environments/build-config.ts` selects the product's sidebar, first module, branding assets, map center, platform scopes, traffic models, and connection types. Product examples are kept in `docs/build-config-examples/`; environment examples are kept separately in `docs/environment-examples/`. Treat a build-config change as a scope change, not a cosmetic edit.

The compact architecture summary is kept in this page. See [[../modules/component-catalog.md|component catalog]] for the module inventory.

## Local development

1. Install the locked dependencies with `npm ci`.
2. Configure the selected environment without copying secrets into source control.
3. Start a locale-specific dev server.
4. Run lint and build before handing off a change.
5. Use a reachable TMACS environment for authenticated/live-data verification.

Before handing off a change, inspect the working tree, run the relevant locale smoke test when UI behavior changes, then run `npm run lint` and `npm run build`. Do not place credentials in environment files or documentation.

## Deployment and operations

- Production uses the `production` Angular configuration and file-replaces `environment.ts` with `environment.prod.ts`.
- Production localization builds `en`, `it`, and `fi`.
- The `postbuild` script packages the localized browser outputs into a dated archive under `dist/`.
- Deployment and rollback details are environment-specific and are not currently encoded in this repository.

## Known constraints

- The UI is coupled to TMACS authentication, HTTP endpoints, MQTT broker availability, permissions, and live device data.
- No automated test script or end-to-end test suite is declared.
- Some roadmap items are present as source components but still need live-data or feature-completeness validation.
- The working tree may contain user changes; inspect status before editing.

## Evidence

- `package.json`
- `angular.json`
- `src/main.ts`
- `src/app/app.routes.ts`
- `src/app/api/identity.service.ts`
- `src/app/api/requests.service.ts`
- `src/app/api/mqtt.service.ts`
- `docs/Components Roadmap.xlsx`

Related pages: [[../current-status.md|milestones and tasks]], [[../modules/component-catalog.md|component catalog]], and [[../agent-guide.md|agent guide]].
