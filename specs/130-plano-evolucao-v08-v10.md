# Plano de Evolução - sql-sage v0.8 → v1.0

Documentação técnica dos gaps identificados e plano de implementação para atingir a versão 1.0.

---

## 1. Problemas Atuais (O que Ainda Não Funciona Idealmente)

### 1.1 ML Prediction - Overfitting com Dataset Pequeno

**Problema:**
```
Epoch 20: train accuracy = 85%, val accuracy = 25%
```

O modelo memoriza os 14 exemplos de treino mas não generaliza para dados novos.

**Causa Raiz:**
- Dataset de treino com apenas 14 amostras
- 3 amostras de validação é estatisticamente irrelevante
- Sem regularização adequada (apenas recurrentDropout=0.2)

**Solução:**
1. Coletar mais dados (prioridade máxima)
2. Implementar K-fold cross-validation
3. Adicionar early stopping
4. Usar class weights para balancear

**Impacto:** 🔴 Alta - Sem dados, ML não funciona

---

### 1.2 Labels de Treinamento - Threshold Fixo de 500ms

**Problema:**
```typescript
// train.ts
const label = record.executionTimeMs > slowThreshold ? 1 : 0;
```

Threshold fixo de 500ms pode não ser adequado para todos os contextos:
- Query OLTP típica: >100ms é lenta
- Query analítica: >5s pode ser normal
- Hardware antigo vs. moderno: 10x diferença

**Solução:**
```typescript
// Implementar threshold adaptativo baseado em percentis
const p75 = percentile(records.map(r => r.executionTimeMs), 75);
const p90 = percentile(records.map(r => r.executionTimeMs), 90);

// Opção 1: Usar p90 como threshold
const slowThreshold = p90;

// Opção 2: Multi-label (slow/medium/fast)
// 0 = fast (< p50), 1 = medium (p50-p90), 2 = slow (> p90)
```

**Impacto:** 🟡 Baixa - Threshold atual funciona razoavelmente

---

### 1.3 Dataset - 17 Amostras com Features (Insuficiente)

**Problema:**
- BiLSTM tem ~50k+ parâmetros (embedding + LSTM + dense)
- Com 14 amostras de treino, temos ~3.5k parâmetros por amostra
- Isso guarantees overfitting

**Solução - Coleta de Dados:**

```bash
# 1. Usar banco de demonstração e-commerce
npm run db:up
npm run db:seed -- --scale 5000

# 2. Gerar queries de exemplo com timings
sql-sage collect data/examples/ecommerce-queries.sql

# 3. Executar cada query e medir tempo real
# (necessário implementar comando "benchmark")

# 4. Alimentar pipeline
sql-sage features
sql-sage train --epochs 100
```

**Fonte de Dados Recomendados:**
1. **pgbench/SQLbolt** - Queries sintéticas padrão
2. **Sakila/Mundo** - Schema de exemplo MySQL
3. **Queries reais de produção** - Via performance_schema
4. **Slow query log** - Queries que já causaram problemas

**Impacto:** 🔴 Alta - Sem dados, ML não funciona

---

### 1.4 Generalização - Val Accuracy Cai Durante Treino

**Problema:**
```
Epoch 1:  val accuracy = 50%
Epoch 10: val accuracy = 25%
Epoch 20: val accuracy = 25%
```

Loss de validação aumenta enquanto loss de treino diminui → overfitting clássico.

**Solução - Early Stopping:**
```typescript
// train.ts - adicionar durante treinamento
let bestValLoss = Infinity;
let patience = 5;
let epochsWithoutImprovement = 0;

for (let epoch = 0; epoch < config.epochs; epoch++) {
  // ... training ...
  
  const currentValLoss = history.history.val_loss[epoch];
  
  if (currentValLoss < bestValLoss) {
    bestValLoss = currentValLoss;
    epochsWithoutImprovement = 0;
    // Salvar melhores pesos
    this.predictor.saveWeights(`${outputDir}/best-model-weights.json`);
  } else {
    epochsWithoutImprovement++;
    if (epochsWithoutImprovement >= patience) {
      console.log(`[Train] Early stopping at epoch ${epoch + 1}`);
      break;
    }
  }
}

// Carregar melhores pesos ao final
this.predictor.loadWeights(`${outputDir}/best-model-weights.json`);
```

**Impacto:** 🔴 Alta - Overfitting invalida o modelo

---

