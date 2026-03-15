# TDD: Consolidated Pipeline (v0.9.0)

## Objective & Scope

- **What:** Implementar pipeline unificado que consolida queries de múltiplas fontes (scanner, perf-schema, manual), remove duplicatas e aplica labels
- **Why:** Unificar o fluxo de coleta de dados para training do ML
- **File Target:** `specs/tdd-consolidated-pipeline.md`

---

## Feature Info

- **Feature Name:** Consolidated Pipeline
- **Issue ID:** ISSUE-13
- **Branch:** `feat/consolidated-pipeline`

---

## Proposed Technical Strategy

### Arquitetura

```
Scanner + Perf-Schema + Manual → Consolidator → Query Bank Unificado
```

### Componentes

1. **QueryConsolidator** - Classe principal
   - normalize(): normaliza queries para dedup
   - deduplicate(): remove duplicatas
   - applyLabels(): aplica labels (fast/medium/slow)

2. **CLI Commands**
   - `sql-sage consolidate` - consolida fontes
   - `sql-sage pipeline` - pipeline completo

### Stack
- Reutilizar scanner existente
- Reutilizar collector existente
- Novas classes em `src/services/consolidator/`

---

## Implementation Plan

### Fase 1: Consolidator Core
1. Criar `src/services/consolidator/query-consolidator.ts`
2. Implementar `normalizeQuery()`
3. Implementar `deduplicate()`

### Fase 2: Labeling
1. Implementar `applyLabels()` com threshold adaptativo
2. Suporte a métodos: percentile, IQR, fixed

### Fase 3: CLI Integration
1. Adicionar comando `consolidate`
2. Adicionar comando `pipeline`

### Fase 4: Testes
1. Testes unitários
2. Teste de integração

---

## Output Format

```jsonl
{"id": "q1", "query": "SELECT * FROM users", "source": "perf-schema", "hasTiming": true, "executionTimeMs": 45.2, "label": "fast", "database": "myapp"}
```
