# Rule: Version Bump & Changelog After Task Approval (VBCA)

## Context

To maintain consistent versioning and an accurate project history, every completed task must follow a controlled approval and versioning process.

After finishing any requested implementation, bug fix, refactor, or feature, the system must request explicit approval from the developer before applying version updates and modifying the project changelog.

This ensures that only validated work modifies the official version history.

---

## 1) Mandatory Approval After Task Completion

After completing any requested task, the system MUST:

1. Present a concise summary of what was done.
2. Ask the developer if the changes are approved.

Example:

```
Task completed. Summary of changes:

- Fixed integration tests for API payments
- Added boleto-exclusive plan in Layer
- Updated related service logic

Do you approve these changes?
```

---

## 2) If Approval Is Granted

If the developer explicitly approves (examples: **"sim"**, **"approved"**, **"ok"**, **"pode subir"**, etc.), the system MUST:

1. Perform a **version bump**.
2. Update the **CHANGELOG.md**.

### Version bump rules

Use **Semantic Versioning**:

| Change Type     | Version Change |
| --------------- | -------------- |
| Bug fix         | PATCH          |
| New feature     | MINOR          |
| Breaking change | MAJOR          |

Example:

```
1.3.2 → 1.3.3
```

The version must be updated in:

```
package.json
```

or other version source used by the project.

---

## 3) Updating CHANGELOG.md

The system MUST append a new entry to the top of `CHANGELOG.md`.

Format:

```
## [1.3.3] - 2026-03-06

### Fixed
- Corrected integration tests in api-pagamentos

### Added
- Boleto-exclusive plan for Layer integration tests
```

Rules:

* Always place the **newest entry at the top**
* Use the current date
* Categorize changes as:

```
Added
Changed
Fixed
Removed
```

---

## 4) If Approval Is Denied

If the developer does **not approve**:

The system MUST:

* Not perform version bump
* Not update the changelog
* Ask what should be adjusted

Example:

```
Understood. What adjustments should be made before approval?
```

---

## 5) Execution Order (Mandatory)

The workflow MUST follow this order:

1️⃣ Task implementation
2️⃣ Show summary
3️⃣ Ask approval
4️⃣ If approved → bump version
5️⃣ Update CHANGELOG.md

Skipping steps is **not allowed**.
