# TDD - Docs Theme Auto (GH-0123)

## Objective & Scope

**What:** Keep Just the Docs but add a landing-page oriented layout and automatic dark/light theming that follows the user OS preference.

**Why:** Improve the first impression while maintaining the existing docs structure, without introducing complex build steps or new tooling.

**File Target:** `specs/tdd-GH-0123-docs-theme-auto.md`

## Proposed Technical Strategy

### Logic Flow
1. Keep `remote_theme: just-the-docs/just-the-docs` and extend with custom CSS in `documentation/assets/css/overrides.css`.
2. Use `@media (prefers-color-scheme: dark)` to define dark tokens and auto-switching behavior.
3. Add a more landing-page style hero section on `documentation/index.md` with layout classes and clear CTAs.
4. Configure Just the Docs to load the custom stylesheet via `_config.yml` (e.g., `just_the_docs:
  custom_css: ...`).

### Impacted Files
- `_config.yml`
- `documentation/index.md`
- `documentation/assets/css/overrides.css` (new)

### Language-Specific Guardrails
- TypeScript: not applicable.
- Shell: not applicable.

## Implementation Plan

1. Add `documentation/assets/css/overrides.css` with light/dark variables and landing page styles.
2. Update `_config.yml` to register custom CSS.
3. Update `documentation/index.md` to include a hero section, value props, and CTA links.
4. Validate that the site uses OS theme preference without breaking navigation.

### Path Resolution
- Use relative links inside `documentation/`.
- Keep assets under `documentation/assets/` and reference via Just the Docs custom CSS config.

### Naming Standards
- CSS file: `overrides.css` (kebab-case, lowercase).
