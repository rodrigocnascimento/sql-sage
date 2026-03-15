# TDD - Clarify Dev vs npm Install (GH-0123)

## Objective & Scope

**What:** Update the documentation landing page and Getting Started to clearly state that the docs cover development workflows, while the primary product is the npm package for installation.

**Why:** Avoid confusion between local development and end-user installation, ensuring the correct entry path for each audience.

**File Target:** `specs/tdd-GH-0123-dev-install-clarity.md`

## Proposed Technical Strategy

### Logic Flow
1. Add a concise banner or callout in `documentation/index.md` that explains the distinction between dev docs and npm installation.
2. Add a section in `documentation/getting-started.md` labeled “Development Only” and a separate “Install from npm” snippet.
3. Keep language short and direct; include the npm install command and a link to CLI usage.

### Impacted Files
- `documentation/index.md`
- `documentation/getting-started.md`

### Language-Specific Guardrails
- TypeScript: not applicable.
- Shell: not applicable.

## Implementation Plan

1. Add a small callout in the landing page highlighting dev vs npm use.
2. Add a dedicated npm installation snippet on Getting Started.
3. Confirm copy aligns with current package name and CLI entry point.

### Path Resolution
- Use relative links inside `documentation/`.

### Naming Standards
- Keep section headings in title case.
