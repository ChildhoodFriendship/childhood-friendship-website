# Childhood Friendship — Documentation Schema

**Scope:** normative editorial rules for the project wiki at `doc/wiki/`. This root file governs the superproject overview and primary area/section pages; it is not a database schema or a legal/compliance assessment.

## Evidence and language

- Use Italian for prose and keep user-facing labels, API identifiers, route names and source paths exactly as implemented.
- This repository is a multi-package superproject. Document responsibilities at the workspace, web, API and shared-package levels without treating an app's behavior as a global monorepo guarantee.
- Distinguish confirmed user/product decisions, source implementation, historical checks, external provider state and proposals.
- Do not invent company data, tax claims, contacts, client-visible fields, provider configuration or deployment status. Do not place secrets or personal client data in the wiki.

## Authority and structure

- `AGENTS.md`: repository-wide operating instructions and superproject boundaries.
- `SCHEMA.md`: these documentation rules.
- `doc/wiki/index.md`: navigation to all published wiki and connected project documents.
- `doc/wiki/overview.md`: high-level description of the superproject.
- `doc/wiki/<area>/overview.md`: scope of one area; links all its sections.
- `doc/wiki/<area>/<section>.md`: detailed verified behavior or architecture for one topic.
- `doc/wiki/log.md`: append-only history.
- `doc/wiki/current-status.md`, `compliance.md`, runbooks, issue records and agent guidance are supporting documents with their own format.

Each area has exactly one `overview.md`; each section belongs to one area. The index links the root overview, all area overviews and sections, this root schema, and relevant connected documents. Internal links are relative and resolve to existing files. New Markdown filenames use lowercase letters, digits and hyphens.

## Frontmatter and common structure

Primary overview and section documents require YAML frontmatter:

```yaml
---
title: "Superproject architecture"
status: active
role: application
source:
  references:
    - part: configuration
      path: package.json
---
```

`title`, `status` and `role` are required. `status` is `active`, `draft`, `commercial` or `archived`. `role` is `application`, `functional_module`, `frontend`, `platform_service`, `config-data` or `status-data`. Optional `navigation` must describe actual UI structure. Optional `source.references` lists existing repository-relative paths with an applicable `part`, such as `component`, `view`, `template`, `stylesheet`, `routing`, `service`, `model`, `dto`, `api`, `endpoint`, `repository`, `persistence`, `configuration`, `test` or `other`.

Use applicable chapters in this order; `Description` is mandatory:

```markdown
## Short Description
## Description
## Functional Characteristics
## Interfaces And Protocols
## Dependencies And Relationships
## Procedures
## UI Fields
## Variables
```

`Description` first defines the subject, then explains its verified scope, purpose, use and limitations. Keep conceptual descriptions distinct from source inventories. `Functional Characteristics` describes observable capabilities, input/output, persistence, error behavior and human actions only when verified. Use precise verbs for confirmed capabilities: `Manages`, `Shows`, `Sends`, `Receives`, `Calculates`, `Exports`, `Stores`, `Notifies`, `Configures`, `Monitors`, `Validates`, `Transfers`, `Analyzes`, `Generates` and `Simulates`.

`Interfaces And Protocols` documents real UI, HTTP, storage and provider exchanges with direction, security and error behavior when known. If none is defined, write exactly `No external interface or protocol is defined.` `Dependencies And Relationships` lists verified domain relationships; if none, write `No dependencies.`

`Procedures` documents verified workflows with prerequisites and expected result when known. `UI Fields` is included for screens with identifiable inputs or displayed data and uses a `Field | Description` table; exclude buttons and internal properties. `Variables` is included for documented data structures and records exact names/types and verified constraints; unknown values are `Not verified`.

## Superproject-specific rules

- Keep source mapping and facts scoped to `apps/web`, `apps/api` or `packages/shared` when appropriate.
- Treat the code, migrations and current configuration as sources to inspect; a local build does not establish provider or production behavior.
- Keep privacy/security policies and fiscal/compliance guidance in `doc/wiki/compliance.md`; link it instead of duplicating it. Do not assert legal compliance based on repository documentation alone.
- Preserve historical verification dates in status/log pages. Do not present a dated snapshot as current live state.

Runbooks, status snapshots, logs, compliance guidance and templates may keep purpose-specific formats. After changing primary content, update the relevant area overview and index; after a material documentation change, append a concise dated log entry. Static checks do not prove runtime, browser behavior, provider settings or compliance.