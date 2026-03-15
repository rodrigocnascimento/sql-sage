# TDD - Rename docs/ to specs/ (GH-0123)

## Objective & Scope

**What:** Rename the repository `docs/` directory to `specs/` and update all references to it across the codebase, documentation, and project rules.

**Why:** Treat `specs/` as specs-only going forward and align tooling, guidelines, and links with the new `specs/` directory name.

**File Target:** `specs/tdd-GH-0123-specs-rename.md`

## Proposed Technical Strategy

### Logic Flow
1. Rename the directory from `docs/` to `specs/`.
2. Search the repository for references to `docs/` and update them to `specs/` where they refer to the specs directory.
3. Update internal documentation links and any workflow or config references that point to `docs/`.
4. Validate that references in `README.md`, project rules, and documentation site pages now point to `specs/`.

### Impacted Files
- Directory rename: `docs/` -> `specs/`
- `README.md`
- Documentation site pages under `documentation/`
- Project rules and guidelines under `AGENTS.md`
- Any other file with `specs/` path references

### Language-Specific Guardrails
- TypeScript: not applicable (no code logic change expected).
- Shell: not applicable (repo-wide text updates only).

## Implementation Plan

1. Rename `docs/` to `specs/` using a git-aware move.
2. Update all references from `docs/` to `specs/` using a targeted search and manual review to avoid unrelated uses.
3. Check documentation site pages in `documentation/` for links pointing to `docs/` and adjust to `specs/`.
4. Review `AGENTS.md` and any rules that mention `docs/` and update to `specs/`.
5. Verify with a repo search that no references to the old `docs/` path remain, except historical text if explicitly needed.

### Path Resolution
- Use relative links to `specs/` where applicable.
- Preserve existing relative structure and avoid root aliases.

### Naming Standards
- Use `specs/` as the canonical directory for technical design and specification content.
