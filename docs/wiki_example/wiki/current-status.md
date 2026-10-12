---
title: Milestones and tasks — TMACS Webapp
created: 2026-09-24
updated: 2026-09-24
type: status
tags: [status, milestone, project]
project: tmacs-webapp
status: active
confidence: medium
sources: [package.json, angular.json, docs/Components Roadmap.xlsx, docs/build-config-examples/tmacs-build.ts, src/environments/build-config.ts, src/app/app.routes.ts, src/app/components/home/home.component.ts, src/app/components/modules/synoptic/synoptic.component.ts, commit:e19073e]
---

# Milestones and tasks — TMACS Webapp

> Snapshot date: 2026-09-24. This page describes repository evidence, not a release certification.

## Repository snapshot

| Item | Observed value |
|---|---|
| Branch | `tmacs-web` |
| HEAD | `e19073e` (`sss`) |
| Remote relation | 1 commit ahead of `origin/tmacs-web` at snapshot time |
| Working tree | No tracked source diff at final verification; the new `docs/wiki/` tree is the only untracked change |
| Package version | `2.0.1` |
| Framework | Angular `^22.0.1`, Angular Material/CDK `^22.0.2` |
| Languages/locales | `en`, `it`, `fi`; production build localizes all three |
| Automated test script | None declared in `package.json` |

## Maintainer-reported runtime state

- The application currently works for its normal flows.
- Settings and the existing components are considered functional.
- The known synoptic defect concerns updating the synoptic properties of a device.
- Live behavior still needs deeper testing, especially for the synoptic component.
- Several components associated with the `tmacs-web` build still need live integration work and additional tests.

## Verification snapshot

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | **Pass** | Production bundles generated for `en`, `it`, and `fi`; `postbuild` created the dated archive under `dist/`. Angular emitted a non-blocking CommonJS warning for `file-saver`. |
| `npm run lint` | **Blocked** | The command stops with `No ESLint configuration found in .../src/app/api`; no lint result can be claimed until the repository configuration is corrected. |

## Milestone roadmap

Keep completed milestones in this table. They are historical evidence and prevent future agents from restarting finished work. The active work is identified explicitly in the **State** column and in [[current-status.md|current status]]'s current-focus facts.

| Milestone | State | Evidence / next gate |
|---|---|---|
| M0 — Application shell and product configuration | **Completed** | Standalone bootstrap, `login`/`home` routes, top bar, sidebar, layout selector, dynamic component container, and the active `src/environments/build-config.ts` product contract exist and are part of the working application. See [[projects/macs-webapp.md|project summary]]. |
| M1 — Authentication and transport | **Completed; live coverage can improve** | Login, authenticated HTTP, and MQTT browser transport work in the current application. Keep targeted live checks for reconnects, permissions, and payload variants. |
| M2 — Settings migration | **Completed; additional live/test coverage pending** | Settings are considered functional: devices, users, self, groups, areas, platform configuration/logs, map configuration, log category, and HALI/HSL priorities. |
| M3 — Operational modules | **Completed; additional live/test coverage pending** | Existing settings and operational components work. Components associated with the `tmacs-web` build still need more live integration checks and tests. |
| M4 — Synoptic/intersection drawing | **In progress — current defect** | The known issue is updating a device's synoptic properties. Live behavior also needs deeper testing, including persistence and MQTT update variants. Recent work covers signal-group/input/detector assets and multiple-junction status. |
| M5 — Hardening and release confidence | **Current follow-up** | Add focused tests, live smoke checks, and an acceptance checklist for the remaining `tmacs-web` live integrations. The repository still has no test script or end-to-end suite declared. |

## Explicit known gaps

- The synoptic issue to investigate is the update of a device's synoptic properties; the working application should be reproduced against the relevant live data before changing the contract.
- Static TODO/placeholder paths may still exist in the synoptic source and must be reconciled with the current runtime behavior rather than assumed to be broken.
- The runtime depends on TMACS HTTP and MQTT services, identity-provider configuration, permissions, and live device data; a successful local build cannot validate those paths.
- `docs/Components Roadmap.xlsx` is a visual planning board. Its status colors require human interpretation; this page records only statuses that are supported by source inspection or explicit notes.

## Open tasks

1. Reproduce and isolate the synoptic-property update defect with the exact device payload and live flow.
2. Test synoptic live updates, persistence, multiple junctions, and MQTT payload variants.
3. Complete live integration checks for the remaining components associated with the `tmacs-web` build.
4. Add automated tests for identity parsing, request error handling, MQTT topic matching, and synoptic payload parsing.
5. Re-run `npm run lint` and `npm run build` after every behavior change; update this page when milestone evidence changes.

Related pages: [[projects/macs-webapp.md|TMACS Webapp]], [[modules/component-catalog.md|component catalog]], and [[agent-guide.md|agent guide]].
