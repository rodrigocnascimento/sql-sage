# TDD - Mermaid Diagrams for ML Docs (GH-0123)

## Objective & Scope

**What:** Replace ASCII diagrams in `documentation/ml/` with Mermaid diagrams for clearer visuals.

**Why:** Improve readability and make the documentation look more polished without adding new build tooling.

**File Target:** `specs/tdd-GH-0123-mermaid-diagrams.md`

## Proposed Technical Strategy

### Logic Flow
1. Enable Mermaid rendering in Just the Docs via `_config.yml`.
2. Replace ASCII diagram blocks in `documentation/ml/` with Mermaid `flowchart` blocks.
3. Keep code block content minimal and consistent across pages.
4. Verify the pages render with Mermaid on GitHub Pages.

### Impacted Files
- `_config.yml`
- `documentation/ml/index.md`
- `documentation/ml/query-performance-predictor.md`
- Any other ML doc with ASCII diagrams

### Language-Specific Guardrails
- TypeScript: not applicable.
- Shell: not applicable.

## Implementation Plan

1. Add Mermaid support flag to `_config.yml`.
2. Convert ASCII diagrams to Mermaid `flowchart LR` diagrams.
3. Keep section structure intact and avoid changing semantic text.
4. Confirm no broken Markdown or layout regressions.

### Path Resolution
- No path changes; only inline diagram blocks are updated.

### Naming Standards
- Use `flowchart LR` with clear node names and minimal styling.
