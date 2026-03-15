# Roadmap v0.9.0 - Consolidated Pipeline

**Código:** `feat/consolidated-pipeline`  
**Versão:** v0.9.0  
**Data Planejada:** 2026-03-XX  
**Status:** 📋 Planejado

**Dependência:** v0.8.0 + v0.8.1

---

> **Nota:** O Daemon e Dashboard estão na versão [v0.9.1](ROADMAP-v091-daemon-dashboard.md)

---

## Escopo

Unificação das três fontes de queries em um único pipeline.

---

## Objetivos

1. **Consolidador** - Une Scanner + Perf Schema + Manual em uma única fonte
2. **Deduplicação** - Remove queries duplicadas
3. **Labeling** - Labels baseados em tempo real (threshold adaptativo)
4. **Pipeline Integrado** - collect → features → train → analyze

---

## Fontes de Dados

| Fonte | Prioridade | Descrição | Timing |
|-------|------------|-----------|--------|
| 1. Performance Schema | Alta | Queries com tempos reais | ✅ Sim |
| 2. Scanner | Média | Queries identificadas no código | ❌ Não |
| 3. Manual | Baixa | Queries fornecidas pelo usuário | Opcional |

---

## Arquitetura

```
                    ┌──────────────┐
                    │ Scanner      │ (v0.8.0)
                    │ (static)     │
                    └──────┬───────┘
                           │
┌──────────────┐           │           ┌──────────────┐
│ Manual       │───────────┼───────────│ Perf Schema  │ (v0.8.1)
│ (user)       │           │           │ (live)       │
└──────────────┘           │           └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Consolidator │
                    │              │
                    │ - dedupe     │
                    │ - normalize  │
                    │ - label      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Query Bank   │
                    │ (unified)    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼────┐ ┌────▼─────┐
        │ features  │ │  train  │ │ analyze  │
        └───────────┘ └─────────┘ └──────────┘
```

---

## Componente: Consolidator

### Interface

```typescript
interface IConsolidatorConfig {
  sources: ('scanner' | 'perf-schema' | 'manual')[];
  dedupeConfig: IDedupeConfig;
  labelingConfig: ILabelingConfig;
}

interface IQueryRecord {
  id: string;
  query: string;
  source: 'scanner' | 'perf-schema' | 'manual';
  hasTiming: boolean;
  executionTimeMs?: number;
  label?: 'fast' | 'medium' | 'slow';
  database?: string;
  timestamp?: string;
}
```

### Pipeline de Consolidação

```typescript
class QueryConsolidator {
  async consolidate(
    scannerQueries: IExtractedQuery[],
    perfQueries: IPerfSchemaDigest[],
    manualQueries: IManualQuery[]
  ): Promise<IQueryRecord[]> {
    
    // 1. Normalizar todas as queries
    const normalized = [
      ...this.normalizeScanner(scannerQueries),
      ...this.normalizePerf(perfQueries),
      ...this.normalizeManual(manualQueries),
    ];
    
    // 2. Deduplicar
    const deduplicated = this.deduplicate(normalized);
    
    // 3. Aplicar labels
    const labeled = this.applyLabels(deduplicated);
    
    // 4. Estatísticas
    const stats = this.generateStats(labeled);
    
    return labeled;
  }
}
```

---

## Deduplicação

### Normalização

```typescript
function normalizeQuery(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')           // espaços únicos
    .replace(/,\s*/g, ',')           // vírgulas
    .replace(/\?\s*(,|\))/g, '?')    // parâmetros
    .replace(/'[^']*'/g, '?')        // strings → ?
    .replace(/\d+/g, '?')            // números → ?
    .toUpperCase()
    .trim();
}
```

### Merge

```typescript
interface IDedupeResult {
  unique: IQueryRecord[];
  duplicates: string[];  // IDs dos duplicados
  stats: {
    scanner: number;
    perfSchema: number;
    manual: number;
    total: number;
  };
}
```

---

## Labeling - Threshold Adaptativo

### Por Tempo Real (Performance Schema)

