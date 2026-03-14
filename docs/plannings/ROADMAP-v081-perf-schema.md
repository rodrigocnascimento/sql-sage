# Roadmap v0.8.1 - Performance Schema Integration

**Código:** `feat/perf-schema-integration`  
**Versão:** v0.8.1  
**Data Planejada:** 2026-03-XX  
**Status:** 📋 Planejado

**Dependência:** v0.8.0 (Scanner TypeORM)

---

## Escopo

Coleta de queries do banco de desenvolvimento via Performance Schema do MySQL.

---

## Objetivos

1. **Conexão ao Banco** - Conectar ao banco de desenvolvimento
2. **Coleta de Queries** - Extrair queries de `performance_schema.events_statements_summary_by_digest`
3. **Medição de Tempo** - Capturar tempo de execução real
4. **Mesclagem** - Evitar duplicatas com scanner estático (v0.8.0)

---

## Arquitetura

```
┌─────────────────────────┐
│  MySQL Database         │
│  (dev environment)      │
└────────────┬────────────┘
             │
             │ EXPLAIN, queries, stats
             │
┌────────────▼────────────┐
│  PerformanceSchema      │
│  Collector             │
│                         │
│  - queryCollector      │
│  - metricsGatherer     │
│  - explainRunner       │
└────────────┬────────────┘
             │
             │ Query records (with timing)
             │
┌────────────▼────────────┐
│  Output                 │
│  (JSONL format)         │
└─────────────────────────┘
```

---

## MySQL Queries

### Coleta de Queries do Performance Schema

```sql
SELECT
  DIGEST AS id,
  DIGEST_TEXT AS query,
  ROUND(SUM_TIMER_WAIT / 1000000000, 2) AS executionTimeMs,
  ROUND(AVG_TIMER_WAIT / 1000000000, 2) AS avgTimeMs,
  ROUND(MAX_TIMER_WAIT / 1000000000, 2) AS maxTimeMs,
  COUNT_STAR AS executions,
  SCHEMA_NAME AS `database`,
  FIRST_SEEN AS firstSeen,
  LAST_SEEN AS lastSeen
FROM performance_schema.events_statements_summary_by_digest
WHERE
  DIGEST_TEXT IS NOT NULL
  AND SCHEMA_NAME IS NOT NULL
  -- filtro opcional por tempo mínimo
  AND SUM_TIMER_WAIT / 1000000000 >= :minTimeMs
ORDER BY SUM_TIMER_WAIT DESC
LIMIT :limit;
```

### EXPLAIN para cada query

```sql
EXPLAIN :query;
```

---

## Tipos de Coleta

### 1. Por Digest (Agregado)

Agrupa queries similares e soma tempos:

```typescript
interface IPerfSchemaDigest {
  id: string;
  query: string;
  executionTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
  executions: number;
  database: string;
  firstSeen: string;
  lastSeen: string;
}
```

### 2. Por Query Individual

Coleta cada execução individual (se disponível):

```typescript
interface IPerfSchemaEvent {
  id: string;
  query: string;
  executionTimeMs: number;
  timestamp: string;
  database: string;
  rowsExamined: number;
  rowsSent: number;
}
```

---

## CLI

```bash
# Coleta básica
sql-sage collect --source perf-schema \
  --host localhost --port 3306 \
  --user root --password xxx \
  --database myapp_dev

# Com filtros
sql-sage collect --source perf-schema \
  --min-time 100 \
  --limit 500 \
  --output perf-queries.jsonl

# Coletar + executar EXPLAIN automaticamente
sql-sage collect --source perf-schema \
  --explain \
  --host localhost

# Apenas estatísticas
sql-sage stats --source perf-schema
```

---

## Output

### JSONL (para pipeline)

```jsonl
{"id": "q_abc123", "query": "SELECT * FROM users WHERE id = ?", "executionTimeMs": 45.2, "avgTimeMs": 42.1, "maxTimeMs": 120.5, "executions": 150, "database": "myapp_dev", "timestamp": "2026-03-14T10:30:00Z", "firstSeen": "2026-03-01T00:00:00Z"}
{"id": "q_def456", "query": "SELECT p.*, c.name FROM products p JOIN categories c ON p.category_id = c.id", "executionTimeMs": 234.5, "avgTimeMs": 220.0, "maxTimeMs": 500.0, "executions": 45, "database": "myapp_dev", "timestamp": "2026-03-14T10:31:00Z"}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Digest ID único |
| `query` | string | SQL normalizada |
| `executionTimeMs` | number | Tempo total (ms) |
| `avgTimeMs` | number | Tempo médio (ms) |
| `maxTimeMs` | number | Tempo máximo (ms) |
| `executions` | number | Número de execuções |
| `database` | string | Banco de dados |
| `timestamp` | string | ISO timestamp |
| `firstSeen` | string | Primeira vez vista |
| `lastSeen` | string | Última vez vista |

---

## Integração com Scanner (v0.8.0)

### Deduplicação

```typescript
interface IDedupeConfig {
  ignoreParams: boolean;  // "SELECT * WHERE id = 1" == "SELECT * WHERE id = 2"
  normalizeWhitespace: boolean;
}

function deduplicate(
  scannerQueries: IExtractedQuery[],
  perfSchemaQueries: IPerfSchemaDigest[]
): IQueryRecord[] {
  const normalizedScanner = scannerQueries.map(q => normalize(q.sql));
  const normalizedPerf = perfSchemaQueries.map(q => normalize(q.query));
  
  // Merge e marca fonte
  // ...
}
```

### Marcação de Fonte

```jsonl
{"query": "...", "source": "perf-schema", "hasTiming": true}
{"query": "...", "source": "scanner", "hasTiming": false}
```

---

## Critérios de Aceitação

- [ ] Coleta queries de performance_schema
- [ ] Filtro por tempo mínimo configurável
- [ ] Captura timestamp de execução
- [ ] Suporte a múltiplos bancos
- [ ] Compatível com output do scanner (mesmo schema JSONL)
- [ ] CLI: `sql-sage collect --source perf-schema`
- [ ] Testes cobrindo collector
- [ ] TypeScript compila sem erros

---

## TDDs Associados

- `docs/tdd-perf-schema-collector.md` - Coleta Performance Schema

---

## Dependências

- mysql2 (já presente)
- Conexão ao banco de dev (fornecida pelo usuário)

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Performance schema desabilitado | Verificar status antes de coletar, retornar erro claro |
| Queries muito longas | Truncar para evitar memory issues |
| Sem queries no período | Retornar array vazio com mensagem |

---

## Próxima Versão

v0.9.0 - Consolidated Pipeline