## 2. Gaps para v1.0 - Plano de Implementação

### 2.1 Dataset Maior (Crítico)

**Meta:** 500+ queries com tempos de execução medidos

**Cronograma:**
- Sprint 1: Expandir banco e-commerce para 50k+ linhas
- Sprint 2: Implementar comando `benchmark` para executar queries e medir tempo
- Sprint 3: Gerar 200+ queries de teste (variações de JOIN, subquery, etc.)
- Sprint 4: Coletar queries via performance_schema de banco real

**Arquitetura do Comando Benchmark:**
```typescript
// src/services/data/benchmark-command.ts
export interface IBenchmarkConfig {
  iterations: number;      // executar cada query N vezes
  warmup: number;          // execuções de warmup (descartar)
  output: string;           // arquivo JSONL com resultados
}

interface IBenchmarkResult {
  query: string;
  database: string;
  executionTimeMs: number;  // média das iterações
  minTimeMs: number;
  maxTimeMs: number;
  stdDev: number;
  rowsExamined: number;
  timestamp: string;
}
```

---

### 2.2 Cross-Validation K-Fold (Crítico)

**Problema Atual:**
```typescript
// train.ts - holdout simples
const validationSplit = 0.2;  // 3 samples de 17
```

3 amostras de validação = ruido estatístico completo.

**Solução - K-Fold:**
```typescript
// src/services/ml/train.ts
interface ITrainingResult {
  // ... campos existentes ...
  crossValidationResults?: {
    folds: Array<{
      fold: number;
      trainLoss: number;
      valLoss: number;
      trainAccuracy: number;
      valAccuracy: number;
    }>;
    averageValLoss: number;
    averageValAccuracy: number;
    stdDevValLoss: number;
  };
}

async trainWithKFold(
  inputPath: string,
  outputDir: string,
  config: ITrainingConfig
): Promise<ITrainingResult> {
  const records = this.loadDataset(inputPath);
  const k = 5;  // 5-fold
  
  const foldSize = Math.floor(records.length / k);
  const foldResults = [];
  
  for (let fold = 0; fold < k; fold++) {
    // Separar treino/val
    const valStart = fold * foldSize;
    const valEnd = valStart + foldSize;
    
    const valSet = records.slice(valStart, valEnd);
    const trainSet = [
      ...records.slice(0, valStart),
      ...records.slice(valEnd)
    ];
    
    // Treinar e avaliar
    const result = await this.trainFold(trainSet, valSet, config);
    foldResults.push(result);
  }
  
  // Agregar resultados
  const avgValAcc = foldResults.reduce((a, r) => a + r.valAccuracy, 0) / k;
  // ...
}
```

**Benefício:**
- Validação mais robusta (17/5 = 3-4 samples por fold)
- Média de 5 modelos → predição mais estável
- Estimatativa real de generalização

---

### 2.3 Early Stopping (Crítico)

**Implementação:**
```typescript
// src/services/ml/train.ts
interface IEarlyStoppingConfig {
  patience: number;        // epochs sem melhoria antes de parar
  minDelta: number;        # mudança mínima para considerar "melhoria"
  restoreBestWeights: boolean;
}

async function trainWithEarlyStopping(
  records: IFeatureRecord[],
  config: ITrainingConfig,
  earlyStopping: IEarlyStoppingConfig
): Promise<ITrainingResult> {
  let bestValLoss = Infinity;
  let bestWeights: tf.Tensor[] | null = null;
  let epochsWithoutImprovement = 0;
  
  for (let epoch = 0; epoch < config.epochs; epoch++) {
    const history = await model.fit(...);
    const valLoss = history.history.val_loss[epoch];
    
    if (valLoss < bestValLoss - earlyStopping.minDelta) {
      bestValLoss = valLoss;
      bestWeights = model.getWeights().map(w => w.clone());
      epochsWithoutImprovement = 0;
    } else {
      epochsWithoutImprovement++;
      if (epochsWithoutImprovement >= earlyStopping.patience) {
        console.log(`[Train] Early stopping at epoch ${epoch + 1}`);
        break;
      }
    }
  }
  
  if (earlyStopping.restoreBestWeights && bestWeights) {
    model.setWeights(bestWeights);
  }
}
```

**Configuração Recomendada:**
```typescript
const earlyStopping = {
  patience: 10,      // 10 epochs sem melhoria
  minDelta: 0.01,    // melhoria mínima de 1%
  restoreBestWeights: true
};
```

