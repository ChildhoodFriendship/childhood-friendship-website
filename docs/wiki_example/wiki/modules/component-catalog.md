---
title: Component catalog
created: 2026-09-28
updated: 2026-10-01
type: module
tags: [module, architecture, integration, documentation]
project: tmacs-webapp
status: active
confidence: medium
sources: [src/app/components/settings, src/app/components/map/map.component.ts, src/app/components/modules, src/app/components/login/login.component.ts, src/app/components/home/home.component.ts, src/app/components/layout-selector/layout.component.ts, src/app/library/Translations.ts, src/app/components/modules/comp-container/comp-container.component.ts, src/environments/build-config.ts]
---

# Component catalog

Operational catalog of the webapp's main components. The descriptions are derived from the current source code; source presence does not equal live validation of backend services, permissions, or MQTT flows. **Tmacs**, **Smacs**, **Predict**, and **HALI-HSL-RSMP-Proxy** identify the product where a component is expected according to the build/sidebar configuration or the supplied documentation.

## Settings and administration

### Manage devices
- **Access:** administrators; used in all four products.
- **Responsibility:** loads areas and devices filtered by `device_type`, normalizes them for the Material table, and supports adding, editing, and deleting devices through popups and administrative APIs. Provides search, sorting, pagination, and model/traffic-model handling.
- **Sources:** `src/app/components/settings/manage-devices/manage-devices.component.ts`, `src/app/library/device/formly/`.

### Manage users
- **Access:** administrators; used in all four products.
- **Responsibility:** loads users and groups, builds a table with status, group, and last authentication data, and supports adding, editing, and deleting users. Operations are handled through the popup and `/admin/macsuser(s)` endpoints.
- **Source:** `src/app/components/settings/manage-users/manage-users.component.ts`.

### Manage self
- **Access:** any authenticated user; used in all four products.
- **Responsibility:** reads and updates the current user's profile through `/user/self`. Handles email, phone number, log categories, availability intervals, and, for the legacy SFA provider, password changes with confirmation and validation.
- **Form:** profile fields use the same JSON-schema/Formly adapter pattern as the device popup, with schema and model artifacts in `src/app/library/user/formly/`. Password fields remain masked; the shared update validator supports both named Formly controls and existing numeric user-popup controls. The timetable retains its Material day selector, timepickers, and table, editing the local model until confirmation.
- **Sources:** `src/app/components/settings/manage-self/manage-self.component.ts`, `src/app/library/user/formly/`, `src/app/library/form-validator.ts`. Browser/backend acceptance remains unverified.

### Manage areas
- **Access:** administrators; used in Tmacs and Smacs.
- **Responsibility:** displays areas with id, name, description, and coordinates; supports adding, editing, and confirmed deletion. Changes are persisted through `/areas/areas`.
- **Source:** `src/app/components/settings/manage-areas/manage-areas.component.ts`.

### Manage groups
- **Access:** administrators; used in all four products.
- **Responsibility:** displays groups and converts backend scopes into `admin`, `user`, and `viewer` flags; supports editing the device tree and scopes, adding groups, and confirmed deletion. The system groups `Admin`, `User`, and `Viewer` should not be considered deletable without checking the popup and backend behavior.
- **Source:** `src/app/components/settings/manage-group/manage-group.component.ts`, `src/app/components/settings/manage-group/manage-group-popup/manage-group-popup.component.ts`.

### Platform configuration
- **Access:** administrators; used in HALI-HSL-RSMP-Proxy, Tmacs, and Smacs.
- **Responsibility:** reads and updates organization properties for hostname, last-login timeout, maximum login attempts, and Graylog destination. Converts the timeout between days displayed in the UI and seconds expected by the backend and applies the Graylog port default `12201`.
- **Source:** `src/app/components/settings/platform-configuration/platform-configuration.component.ts`.

### Log category
- **Access:** administrators; used in HALI-HSL-RSMP-Proxy, Tmacs, and Smacs.
- **Responsibility:** loads log categories, translates their display message, and supports editing and deletion, but does not contain a creation flow. Persistence uses `/logs/logcategory`.
- **Source:** `src/app/components/settings/log-category/log-category.component.ts`.

### Platform logs
- **Access:** administrators; used in Tmacs, Smacs, and Predict.
- **Responsibility:** displays platform logs filtered by time range and diagnostic level. The view is composed of a top bar and table and uses `/admin/identitieslogs`; the initial load covers the current day.
- **Source:** `src/app/components/settings/platform-log/platform-log.component.ts`.

