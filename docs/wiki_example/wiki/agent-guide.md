---
title: Agents — Working guide
created: 2026-09-24
updated: 2026-10-01
type: guidance
tags: [guidance, workflow, documentation]
project: tmacs-webapp
status: active
confidence: high
sources: [SCHEMA.md, current-status.md, package.json, angular.json]
---

# Agents — Working guide

This is the operating agreement for coding agents working in `macs-webapp`. The goal is to make each task safe, small, verifiable, and easy for the next agent to resume.

## 1. Orient before acting

1. Read [[SCHEMA.md|SCHEMA]], [[index.md|index]], [[current-status.md|current status]], and the last 20-30 lines of [[log.md|log]].
2. Run `git status --short --branch` before changing anything.
3. Identify the exact source symbols and usages with targeted searches.
4. Read the relevant source, configuration, and existing tests before proposing a shape.
5. Treat the current working-tree diff as user-owned unless the user explicitly asks to change it.

## 1b. Execute requests by default

When the maintainer asks a question about this repository, treat it as an actionable coding request unless they explicitly say not to execute code and instead request brainstorming or discussion. Inspect the relevant source, apply the smallest useful change, and verify it with the appropriate command rather than returning only an explanation.

If the prompt does not contain enough runtime evidence to safely apply the final fix, add focused, uniquely tagged diagnostic logs at the relevant data-flow boundaries and run the available validation. Ask the maintainer to paste only those tagged logs so the next iteration can use concrete evidence without repeating broad investigation. Do not add speculative behavior changes merely to produce an apparent result; logging is the fallback when the required fact can only be observed in the maintainer's runtime.

## 1c. Prompt contract and scope

Interpret every task through four questions before editing:

1. **Outcome:** what visible behavior or artifact must exist when the task is complete?
2. **Scope:** which component, files, symbols, or user flow are involved?
3. **Constraints:** what must remain unchanged, especially API/DTO contracts, localization, realtime lifecycle, and pre-existing working-tree changes?
4. **Acceptance:** which exact checks or manual behaviors prove completion?

If the prompt leaves implementation details open but the outcome is clear, choose the smallest coherent implementation and record the assumption in the final report. Ask a question only when different interpretations would change the files or behavior being implemented. For UI work, distinguish explicitly between **visual-only**, **behavior-preserving**, and **behavior-changing** changes.

When a task is broad, create a short internal scope list before editing and keep unrelated cleanup out of the patch. When the maintainer explicitly authorizes a deeper refactor, still preserve one canonical implementation path and remove obsolete callers rather than layering compatibility paths indefinitely.

## 2. Source-of-truth order

Use this order when sources disagree:

1. Current source and configuration, verified by execution.
2. Build/lint output and runtime evidence.
3. Explicit project documentation and roadmap files.
4. Wiki statements marked with `confidence: medium` or `low`.
5. Agent inference — never present it as fact without labeling it.

The roadmap workbook is a planning input, not proof that a feature is complete. A component folder proves that code exists; it does not prove that live data, permissions, or every user flow works.

## 3. Change discipline

- Touch only files required by the task.
- Preserve existing Angular patterns, naming, localization, and component boundaries.
- Prefer the smallest targeted patch; avoid broad refactors during feature work.
- Never overwrite unrelated local changes, reset the branch, commit, push, or rewrite history unless asked.
- Before editing a dirty file, inspect its diff and treat all pre-existing hunks as maintainer-owned. Do not reformat, revert, or normalize those hunks unless the task explicitly includes them.
- Code produced by the agent must never create a commit or push to Git; leave source changes uncommitted unless the user explicitly requests otherwise.
- Never copy credentials, access tokens, passwords, or private endpoints into this wiki.
- For source changes, inspect the dependency manifest before adding an import or package.

## 4. Verification gates

Run the narrowest relevant checks first, then the project gates:

- `npm run lint` — Angular ESLint checks for `src/**/*.ts` and `src/**/*.html`.
- `npm run build` — production build; the `postbuild` script also creates locale archives under `dist/`.
- `npm run serve-it`, `npm run serve-en`, or `npm run serve-fi` — manual smoke test when UI behavior changes.