---

### 2.4 Threshold Adaptativo (Importante)

**Problema:** Threshold fixo não serve para todos os contextos.

**Solução:**
```typescript
// src/services/ml/train.ts
function computeAdaptiveThreshold(
  records: IFeatureRecord[],
  method: 'percentile' | 'iqr' | 'fixed' = 'percentile'
): number {
  const times = records.map(r => r.executionTimeMs).sort((a, b) => a - b);
  
  switch (method) {
    case 'percentile': {
      // Usar p75 ou p90 como threshold
      const p = 75;  // ou 90
      const idx = Math.floor(times.length * p / 100);
      return times[idx];
    }
    
    case 'iqr': {
      // Interquartile range
      const q1 = times[Math.floor(times.length * 0.25)];
      const q3 = times[Math.floor(times.length * 0.75)];
      const iqr = q3 - q1;
      return q3 + 1.5 * iqr;  // outlier threshold
    }
    
    case 'fixed':
    default:
      return 500;  // atual
  }
}

// CLI: sql-sage train --threshold-mode percentile --threshold-p 75
```

**Comparação:**
| Método | Quando Usar |
|--------|--------------|
| p75 | Dataset skewado (maioria rápida) |
| p90 | Dataset variado |
| IQR | Com outliers extremos |
| Fixed | Quando há ground truth conhecido |

---

### 2.5 Feature Engineering - Mais Features de EXPLAIN (Importante)

**Problema Atual:**
- 2 features usam dados de EXPLAIN: `whereColumnsIndexed`, `estimatedRows`
- MySQL EXPLAIN tem muito mais informação útil

**Novas Features a Adicionar:**

```typescript
// feature-extractor.ts
interface IExtractedFeatures {
  // ... existentes ...
  
  // Novas features do EXPLAIN
  explainType: number;          // 0=ALL,1=index,2=range,...,7=const
  hasPossibleKeys: number;      // 1 = optimizer viu opções de índice
  usedKeyIsPrimary: number;     // 1 = usando PRIMARY key
  hasFilesort: number;          // 1 = usar filesort (extra)
  hasUsingTemp: number;         // 1 = tabela temporária
  hasNestedLoop: number;        // 1 = nested loop join
  estimatedCost: number;        // custo estimado normalizado
}

extractFromExplain(plan: IExecutionPlan): Partial<IExtractedFeatures> {
  const typeRank: Record<string, number> = {
    'ALL': 0,    // full table scan (pior)
    'index': 1,  // full index scan
    'range': 2,  // index range
    'ref': 3,    // ref (index lookup)
    'eq_ref': 4, // unique index lookup
    'const': 5,  // constant (melhor)
    'system': 6  // system table
  };
  
  return {
    explainType: typeRank[plan.type] ?? 0,
    hasPossibleKeys: plan.possibleKeys ? 1 : 0,
    usedKeyIsPrimary: plan.keyUsed === 'PRIMARY' ? 1 : 0,
    hasFilesort: plan.extra?.includes('Using filesort') ? 1 : 0,
    hasUsingTemp: plan.extra?.includes('Using temporary') ? 1 : 0,
    hasNestedLoop: plan.extra?.contains('Nested loop') ? 1 : 0,
    estimatedCost: this.normalizeCost(plan.cost),
  };
}
```

**Mapeamento EXPLAIN → Features:**

| EXPLAIN Field | Feature | Importância |
|----------------|---------|-------------|
| type | explainType | Alta - indica tipo de acesso |
| possible_keys | hasPossibleKeys | Média - otimizador viu opções |
| key | usedKeyIsPrimary | Alta - usando PK é bom |
| rows | estimatedRows | Alta - linhas examinadas |
| extra | hasFilesort, hasUsingTemp, hasNestedLoop | Alta - operações caras |

---

### 2.6 Class Weights - Lidar com Desbalanceamento (Importante)

**Problema:**
```json
// Dataset atual
{"label": 0, "count": 8},  // fast
{"label": 1, "count": 9}   // slow
```

Perto de 50/50, mas com datasets reais pode ser 95/5.

