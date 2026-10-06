# Coding Project Wiki Schema

## Purpose

A durable, searchable knowledge base for this software project. Keep facts, decisions, architecture, workflows, milestone status, and debugging knowledge here so future contributors and coding agents can work without rediscovering context.

## Conventions

- File names: lowercase, hyphens, no spaces.
- Every wiki page starts with YAML frontmatter.
- Use `[[wikilinks]]`; every page should have at least two useful outbound links when possible.
- Update the `updated` date whenever a page changes.
- Add every page to `index.md`.
- Append every structural/content action to `log.md`.
- Prefer evidence: link commits, issues, tests, source files, logs, and official documentation.
- Never store secrets, tokens, passwords, private keys, or production credentials.
- Mark uncertain information with `confidence: low` and explain what would verify it.
- Keep temporary task notes out of durable pages unless they change project knowledge.

### Confidence semantics

`confidence` is the evidence quality of the statement documented on that page. It is not a claim about an agent's feelings or a guarantee that the application works in production.

- `high` — directly confirmed by current source/configuration and, where relevant, a successful command or explicit repository evidence.
- `medium` — supported by source or planning evidence, but live backend behavior, permissions, visual status colors, or full user-flow acceptance is not verified.
- `low` — inferred, stale, contradictory, or dependent on missing evidence; the page must state what would verify it.

Use the lowest level that accurately describes the page's weakest important claim. A page can be structurally correct while still having `medium` confidence because its runtime behavior depends on external services.

## Frontmatter

```yaml
---
title: Page title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: project | architecture | module | api | decision | workflow | bug | runbook | concept | query | guidance | status | policy
tags: [project, architecture]
project: tmacs-webapp
status: active | superseded | resolved | open | archived
confidence: high | medium | low
sources: [path/or/url]
---
```

## Tag taxonomy

- `project`, `architecture`, `module`, `api`, `database`, `deployment`
- `decision`, `workflow`, `testing`, `debugging`, `performance`, `security`
- `bug`, `runbook`, `dependency`, `integration`, `legacy`, `query`
- `guidance`, `status`, `milestone`, `token-usage`, `documentation`

Add a tag here before using it.

## Page rules

- Create a page for a project, important module/service, non-obvious integration, durable bug diagnosis, operational procedure, architectural decision, or milestone state.
- Do not create pages for trivial implementation details or information already obvious from nearby source code.
- Keep pages under approximately 200 lines; split deep dives when necessary.
- Preserve contradictions instead of silently overwriting them. Record both claims and link the evidence.
- Status pages may contain time-sensitive facts, but each fact must include a date or a source path.
- Guidance pages describe repeatable behavior for agents; they must not pretend that an unverified assumption is a project fact.

## Source references

Use repository-relative paths, commit hashes, issue/PR URLs, test names, and documentation URLs. Examples:

- `source: src/app/api/identity.service.ts:15-105`
- `verified_by: npm run lint`
- `commit: e19073e`

## Required maintenance

When adding or updating a page:

1. Check `index.md` for an existing page.
2. Search the wiki for related terms.
3. Read the relevant source files and preserve the existing implementation style.
4. Update the page and its links.
5. Update `index.md` and `log.md`.
6. If behavior changed, include verification evidence.
7. If a fact is uncertain, lower `confidence` instead of filling the gap with a guess.

## Agent orientation order

At the start of a wiki-backed task, read:

1. `SCHEMA.md`
2. `index.md`
3. `current-status.md` (milestones and tasks)
4. the last 20-30 lines of `log.md`
5. only then the pages and source files relevant to the task

This order is intentionally small: it gives an agent the project map before it spends tokens on implementation details.
