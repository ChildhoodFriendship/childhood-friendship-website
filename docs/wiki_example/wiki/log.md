# Coding Project Wiki Log

> Append-only. Format: `## [YYYY-MM-DD] action | subject`
> Actions: create, update, verify, archive, lint, query.

## [2026-09-24] create | Wiki initialized
- Domain: `macs-webapp` software architecture, engineering workflow, and milestone knowledge.
- Structure created from the coding-project template under `docs/wiki/`.

## [2026-09-24] create | Initial project knowledge pages
- Created `agent-guide.md`, `current-status.md`, and `token-usage.md`.
- Created `projects/tmacs-webapp.md`, `architecture/system-architecture.md`, `modules/application-modules.md`, and `runbooks/local-development.md`.
- Added all pages to `index.md` with repository-relative evidence references.

## [2026-09-24] update | Confidence and product build configuration
- Defined `confidence` as evidence quality, not agent certainty, in `SCHEMA.md`.
- Documented the compile-time product-scope contract in `src/environments/build-config.ts` and its product examples.
- Recorded build/lint verification in `current-status.md`.

## [2026-09-24] verify | Wiki and project gates
- `npm run build`: passed; localized bundles and the postbuild archive were generated.
- `npm run lint`: blocked by missing ESLint configuration under `src/app/api`.
- Wiki content pages have frontmatter confidence values and the index reports 7 pages.

## [2026-09-24] update | Milestone state corrected from maintainer feedback
- M0-M3 are recorded as completed functional milestones.
- M4 is the active synoptic-property update defect and live-validation area.
- M5 tracks remaining live integration coverage and additional tests, especially for `tmacs-web` components.

## [2026-09-24] update | Internal wiki links
- Changed internal wikilinks to include explicit repository-relative `.md` paths and display labels.
- Verified that all non-template internal links resolve to existing wiki files.

## [2026-09-25] update | Realtime lifecycle guidance
- Added an agent workflow for tracing existing realtime/mode/lifecycle functions before replacing them.
- Documented the timing diagram live data flow and subscription cleanup boundary in `modules/application-modules.md`.

## [2026-09-25] update | Timing diagram initial render and frame
- Initialized the timing diagram SVG when the page finishes loading.
- Constrained the diagram to its flex/grid column and added an adjustable frame via `.diagram` margin and border.

## [2026-09-25] update | Timing diagram mode controls
- Replaced the mode-dependent dual-button handlers with four named actions.
- The template now renders only the two controls relevant to the selected Live or History mode.

## [2026-09-25] update | Greenwave MQTT live and render frame
- Added signal-group MQTT subscriptions for every device used by the active greenwave preset, with lifecycle cleanup on history mode and destroy.
- Added the bordered render-area frame pattern used by the timing diagram.
- Verified with `npm run build`; `npm run lint` remains subject to the repository's existing ESLint configuration blocker.

## [2026-09-25] update | No duplicate lifecycle methods
- Added a mandatory existing-symbol check before introducing functions that start, draw, refresh, or own realtime behavior.
- Defined the required choice between rewriting the existing method or deleting it and adapting all callers.
- Removed the obsolete `startRealTimeDiagram` method and kept the existing live-button path as the single live-start owner.