**Solução:**
```typescript
// src/services/ml/train.ts
function computeClassWeights(labels: number[]): Record<number, number> {
  const counts = new Map<number, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  
  const n = labels.length;
  const weights: Record<number, number> = {};
  
  for (const [label, count] of counts) {
    weights[label] = n / (counts.size * count);
  }
  
  return weights;
}

// Exemplo: 80 fast, 20 slow
// weights = { 0: 100/160 = 0.625, 1: 100/40 = 2.5 }
// Classe minoritária tem peso maior

// Usar no training
model.fit(X, y, {
  classWeight: computeClassWeights(yData),
  // ...
});
```

---

### 2.7 Modelo Pré-Treinado (Nice to Have)

**Proposta:**
- Treinar modelo com dataset público (TPCH, TPCDS, Sakila)
- Incluir modelo pré-treinado no repositório
- Usuário pode usar diretamente ou fazer fine-tuning

**Dataset Sugerido:**
1. **MySQL Sakila** (~50k linhas, schema padrão)
2. **TPCH** (decision support benchmark)
3. **generated synthetic** - 1000+ queries geradas programaticamente

**Formato de Distribuição:**
```
models/
  baseline-v1.0.zip     # Modelo pré-treinado
  README.md              # Como usar/fine-tune
```

---

### 2.8 Avaliação em Test Set (Nice to Have)

**Problema:** Sem métricas de avaliação formal.

**Solução:**
```typescript
// src/services/ml/evaluation.ts
interface IEvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  rocCurve: Array<{ tpr: number; fpr: number }>;
  auc: number;
}

function evaluateModel(
  model: tf.LayersModel,
  testSet: { X: tf.Tensor; y: tf.Tensor }
): IEvaluationMetrics {
  const predictions = model.predict(testSet.X) as tf.Tensor;
  const yTrue = testSet.y.dataSync();
  const yPred = predictions.dataSync().map(p => p > 0.5 ? 1 : 0);
  
  // Calcular métricas
  const tp = yTrue.filter((t, i) => t === 1 && yPred[i] === 1).length;
  const fp = yTrue.filter((t, i) => t === 0 && yPred[i] === 1).length;
  const tn = yTrue.filter((t, i) => t === 0 && yPred[i] === 0).length;
  const fn = yTrue.filter((t, i) => t === 1 && yPred[i] === 0).length;
  
  return {
    accuracy: (tp + tn) / (tp + tn + fp + fn),
    precision: tp / (tp + fp),
    recall: tp / (tp + fn),
    f1Score: 2 * tp / (2 * tp + fp + fn),
    confusionMatrix: [[tn, fp], [fn, tp]],
    // ... ROC, AUC
  };
}
```

**CLI:**
```bash
sql-sage evaluate --model models/ --test-set data/test-features.jsonl
```

---

## 3. Priorização Sugerida

### Sprint 1-2 (Maior Impacto)
1. 🔴 Dataset maior (benchmark command)
2. 🔴 Early stopping
3. 🔴 Cross-validation K-fold

### Sprint 3-4 (Qualidade)
4. 🟡 Threshold adaptativo
5. 🟡 Feature engineering (EXPLAIN)
6. 🟡 Class weights

### Sprint 5+ (Nice to Have)
7. 🟢 Modelo pré-treinado
8. 🟢 Avaliação formal (precision/recall)

---

## 4. Comandos CLI Propostos

```bash
# Novo: executar benchmark e medir tempos
sql-sage benchmark <queries.sql> --iterations 10 --warmup 3 --output data/benchmarked.jsonl

# Novo: treinar com cross-validation
sql-sage train --k-fold 5 --early-stopping --patience 10

# Novo: treinar com threshold adaptativo
sql-sage train --threshold-mode percentile --threshold-p 75

# Novo: avaliar modelo
sql-sage evaluate --model models/ --test-set data/test.jsonl

# Melhorado: treinar com class weights
sql-sage train --class-weights auto
```

---

## 5. Métricas de Sucesso v1.0

| Métrica | Target | Atual |
|---------|--------|-------|
| Dataset size | 500+ queries | 17 |
| Val accuracy stability | std < 5% | ~25% (oscila) |
| Overfitting gap | < 10% | ~60% |
| Early stopping | implementado | não |
| Cross-validation | k=5 | holdout |
| Precision/Recall | disponível | não |

---

## 6. Referências

- Arquivo atual: `src/services/ml/train.ts`
- Feature extractor: `src/services/ml/engine/feature-extractor.ts`
- Heuristic rules: `src/services/ml/engine/heuristic-rules.ts`
- Connector: `src/services/db/mysql-connector.ts`
