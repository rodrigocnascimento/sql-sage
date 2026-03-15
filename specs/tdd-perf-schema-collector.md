# TDD: Performance Schema Collector

## Objective & Scope

- **What:** Implementar coletor de queries do MySQL Performance Schema para capturar queries com tempo de execução real
- **Why:** Complementar o scanner estático (v0.8.1) com dados reais do banco de desenvolvimento
- **File Target:** `specs/tdd-perf-schema-collector.md`

---

## Feature Info

- **Feature Name:** Performance Schema Integration
- **Issue ID:** ISSUE-XXX (a criar)
- **Branch:** `feat/perf-schema-integration`

---

## Proposed Technical Strategy

### Arquitetura

```
MySQL Database → PerformanceSchemaCollector → JSONL Output
```

### Componentes

1. **PerformanceSchemaCollector** - Classe principal
   - Conexão ao banco via mysql2
   - Coleta de `performance_schema.events_statements_summary_by_digest`
   - Suporte a EXPLAIN opcional

2. **CLI Command**
   - `sql-sage collect --source perf-schema`

### Stack

- mysql2 (já presente)
- Reutilizar estrutura de connectors existente

---

## Implementation Plan

### Fase 1: Core Collector
1. Criar `src/services/collector/performance-schema-collector.ts`
2. Interface `IPerfSchemaDigest`
3. Método `collect(options)` retorna array de queries

### Fase 2: CLI Integration
1. Adicionar comando `collect` em `src/index.ts`
2. Opções: `--source`, `--min-time`, `--limit`, `--explain`

### Fase 3: Testes
1. Testes unitários com mocks
2. Teste de integração com banco real

---

## Output Format

```jsonl
{"id": "q_abc123", "query": "SELECT * FROM users WHERE id = ?", "executionTimeMs": 45.2, "avgTimeMs": 42.1, "maxTimeMs": 120.5, "executions": 150, "database": "myapp_dev", "firstSeen": "2026-03-01T00:00:00Z", "lastSeen": "2026-03-14T00:00:00Z"}
```