## [2026-09-25] update | Synoptic refresh path
- Replaced the obsolete `getSynoptic` caller path with `refreshData(selectedDevice?)`.
- The template invokes the refresh without a parameter; the method resolves the current selected device and reloads its canonical synoptic.
- Verified with `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-25] update | Synoptic save path
- Removed the unused websocket payload construction from `save()`.
- Routed save through the synoptic PUT endpoint and refreshed from the canonical GET response only after a successful PUT.
- Verified with `npm run build` and `git diff --check`.

## [2026-09-25] update | Git side-effect prohibition
- Added the rule that agent-produced code must not create commits or push to Git; source changes remain uncommitted unless the user explicitly requests otherwise.

## [2026-09-25] update | Settings component naming and save flow
- Documented the `request...`/`submit...` separation for add, edit, save, and delete operations.
- Documented concise method naming when the component context already identifies the data being saved.
- Documented frontend `camelCase`, API-contract `snake_case`, typed dialog results, and canonical persistence paths.

## [2026-09-25] update | Component organization and code style
- Documented dedicated subdirectories for child components.
- Documented formatting, explanatory comments for non-obvious names, `ENDPOINT_<PURPOSE>` constants, and explicit access modifiers.

## [2026-09-28] update | Core and common component refactor
- Refined naming, access modifiers, endpoint constant naming, and child-component handling across login, layout selector, home, ANAS, and common components.
- Updated Angular template references for renamed public/protected methods.
- Verified with `npm run build` and `git diff --check`; the build retained the existing non-blocking `file-saver` CommonJS warning.

## [2026-09-28] create | Component catalog
- Added `modules/component-catalog.md` with evidence-backed descriptions of settings, shell, operational, transport, and integration components.
- Recorded access scope, product usage, source paths, and explicit live-verification gaps for components whose backend flow is incomplete or not verifiable from source alone.
- Added the page to `index.md`; no application source files were modified.

## [2026-09-28] update | Component catalog language
- Rewrote `modules/component-catalog.md` in English while preserving the source-backed descriptions, product scope, and verification caveats.

## [2026-09-28] update | Execute coding requests by default
- Documented that repository questions are actionable requests unless the maintainer explicitly asks for brainstorming without execution.
- Documented focused tagged logging as the fallback when runtime evidence is missing for a safe final fix.

## [2026-09-28] fix | Greenwave history state rendering
- Confirmed the blackbox payload matched all nine selected signal groups: 261 records matched, with 126 in the visible range.
- Prevented `DiagramDrawer.SVGUpdate` from returning early when the timing-style SVG has no optional `tgd-groups` label layer.
- Verified with `git diff --check` and `npm run build`; the existing `file-saver` CommonJS warning remains non-blocking.

## [2026-09-28] fix | Greenwave history time selection
- Used the selected history hour and minute when building blackbox request and render timestamps.
- Added request-version guarding so a late response from an older history request cannot replace a newer interval.

## [2026-09-28] fix | Greenwave render height
- Constrained the greenwave host and root container to the parent layout height instead of `100vh`.
- Verified with `git diff --check` and `npm run build`; the existing `file-saver` CommonJS warning remains non-blocking.

## [2026-09-28] improve | Greenwave history time controls
- Bound the hour and minute selects to the component state and rendered both values as two digits.
- Added a compact `HH:MM` layout with consistent field widths and spacing.
- Verified with `git diff --check` and `npm run build`; the existing `file-saver` CommonJS warning remains non-blocking.

## [2026-09-29] fix | Restore MQTT WebSocket port in debug sessions
- Persisted `mqttPort` with the other debug login values and restored it in `HomeComponent` before MQTT service construction.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] refactor | Synoptic UI state signals
- Replaced template-facing editor/render flags with signals and updated Angular bindings to read them explicitly.
- Replaced `close_save` with the domain-oriented `hasUnsavedChanges` signal and replaced the two-way `internal_state` binding with explicit signal input/output binding.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] refactor | Synoptic frontend naming cleanup
- Renamed frontend-only synoptic state to `camelCase` across TypeScript and the template while preserving snake_case DTO and synoptic-model fields.
- Removed the unused drag-coordinate fields and legacy editor fields that had no read path.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] improve | Synoptic component state decluttering
- Removed unused identity, legacy editor, timer, device-index, and filtered-device fields from `synoptic.component.ts`.
- Preserved the active drag coordinates, editor state, MQTT state, and template bindings.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] fix | Synoptic editor selection and deletion
- Made the editor selection row compact and passed the selected object from each `mat-select` into the same selection path used by mouse interaction.
- Corrected SVG selection identifiers for inputs and detectors, made selection cleanup tolerate missing nodes, and prevented deletion from splicing the last item when no match exists.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] improve | Synoptic unified element selector
- Replaced the four editor element selectors with one `mat-select` grouped by `mat-label` and dividers, preserving the signal-based editor state and selection behavior.
- Removed the now-unused per-element form controls and reset the unified selection when the editor selection is cleared.
- Verified with `git diff --check` and `npm run build`; the existing `file-saver` CommonJS warning remains non-blocking.

## [2026-09-29] improve | Synoptic background file control
- Replaced the native file input display with a styled Material button label and kept the actual input visually hidden.
- Removed the browser-specific `Browse` and `No file selected` text from the editor toolbar.

## [2026-09-29] fix | Synoptic editor tooltip
- Added `MatTooltipModule` to the standalone component imports so the editor help tooltip is instantiated correctly.
- Verified with `git diff --check` and `npm run build`; the existing `file-saver` CommonJS warning remains non-blocking.

## [2026-09-29] improve | Agent workflow guide
- Added a prompt contract covering outcome, scope, constraints, and acceptance criteria, with explicit guidance for visual-only versus behavior-changing UI tasks.
- Added dirty-tree ownership rules, behavior-verification requirements, concise final-report structure, and clearer separation between durable guidance, current status, and historical log entries.

## [2026-09-29] improve | Timing diagram row labels
- Added explicit `SG`, `DET`, and `IN` prefixes to timing diagram row labels so each plotted row identifies its element type and ID.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] fix | Timing diagram drawing boundary
- Kept timing state rectangles and cycle-time markers inside the diagram's right drawing boundary instead of allowing them to overlap the right-side legend.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-09-29] improve | Timing diagram legend spacing
- Increased the horizontal inset of the timing diagram drawing area from 3% to 12% on both sides, leaving clearer space for the `SG`, `DET`, and `IN` row legends.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] improve | Manage device form tabs
- Replaced the manage-device popup accordion sections with Material tabs and added nested tabs for every field-configuration collection.
- Extended field-configuration row handling and table columns to support outputs, probes, barriers, pumps, tubs, areas, bollards, buttons, pressure switches, boards, and sensors.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] fix | Manage device connection tab
- Preserved inactive Material tab content so the multiple Formly instances sharing the popup form do not destroy and recreate connection controls when switching tabs.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] improve | Manage device connection password fields
- Removed the separate show/hide buttons and rendered both RSMP security fields directly inside the connection tab as permanently masked password inputs.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] improve | Device Formly artifact organization
- Documented the convention for placing device interfaces, definitions, and reusable helpers under a domain-specific library folder.
- Moved the manage-device Formly schema, field-configuration helpers, and related dialog interfaces into `src/app/library/device/formly/`.

## [2026-10-01] fix | Manage device Formly connection paths
- Flattened the connection child fields into the tab using full `connection.*` keys instead of rendering the JSON-schema object wrapper as a standalone Formly field.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] refactor | Wiki decluttering
- Kept the schema, index, agent guide, project page, component catalog, milestones/tasks, log, and durable bug area as the compact wiki core.
- Retained `current-status.md` as the compact milestones/tasks page and removed redundant architecture, application-module, runbook, token-usage, README, and template pages.
- Reordered `agent-guide.md` so section `4a` precedes `4b`, `4c`, and `4d`.

## [2026-10-01] fix | Manage device popup save and toolbar alignment
- Positioned Save at the left of the popup toolbar, kept the device identifier centered, and positioned close at the right.
- Limited save validation to the `device_id` control; other device fields may remain empty.
- Verified with `git diff --check` and `npm run build`; `npm run lint` remains blocked by the existing missing ESLint configuration under `src/app/api`.

## [2026-10-01] fix | Manage device popup ID validation and Save color
- Enforced `device_id >= 1` before enabling Save, including the initial zero-value add model.
- Applied `save-button` only while Save is enabled so disabled text keeps the default black color.

## [2026-10-01] improve | Manage device signal-group movement list
- Added the optional `movement_list` property to signal-group field-configuration rows and placed it immediately after `junction` in the table and edit popup.
- Represented it as a `string[]`; the edit popup accepts comma-separated movements and converts them to an array before saving.

## [2026-10-01] update | TypeScript conditional formatting rule
- Made the brace-based `if` formatting convention explicit in `docs/wiki/agent-guide.md`: every conditional keeps its body on indented lines, including single-statement branches.

## [2026-10-01] update | New-function JSDoc rule
- Added the repository rule requiring JSDoc for every new function, including `@param` entries and `@returns` when applicable.
- Documented the newly created manage-device Formly and popup functions accordingly.

## [2026-10-01] refactor | Manage-device Formly field factories
- Moved the reusable numeric and text Formly field factories from `table-popup.component.ts` into `formly-helper.ts`.
- Verified with `npm run build` and `git diff --check`.

## [2026-10-01] improve | Field-configuration column translations
- Replaced raw table column headers with the localized `FormlyDefinitions.PROPERTY_LABELS` mapping, preserving row keys and API data.
- Added Movement List translations to the English, Italian, and Finnish bundles; checked translation coverage for every configured column.
- `npm run build` passed; `npm run lint` reported 143 existing errors outside the changed files. Browser visual verification remains pending.

## [2026-10-01] improve | Manage-device tab translations
- Localized all popup tab labels and field-configuration section headings using `FormlyDefinitions.TABLE_LABELS` and existing Angular i18n markers; kept `PropertyType` identifiers unchanged.
- Added missing labels to the English, Italian, and Finnish bundles; verified coverage of all 16 field-configuration types and the static tabs.
- Production build and targeted ESLint passed; full lint still reports 143 unrelated errors. Browser visual verification remains pending.

## [2026-10-01] update | Translation maintenance rules
- Added the rule to use English text for new Finnish-bundle entries and record each exact key in `docs/missing translations.txt` without duplicates.
- Required component/namespace grouping and consistent ordering across messages bundles; unrelated component keys must not split an existing group.
- Updated the agent-guide index entry. Documentation-only change; translation bundles and backlog contents were not modified.

## [2026-10-01] refactor | Translation bundle consolidation
- Sorted all three translation bundles alphabetically; consolidated 21 equivalent groups under global IDs and migrated 36 old IDs across 19 TypeScript/template files, preserving every referenced translation exactly.
- Removed 225 unused entries per locale after checking all source files and Angular extraction; reused the previously unused `global.year` and `global.fine` keys. Bundles now contain 829 English/Italian entries and 828 Finnish entries.
- Removed obsolete Finnish-backlog entries and documented alphabetical ordering, conservative consolidation, and translation-preserving key migration in the agent guide.
- Verified JSON uniqueness/order, translation preservation, obsolete-reference removal, production build, and `git diff HEAD --check`. Full lint reports 143 existing errors; differential ESLint on the 19 changed source files confirms identical diagnostics before and after (11 errors).
- Preserved the pre-existing missing Finnish ID `bike-sharing.free-mircromobility-status`; it is referenced by `GbfsConstants.ts` outside the current extracted build. No translation was invented or silently copied from the differently spelled unused key.

## [2026-10-01] refactor | Manage-self Formly profile
- Replaced manually constructed password, email, phone, and category controls with JSON-schema-generated Formly fields, following the manage-device popup pattern; retained the existing Material timetable controls and API confirmation flow.
- Added schema/model artifacts under `src/app/library/user/formly/`; reused the password update validator with named controls while preserving numeric-key compatibility for manage-users.
- Verified production build, targeted ESLint, password validation for both control shapes, JSON-schema/category mapping, and `git diff HEAD --check`. Full lint still reports 143 unrelated errors; browser and live-backend checks remain pending.

## [2026-10-02] fix | Manage-self tabs and profile fields
- Restored explicit Material form controls so the password and T-Alert fields render reliably.
- Kept exactly two tabs: Personal Data for new-password fields, and T-Alert for email, phone number, categories, and timetable.
- Verified with `npm run build` and `git diff --check`; browser verification remains pending.