Report what actually ran and its result. If a check cannot run because live services or credentials are unavailable, record the blocker instead of claiming success.

For behavior changes, a passing build is necessary but not sufficient. Verify the narrowest available behavior at the changed boundary first, then run the project gates. If no automated test or live service is available, state exactly what remains manually unverified. Never infer runtime behavior from compilation alone.

The final report should contain only:

- **Changed:** files and behavior actually modified;
- **Verified:** commands and their real result;
- **Blocked/remaining:** known failures, warnings, or manual checks still needed.

Do not report generated archives, counts, or success claims unless the command output confirms them.

## 4a. Existing realtime and lifecycle logic

Before adding a realtime integration, search the target component for every existing mode, lifecycle, subscription, refresh flag, and handler call. Treat existing functions as part of the behavior contract until their callers and side effects have been traced.

- Build one lifecycle path instead of leaving the old and new realtime paths in parallel.
- When replacing a function, remove it only after adapting every caller and preserving its behavior at the new boundary.
- Before creating any function, search for an existing function that already performs the same operation. If one exists, choose exactly one path: **(a)** rewrite the existing function in a better form and keep its callers, or **(b)** remove the obsolete method, adapt every caller, and keep the new implementation. Never retain two functions that start, draw, refresh, or otherwise own the same behavior.
- For live components, verify the transitions `history -> live`, `live -> pause`, device change, and component destruction; subscription cleanup must be explicit in each relevant path.
- Prefer a short data-flow note before editing: `topic -> parser -> state/matrix -> renderer -> mode guard`.

This prevents an implementation from duplicating or accidentally bypassing an existing `start`, `refresh`, or mode-switch function. Relevant evidence includes `src/app/components/modules/timing-diagram/timing-diagram.component.ts` and `src/app/api/mqtt.service.ts`.

## 4b. Settings component naming and save flow

Keep settings components consistent by separating UI preparation from execution:

- `requestEdit()` opens the edit dialog and prepares its context.
- `requestAdd()` opens the add dialog and prepares its initial data.
- `submitSave(data)` receives a ready-to-send structure and performs the save operation.
- `requestDelete()` is used only when deletion requires preparation, confirmation, or validation.
- `submitDelete(data)` receives the prepared structure and performs the deletion.
- `refreshData()` or `loadData()` retrieves data from the backend.

Do not make `submitSave()` or `submitDelete()` rebuild forms, inspect dialog controls, or perform popup orchestration. Keep those responsibilities in the corresponding `request...()` method or dialog. When a component has only one save operation, prefer `save()`, `saveChanges()`, or `submitSave()` over repeating the component name in the method name. Use a more specific name only when the component has multiple operations of the same kind.

Use `camelCase` for frontend variables and methods. Preserve `snake_case` fields required by backend contracts in API payloads and responses; use an explicit mapping when frontend and backend models differ. For data-flow methods, prefer `loadData()`, `refreshData()`, `parseResponse()`, and `buildPayload()` over ambiguous names such as `processData()`.

Keep dialog results explicitly typed, keep API persistence in one canonical method, avoid mutating selected table rows through dialog editing, and use `private` for internal logic and `protected` for members used by templates when the framework permits it.

## 4c. Code organization and formatting

- Place every new child component in its own subdirectory under the parent component directory; do not place child-component files directly beside the parent component files.
- Format generated or modified code according to the repository's current Angular/TypeScript style. Keep imports, indentation, spacing, line breaks, and template formatting orderly rather than introducing one-off formatting. Always format `if` statements with braces and the body on its own indented lines, even for a single statement.
- Add JSDoc immediately above every new function when creating it. Use a meaningful description and include `@param` for each parameter and `@returns` when the function returns a value; do not omit documentation because the function name appears obvious.
- Name endpoint constants `ENDPOINT_<PURPOSE>` in uppercase, for example `ENDPOINT_MAP_PROPERTIES`; keep endpoint purpose explicit and separate from the HTTP method.
- Always declare an explicit access modifier on functions and methods: `private`, `protected`, or `public`. Apply the same discipline to members when the surrounding component style supports it.

## 4d. Domain artifacts and helper placement

For a new feature, classify every new interface, constant, and helper before creating a file. If the feature belongs to a domain already represented under `src/app/library`, place its artifacts in that domain rather than beside the component.

