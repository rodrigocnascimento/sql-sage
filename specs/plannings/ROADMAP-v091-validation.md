# Roadmap v0.9.1 - Validation Phase

**Código:** `feat/validation-alpha`  
**Versão:** v0.9.1  
**Data Planejada:** 2026-03-XX  
**Status:** 📋 Planejado

## Dependências

- Consolidated Pipeline (v0.9.0)

---

> **Nota:** O Daemon e Dashboard estão na versão [v0.9.2](ROADMAP-v092-daemon-dashboard.md)

---

## Escopo

Validação completa com banco de desenvolvimento real e refinamento de heurísticas.

---

## Objetivos

1. **Testes em Produção** - Validar com queries reais do banco dev
2. **Ajustar Heurísticas** - Refinar regras baseadas em dados reais
3. **Métricas** - Precision/Recall/F1 em dataset de validação
4. **Documentação** - Guias de uso para cada feature

---

## Validações

### 1. Dataset Validation

| Métrica | Target | Atual |
|---------|--------|-------|
| Total de queries | 500+ | ~400 |
| Queries com timing | 300+ | ~280 |
| Queries escaneadas | 200+ | ~120 |
| Labels balanceados | ±20% | desbalanceado |

### 2. ML Model Validation

| Métrica | Target | Atual |
|---------|--------|-------|
| Train accuracy | >80% | 85% (overfitting) |
| Val accuracy | >70% | 25% |
| Precision | >70% | N/A |
| Recall | >70% | N/A |
| F1-Score | >70% | N/A |

### 3. Heurísticas Validation

Para cada uma das 15 regras:

| Regra | Precision | Recall | F1-Score |
|-------|-----------|--------|----------|
| cartesian-product | ? | ? | ? |
| leading-wildcard | ? | ? | ? |
| ... | ? | ? | ? |

---

## Pipeline de Validação

```
┌─────────────────────┐
│  Query Bank         │
│  (consolidated)     │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  Split      │
    │  70/15/15   │
    │ train/val/test│
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Train      │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Validate   │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Metrics    │
    │  Report     │
    └─────────────┘
```

---

## Métricas de Avaliação

### Confusion Matrix

```
                    Predicted
                  Fast  Medium  Slow
Actual  Fast     [TP]   [FP]   [FP]
        Medium   [FN]  [TP]    [FP]
        Slow     [FN]  [FN]   [TP]
```

### Precision

```
Precision = TP / (TP + FP)
```

Para cada classe (fast, medium, slow).

### Recall

```
Recall = TP / (TP + FN)
```

### F1-Score

```
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

---

## Interface de Avaliação

```typescript
interface IEvaluationResult {
  accuracy: number;
  precision: {
    fast: number;
    medium: number;
    slow: number;
    weighted: number;
  };
  recall: {
    fast: number;
    medium: number;
    slow: number;
    weighted: number;
  };
  f1: {
    fast: number;
    medium: number;
    slow: number;
    weighted: number;
  };
  confusionMatrix: number[][];
  perRuleMetrics: IRuleMetric[];
}

interface IRuleMetric {
  ruleId: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}
```

---

## CLI

```bash
# Avaliar modelo
sql-sage evaluate --model models/latest --test-set data/test.jsonl

# Avaliar heurísticas
sql-sage evaluate --heuristics --test-set data/test.jsonl

# Relatório completo
sql-sage evaluate --full --test-set data/test.jsonl --output report.json

# Cross-validation
sql-sage evaluate --k-fold 5 --test-set data/test.jsonl

# Comparar modelos
sql-sage compare --model-a models/v1 --model-b models/v2 --test-set data/test.jsonl
```

---

## Relatório de Validação

### Exemplo de Output

```json
{
  "version": "v0.9.0",
  "timestamp": "2026-03-14T10:00:00Z",
  "dataset": {
    "total": 500,
    "train": 350,
    "validation": 75,
    "test": 75
  },
  "accuracy": 0.72,
  "precision": {
    "fast": 0.85,
    "medium": 0.65,
    "slow": 0.78,
    "weighted": 0.74
  },
  "recall": {
    "fast": 0.80,
    "medium": 0.70,
    "slow": 0.72,
    "weighted": 0.72
  },
  "f1": {
    "fast": 0.82,
    "medium": 0.67,
    "slow": 0.75,
    "weighted": 0.73
  },
  "confusionMatrix": [
    [80, 10, 5],
    [15, 70, 10],
    [8, 12, 75]
  ],
  "perRuleMetrics": [
    {
      "ruleId": "cartesian-product",
      "precision": 0.95,
      "recall": 0.88,
      "f1": 0.91
    },
    // ... todas as 15 regras
  ],
  "recommendations": [
    "Increase training data for 'slow' class",
    "Improve 'function-on-column' detection",
    "Consider class weights for imbalanced classes"
  ]
}
```

---

## Ajustes Baseados em Validação

### 1. Heurísticas

Se recall baixo para alguma regra:
- Analisar falsos negativos
- Ajustar regex/patterns
- Adicionar casos de borda

### 2. Features

Se accuracy baixo:
- Adicionar features do EXPLAIN
- Remover features com baixa importância
- Criar features derivadas

### 3. Model

Se overfitting:
- Early stopping
- Class weights
- Regularização
- Mais dados

---

## Critérios de Aceitação

- [ ] 500+ queries no banco de validação
- [ ] Split train/val/test adequado (70/15/15)
- [ ] Precision > 70%
- [ ] Recall > 70%
- [ ] F1-Score > 70%
- [ ] Métricas por regra heurística
- [ ] CLI: `sql-sage evaluate`
- [ ] Relatório detalhado em JSON
- [ ] Documentação completa

---

## TDDs Associados

- `specs/tdd-validation-metrics.md` - Métricas de validação
- `specs/tdd-evaluation-cli.md` - CLI de avaliação

---

## Dependências

- Consolidated Pipeline (v0.9.0)

---

## Próxima Versão

[v0.9.2](ROADMAP-v092-daemon-dashboard.md) - Daemon + Dashboard