```typescript
interface ILabelingConfig {
  method: 'percentile' | 'iqr' | 'fixed';
  percentile?: number;  // 75, 90
  fixed?: number;       // 500ms
}

function labelByTime(
  queries: IQueryRecord[],
  config: ILabelingConfig
): IQueryRecord[] {
  // Separar queries com timing
  const withTiming = queries.filter(q => q.hasTiming && q.executionTimeMs);
  const withoutTiming = queries.filter(q => !q.hasTiming || !q.executionTimeMs);
  
  // Calcular threshold
  const times = withTiming.map(q => q.executionTimeMs!).sort((a, b) => a - b);
  
  let slowThreshold: number;
  let mediumThreshold: number;
  
  switch (config.method) {
    case 'percentile': {
      const p = config.percentile || 75;
      const p75 = times[Math.floor(times.length * 0.75)];
      const p90 = times[Math.floor(times.length * 0.90)];
      slowThreshold = p90;
      mediumThreshold = p75;
      break;
    }
    case 'iqr': {
      const q1 = times[Math.floor(times.length * 0.25)];
      const q3 = times[Math.floor(times.length * 0.75)];
      const iqr = q3 - q1;
      slowThreshold = q3 + 1.5 * iqr;
      mediumThreshold = q3;
      break;
    }
    case 'fixed':
    default:
      slowThreshold = config.fixed || 500;
      mediumThreshold = slowThreshold * 0.5;
  }
  
  // Aplicar labels
  return queries.map(q => {
    if (!q.hasTiming || !q.executionTimeMs) {
      return { ...q, label: 'unknown' as const };
    }
    if (q.executionTimeMs > slowThreshold) {
      return { ...q, label: 'slow' as const };
    }
    if (q.executionTimeMs > mediumThreshold) {
      return { ...q, label: 'medium' as const };
    }
    return { ...q, label: 'fast' as const };
  });
}
```

### Por Regras (Scanner - sem timing)

```typescript
function labelByHeuristics(query: IQueryRecord): IQueryRecord {
  const sql = query.query.toUpperCase();
  let penalty = 0;
  
  // Aplicar mesma lógica das heurísticas
  if (sql.includes('JOIN') && !sql.includes(' ON ')) penalty += 25;
  if (sql.includes('LIKE \'%')) penalty += 15;
  // ... etc
  
  const score = Math.max(0, 100 - penalty) / 100;
  
  let label: 'fast' | 'medium' | 'slow';
  if (score > 0.7) label = 'fast';
  else if (score > 0.4) label = 'medium';
  else label = 'slow';
  
  return { ...query, label };
}
```

---

## CLI

```bash
# Consolidar múltiplas fontes
sql-sage consolidate \
  --sources scanner,perf-schema,manual \
  --scanner-output data/scanned.jsonl \
  --perf-schema-output data/perf.jsonl \
  --manual-queries "SELECT * FROM users" \
  --output data/consolidated.jsonl

# Pipeline completo
sql-sage pipeline \
  --sources scanner,perf-schema \
  --threshold-method percentile \
  --threshold-p 90 \
  --train-epochs 50

# Apenas consolidar (sem treinar)
sql-sage consolidate --sources scanner,perf-schema

# Estatísticas do banco consolidado
sql-sage stats --input data/consolidated.jsonl
```

---

## Output

### Query Bank Consolidado

```jsonl
{"id": "q1", "query": "SELECT * FROM users WHERE id = ?", "source": "perf-schema", "hasTiming": true, "executionTimeMs": 45.2, "label": "fast", "database": "myapp"}
{"id": "q2", "query": "SELECT * FROM orders WHERE total > ?", "source": "perf-schema", "hasTiming": true, "executionTimeMs": 520.0, "label": "slow", "database": "myapp"}
{"id": "q3", "query": "SELECT u.*, p.* FROM users u JOIN posts p ON u.id = p.user_id", "source": "scanner", "hasTiming": false, "label": "medium", "database": null}
```

### Estatísticas

```json
{
  "total": 450,
  "bySource": {
    "scanner": 120,
    "perf-schema": 280,
    "manual": 50
  },
  "byLabel": {
    "fast": 200,
    "medium": 150,
    "slow": 80,
    "unknown": 20
  },
  "threshold": {
    "method": "percentile",
    "slow": 500,
    "medium": 200
  },
  "deduplicated": 45
}
```

---

## Critérios de Aceitação

- [ ] Consolida múltiplas fontes (scanner, perf-schema, manual)
- [ ] Remove duplicatas
- [ ] Threshold adaptativo configurável (percentile, IQR, fixed)
- [ ] CLI: `sql-sage consolidate`
- [ ] CLI: `sql-sage pipeline`
- [ ] Estatísticas do banco consolidado
- [ ] Testes cobrindo consolidator
- [ ] TypeScript compila sem erros

---

## TDDs Associados

- `specs/tdd-consolidator.md` - Consolidador de queries
- `specs/tdd-adaptive-threshold.md` - Threshold adaptativo
- `specs/tdd-pipeline-cli.md` - CLI unificado

---

## Dependências

- Scanner (v0.8.0)
- Performance Schema collector (v0.8.1)

---

## Próxima Versão

[v0.9.1](ROADMAP-v091-validation.md) - Validation Phase