### Map config
- **Access:** administrators; used in Tmacs, Smacs, and Predict.
- **Responsibility:** configures the tile provider (`OpenStreetMap`, `custom`, or `none`). For a custom provider it validates a URL containing `{z}`, `{x}`, and `{y}` placeholders and supports up to two backup URLs; it saves the organization property `MAP_PROPERTIES`.
- **Source:** `src/app/components/settings/map-config/map-config.component.ts`.

### HALI listener, HALI PT priorities, and HSL PT priorities
- **Access:** administrators; primarily used in Tmacs and HALI-HSL-RSMP-Proxy.
- **HALI Listener:** manages TMACS listeners and HALI feedback host/port values, with add, edit, and delete operations persisted in `HALI_LISTENERS`.
- **HALI PT priorities:** manages HALI-to-PT rules, links each rule to a device, and displays command, input/detector, emergency-route, and clear values; saves `HALI_PT_PRIORITIES`.
- **HSL PT priorities:** manages HSL PT rules with field validation, associated device, command, priority level, repeated-request filtering, and persistence through `HSL_PT_PRIORITIES`.
- **Sources:** `src/app/components/settings/hali-listener/hali-listener.component.ts`, `src/app/components/settings/hali-pt-priorities/hali-pt-priorities.component.ts`, `src/app/components/settings/hsl-pt-priorities/hsl-pt-priorities.component.ts`.

## Shell, navigation, and UI infrastructure

### Login
- **Used in all four products.** Handles the legacy SFA login and OAuth/MFA through the identity provider. After authentication it initializes identity, token, scopes, and MQTT credentials before navigating to home.
- **Source:** `src/app/components/login/login.component.ts`, `src/app/api/identity.service.ts`.

### Component container
- **Used in all four products.** Acts as the dynamic container: receives the component requested by the sidebar/build configuration, clears the previous `ViewContainerRef`, and creates the selected component. It is the common rendering point for application modules.
- **Source:** `src/app/components/modules/comp-container/comp-container.component.ts`.

### Sidebar and layout selector
- The **sidebar** varies according to the product selected in `src/environments/build-config.ts`; the HALI-HSL-RSMP-Proxy variant has custom navigation, while Tmacs and Smacs use their respective sidebars. When enabled by the build configuration, the **layout selector** allows one to four components to be displayed in a grid.
- **Sources:** `src/app/components/modules/sidebar`, `src/app/components/layout-selector/layout.component.ts`, `src/environments/build-config.ts`.

### Translations
- **Used in all four products.** `Translations` centralizes maps and translation functions for diagnostic messages and logs; UI translations are completed by `$localize` markers and the `en`, `it`, and `fi` bundles.
- **Sources:** `src/app/library/Translations.ts`, `src/bundle/messages*.json`.

## Operational modules

### Map
- **Access:** all users; used in Tmacs, Smacs, and Predict.
- Creates an OpenLayers map centered on the build-config coordinates, loads configured tiles, updates GeoJSON layers and overlays, and connects live state through MQTT. Includes a layer drawer, center control, and explicit cleanup of subscriptions, interactions, and handlers.
- **Source:** `src/app/components/map/map.component.ts` and the services/helpers in the same directory.

### Device status
- **Access:** all users; present in Smacs.
- Loads available areas and devices, selects the first enabled device type, and forwards data from the relevant service to the content view. When the device type changes it releases the previous subscription and can display TLC, VMS, MOSYS, weather, and TMS data through sidebar, tables/charts, and details.
- **Sources:** `src/app/components/modules/devices/smacs/devices-status.component.ts`, `src/app/components/modules/devices/smacs/devices-status.service.ts`.

### TLC status
- **Access:** all users; used in HALI-HSL-RSMP-Proxy, Tmacs, Smacs, and Predict.
- Displays traffic-controller status in a table, including connectivity, diagnostics, uptime, and installation information. Receives data from the TLC service and supports filtering, sorting, a diagnostic popup, and XLSX export.
- **Source:** `src/app/components/modules/devices/hali-hsl-rsmp-proxy/tlc-status.component.ts`.

### Logs
- **Access:** all users; used in Tmacs, Smacs, and Predict.
- Loads device logs with filters for time range, area, device, and severity; converts the response into localized rows and warns when there is no data or the maximum record limit is reached. The component is composed of a sidebar and table.
- **Source:** `src/app/components/modules/log/device-logs.component.ts`.

### Traffic analysis
- **Access:** all users; used in Tmacs and Smacs.
- Requests vehicle data for a device, time range, aggregation, scheme, and selected detectors. Presents the same result in a table and chart and allows switching between the two views.
- **Source:** `src/app/components/modules/traffic-analysis/traffic-analysis.component.ts`.