- Put domain interfaces in the existing `<domain>-types.ts` file. For a new subdomain, create a focused folder and a `<purpose>-types.ts` file.
- Put domain constants and mappings in `<purpose>-definitions.ts`; keep them out of components and helper implementations.
- Put reusable domain transformations, factories, and CRUD utilities in `<purpose>-helper.ts`.
- When a feature needs a dedicated subdomain, use a descriptive folder such as `src/app/library/device/formly/` and keep its related `*-definitions.ts`, `*-types.ts`, and `*-helper.ts` files together. Add `*-fallback.ts` only when fallback data is a real part of the feature contract.
- Keep component files focused on dependency wiring, view state, event orchestration, and calls to the domain helpers. Move reusable schema construction and table/model transformations out of the component.
- Format even short functions over multiple lines when they contain a return expression. Prefer direct conditional assignments such as `this.model.device_db = condition ? value : this.model.device_db` when they express the complete assignment without a separate mutation branch.

## 4e. Translation bundles and Finnish translation backlog

When adding a translation key to the `translations` object in `src/bundle/messages*.json`:

- Add the English text to `src/bundle/messages.json` and the Italian translation to `src/bundle/messages.it.json`.
- In `src/bundle/messages.fi.json`, use the **English text**, not an agent-generated Finnish translation. Finnish translations are handled separately by the maintainer.
- Add the exact new key to `docs/missing translations.txt` so it is tracked for Finnish translation. Avoid duplicate entries and keep related keys together.
- Keep keys grouped by component or namespace in every messages bundle. Insert a new key into its existing group; do not insert another component's keys in the middle of that group. For example, keep `manage-device.tabs.*` with `manage-device.*`, not between `table-popup.junction` and `table-popup.rsmp`.
- Keep groups and keys in alphabetical order, using the same case-sensitive key ordering across locales. Insert new keys in their sorted position without unrelated reformatting.
- Before finishing, verify that each new key exists in all three bundles, its Finnish-bundle value matches the English text, and its exact key is listed in `docs/missing translations.txt`.
- For consolidation, merge keys into `global.*` only when their meaning and exact translations agree in all three locales. Keep discordant translations separate, including differences in case, gender, or wording. Reuse an equivalent global key when available; do not overwrite a conflicting global translation.
- A pure key migration preserves the existing translations, including Finnish: it is not a new untranslated message. Update every source reference and migrate any existing backlog entry rather than replacing Finnish text with English.
- Remove unused keys only after checking all source files and Angular extraction (`npx ng extract-i18n --format=json`); the active build does not cover every product/component. Remove corresponding obsolete backlog entries. Do not infer usage from the active build alone.

## 5. Wiki maintenance

After a substantive change:

1. Update the relevant project, architecture, module, runbook, or status page.
2. Add or repair useful `[[wikilinks]]`.
3. Update `index.md` if pages were added, renamed, or archived.
4. Append one concise entry to `log.md` with files and verification evidence.
5. Lower confidence or add an open question when verification is incomplete.

Keep durable guidance in this page, project facts in the relevant wiki page, temporary task state in `current-status.md`, and history in `log.md`. Do not copy a full conversation or stale task snapshot into the wiki. Update `current-status.md` only when the active focus, known gap, verification baseline, or next action changes; append one concise `log.md` entry for substantive work rather than rewriting history.

## 5b. Working-tree handoff

Before finishing, run `git status --short --branch` and `git diff --check`. Report files changed by the agent separately from files that were already dirty when the task began. Leave all changes uncommitted unless explicitly asked. A handoff is complete only when the requested artifact exists, the acceptance checks have run, and remaining manual or environmental risks are named.

## 6. Task handoff format

A useful handoff contains:

- **Scope:** files and behavior touched.
- **Evidence:** commands, test names, or source paths.
- **Current state:** done, blocked, or partially verified.
- **Remaining risk:** live-data, permissions, browser, or backend dependencies.
- **Next action:** one concrete step, not a vague TODO.

Related pages: [[current-status.md|milestones and tasks]], [[projects/macs-webapp.md|project]], and [[modules/component-catalog.md|component catalog]].
