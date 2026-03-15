# TDD - Mermaid-Only Diagram Rule (GH-345)

## Objective & Scope

**What:** Add a project rule that forbids ASCII diagrams and requires Mermaid for all diagrams in documentation.

**Why:** Ensure diagrams are consistent, readable, and render nicely in GitHub Pages.

**File Target:** `specs/tdd-GH-345-mermaid-only-rule.md`

## Proposed Technical Strategy

### Logic Flow
1. Add a rule to the OpenCode rules set that explicitly bans ASCII diagrams.
2. Require Mermaid code blocks for any diagrams.
3. Update AGENTS instructions via `npm run opencode:compile` to reflect the new rule.

### Impacted Files
- `.opencode/rules/` (new rule file)
- `AGENTS.md` (recompiled)

### Language-Specific Guardrails
- TypeScript: not applicable.
- Shell: not applicable.

## Implementation Plan

1. Create a new rule markdown file describing the Mermaid-only requirement.
2. Run `npm run opencode:compile` to sync `AGENTS.md`.
3. Confirm no ASCII diagrams remain in `documentation/` and `specs/`.

### Path Resolution
- No path changes; rule is applied to documentation content.

### Naming Standards
- Rule filename: `rules/90-mermaid-only-diagrams.md`.