### Change device field configuration
- **Access:** all users; used in Tmacs and Smacs.
- Displays field-configuration change requests with state, priority, users, device, and history; opens detail/edit and log dialogs. In the current source the main list is populated from `TEMP_DATA` and updates are applied locally, so the backend and complete workflow still require verification.
- **Source:** `src/app/components/modules/change-devices-field-configuration/change-devices-field-configuration.component.ts`.

### TLC control panel
- **Access:** all users; used in Tmacs.
- Contains two tabs: **Scheduler**, for creating, editing, validating, enabling/disabling, and deleting scheduled operations on one or more devices; and **Traffic flow**, for managing plans/selections tied to sets of rules, time windows, days, detector thresholds, and traffic plans. The parent coordinates loading, saving, and refresh operations.
- **Sources:** `src/app/components/modules/tlc-control-commands/tlc-control-panel.component.ts`, `scheduler/scheduler.component.ts`, `traffic-flow/traffic-flow.component.ts`.

### Functional analysis
- **Access:** all users; used in Tmacs.
- Allows selecting a device, time range, signal group, and detectors, then requests four analyses: cycle time, green time, lane throughput, and vehicles through red. It also calculates derived vehicles/hour, capacity, and saturation-index values and supports XLSX export.
- **Source:** `src/app/components/modules/functional-analysis/functional-analysis.component.ts`.

### Issues report
- **Access:** all users; used in Tmacs.
- Lists reports/issues with state, priority, dates, code, log, maintainer, and note; also loads devices and areas for add/edit popups, supports confirmed deletion, and persists changes through the report endpoint.
- **Source:** `src/app/components/modules/report/report.component.ts`.

### VMS control panel
- **Access:** all users; used in Tmacs.
- Selects a VMS and displays its image/full message plus a table containing message ID, control mode, firmware, connectivity, last update, and diagnostics. Sends operating-mode actions to the device. In the current source, some diagnostic/message/action endpoints are empty strings, so the live flow is not verified.
- **Source:** `src/app/components/modules/vms-control-panel/vms-control-panel.component.ts`.

### Timing diagram
- **Access:** all users; used in Tmacs.
- Draws the time progression of an installation's signal groups, with MQTT live mode and history mode. The SVG/diagram rendering is updated from `signal_groups` payloads; switching modes must keep subscriptions and refresh state consistent.
- **Source:** `src/app/components/modules/timing-diagram/timing-diagram.component.ts`.

### Synoptic
- **Access:** all users; used in Tmacs.
- Displays and edits an intersection synoptic: renders SVG/PNG assets, shows signal groups, inputs, and detectors, and updates status/diagnostics through MQTT. Saving uses the synoptic PUT endpoint and then reloads the canonical response; updating device synoptic properties and handling multiple live payloads remain high-risk areas.
- **Sources:** `src/app/components/modules/synoptic/synoptic.component.ts`, `docs/wiki/current-status.md`.

### Greenwave diagram
- **Access:** all users; used in Tmacs.
- Displays green progression for a group/preset of traffic lights by subscribing to the signal groups of selected devices and redrawing the SVG matrix for the simulated vehicle path.
- **Source:** `src/app/components/modules/greenwave-diagram/greenwave-diagram.component.ts`.

## Transport and external-data integrations

### Bike sharing
- **Access:** all users; used in Smacs.
- Reads available GBFS providers and presents overview/details with charts and tables for free bikes/scooters, vehicle availability, and average battery percentages. Uses separate observers for table and chart data and unsubscribes them on destruction.
- **Source:** `src/app/components/modules/bike-sharing/bike-sharing.component.ts`.

### TPL
- **Access:** all users; used in Smacs.
- Aggregates local public-transport views through bus/GTFS, rail, and port subcomponents; the page coordinates the sidebar, providers, and timetable/route-time tables.
- **Sources:** `src/app/components/modules/tpl/tpl.component.ts`, `src/app/components/modules/tpl/bus-component/bus.component.ts`, `train-component/train.component.ts`, `porto-component/porto.component.ts`.

### ANAS
- **Access:** all users; used in Smacs.
- Presents ANAS integration data in a table and chart through a main component and dedicated chart component.
- **Sources:** `src/app/components/extra/anas/anas.component.ts`, `src/app/components/extra/anas/chart/chart.component.ts`.

Related pages:

- [[../projects/macs-webapp.md|TMACS Webapp]] — project boundary, commands, and constraints.
- [[../current-status.md|Milestones and tasks]] — milestone state, known defects, and verification debt.
- [[../agent-guide.md|Agent guide]] — change and verification workflow.
