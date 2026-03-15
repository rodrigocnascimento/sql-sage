# TDD - End-to-End Developer Tutorial (GH-0123)

## Objective & Scope

**What:** Create an end-to-end developer tutorial page that explains how the tool works from data collection through analysis, based on the existing specs (`specs/95-end-to-end-workflow.md` and `specs/99-plano-teste-manual.md`).

**Why:** Provide a single, clear walkthrough so developers understand the pipeline, expected outputs, and how to interpret results.

**File Target:** `specs/tdd-GH-0123-dev-tutorial.md`

## Proposed Technical Strategy

### Logic Flow
1. Add a new documentation page under `documentation/` (e.g., `documentation/tutorial.md`).
2. Summarize the pipeline steps with expected outputs and key checkpoints.
3. Include concise commands and expected results sections, aligned with existing specs.
4. Link to deeper references in `documentation/` and to the specs for full details.

### Impacted Files
- `documentation/tutorial.md` (new)
- `documentation/index.md` (add tutorial link)
- `documentation/getting-started.md` (link to tutorial)

### Language-Specific Guardrails
- TypeScript: not applicable.
- Shell: not applicable.

## Implementation Plan

1. Draft the tutorial using the structure: Overview → Steps → Expected Results → Troubleshooting.
2. Keep commands aligned with current CLI syntax and outputs from specs.
3. Add links to pipeline, CLI reference, and testing guide.
4. Ensure content is in en-US and consistent with the rest of the documentation.

### Path Resolution
- Use relative links within `documentation/`.
- Reference specs via repository links (not rendered in Pages).

### Naming Standards
- Use `tutorial.md` and title case headings.
