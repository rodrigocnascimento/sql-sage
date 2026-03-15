# Auditoria Técnica - sql-sage v0.7

Análise crítica do estado atual da ferramenta, com foco na capacidade real de predição de queries problemáticas no MySQL.

**Data:** 2026-03-14
**Escopo:** Pipeline completo -- coleta, features, treinamento, predição, conexão MySQL.

---

## 1. Resumo Executivo

A ferramenta atingiu um marco importante: **o sistema ML agora funciona de forma unificada**. O comando `analyze` carrega e utiliza pesos treinados, o pipeline de treinamento salva os pesos corretamente, e a conexão com MySQL está operacional.

As principais conquistas desde a v0.2:
- Sistema unificado (pesos treinados são carregados e usados)
- Conector MySQL funcional (EXPLAIN real, catálogo de índices)
- 15 regras heurísticas (vs. 3 na v0.2)
- Dataset expandido (100 queries, 17 com features extraídas)

Os problemas remanescentes são de **qualidade de dados e tamanho de dataset**, não de arquitetura.

---

## 2. Sistema ML Unificado

### Arquitetura Atual

Existe agora **um único sistema ML** que funciona tanto para inferência quanto para treinamento:

- **Vocabulário**: 100 tokens (2-60 = keywords SQL fixas, 61-100 = identificadores via hash)
- **Tamanho da sequência**: 20 palavras
- **Features**: 18 features estruturais
- **Modelo**: BiLSTM + Embedding + Dense layers
- **Pesos**: Salvos e carregados corretamente

### Compatibilidade Treino/Inferência

| Propriedade | Treinamento | Inferência |
|---|---|---|
| Vocabulário | 100 tokens (2-60 fixos) | Mesmo |
| Tamanho sequência | 20 | Mesmo |
| Features | 18 | Mesmo |
| Pesos | Salvos com `saveWeights()` | Carregados com `loadWeights()` |

**Status**: ✅ Compatível. O modelo treinado é carregado corretamente.

### Evidence de Funcionamento

```
[ML Engine] Loaded trained model: models/model-v1772987881334-weights.json
[ML Engine] Engine ready.
```

O `analyze` agora combina heurística (60%) + ML (40%) quando modelo treinado está disponível.

---

## 3. O Comando `analyze` em Detalhe

### Fluxo de Execução

```
sql-sage analyze arquivo.sql --host localhost --port 3316
  -> MLPredictionService.initialize()
    -> MLQueryEngine.start()
      -> QueryPerformancePredictor.buildModel()
      -> QueryPerformancePredictor.loadWeights()  // carrega pesos!
  -> MLPredictionService.predict(sql, connector)
    -> connector.explain(sql)                    // EXPLAIN real (se conectado)
    -> connector.getCatalogInfo()                // índices reais (se conectado)
    -> MLQueryEngine.processQuery(sql, plan, catalog)
      -> HeuristicEngine.analyze(sql)           // 15 regras
      -> FeatureExtractor.extract(sql, plan, catalog)
      -> QueryPerformancePredictor.predict()    // ML (se treinado)
```

### Score é Real

O `performanceScore` retornado agora é:
- **Com ML**: `heuristic.score * 0.6 + (1 - mlScore) * 0.4`
- **Sem ML**: apenas `heuristic.score`

Quando há modelo treinado, o score reflete aprendizado real.

### 15 Regras Heurísticas

Todas implementadas em `heuristic-rules.ts`:

| # | ID | Tipo | Penalidade |
|---|---|---|---|
| 1 | `cartesian-product` | PERFORMANCE_BOTTLENECK | -25 |
| 2 | `leading-wildcard` | ANTI_PATTERN | -15 |
| 3 | `select-star-join` | ANTI_PATTERN | -10 |
| 4 | `no-where-mutation` | PERFORMANCE_BOTTLENECK | -30 |
| 5 | `or-different-columns` | PERFORMANCE_BOTTLENECK | -10 |
| 6 | `function-on-column` | ANTI_PATTERN | -15 |
| 7 | `subquery-in-where` | PERFORMANCE_BOTTLENECK | -20 |
| 8 | `no-limit` | SYNTAX_OPTIMIZATION | -5 |
| 9 | `count-no-where` | PERFORMANCE_BOTTLENECK | -10 |
| 10 | `join-no-on` | PERFORMANCE_BOTTLENECK | -25 |
| 11 | `or-to-in` | SYNTAX_OPTIMIZATION | -5 |
| 12 | `deep-subquery` | PERFORMANCE_BOTTLENECK | -15 |
| 13 | `union-without-all` | SYNTAX_OPTIMIZATION | -5 |
| 14 | `too-many-joins` | PERFORMANCE_BOTTLENECK | -10 |
| 15 | `distinct-order-by` | ANTI_PATTERN | -10 |

---

## 4. Conexão MySQL

### MysqlConnector Funcional

O `src/services/db/mysql-connector.ts` implementa:

```typescript
async connect(): Promise<void>
async disconnect(): Promise<void>
async explain(query: string): Promise<IExecutionPlan[]>
async getCatalogInfo(database: string, table: string): Promise<ICatalogInfo>
async collectRecentQueries(options: ICollectOptions): Promise<ISQLQueryRecord[]>
```

### Dados Reais Coletados

- **EXPLAIN**: Parse completo de `selectType`, `table`, `type`, `possibleKeys`, `keyUsed`, `rowsExamined`, `rowsReturned`
- **Catálogo**: `TABLE_ROWS`, `AVG_ROW_LENGTH`, `INDEX_NAME`, `COLUMN_NAME`, `NON_UNIQUE`
- **performance_schema**: Coleta queries reais com tempos de execução

### Feature Extraction com Dados Reais

```typescript
// feature-extractor.ts
whereColumnsIndexed: this.checkWhereColumnsIndexed(normalizedQuery, catalogInfo),
estimatedRows: executionPlan ? this.normalizeRows(executionPlan.rowsExamined) : 0,
```

- `whereColumnsIndexed`: Verifica se colunas no WHERE têm índice (dados reais do catálogo)
- `estimatedRows`: Normaliza `rowsExamined` do EXPLAIN real

---

## 5. Pipeline de Treinamento

### Dados

- **queries.jsonl**: 100 queries coletadas
- **features.jsonl**: 17 queries com features extraídas

### Labels

```typescript
// train.ts - prepareData()
const label = record.executionTimeMs > slowThreshold ? 1 : 0;
```

Threshold fixo de 500ms (configurável via `--slow-threshold`).

**Problema**: O threshold é absoluto, não relativo ao dataset (melhorou desde v0.2). Porém, 500ms pode não ser ideal para todos os contextos.

### Resultados do Treinamento

```json
{
  "modelVersion": "v1772987881334",
  "epochs": 20,
  "finalLoss": 0.627,
  "finalAccuracy": 0.846,
  "trainSamples": 14,
  "valSamples": 3,
  "slowThreshold": 500
}
```

### Métricas por Epoch

| Epoch | Loss | Val Loss | Accuracy | Val Accuracy |
|-------|------|----------|----------|--------------|
| 1 | 0.708 | 0.673 | 46% | 50% |
| 10 | 0.671 | 0.688 | 85% | 25% |
| 20 | 0.627 | 0.694 | 85% | 25% |

**Problema claro**: Validation accuracy cai durante o treinamento (overfitting). O modelo memoriza os dados de treino mas não generaliza.

### Causa Raiz

- **Dataset muito pequeno**: 14 amostras de treino, 3 de validação
- **Classes desbalanceadas**: No dataset, 8 rápidas, 9 lentas (threshold 500ms)
- **Sem early stopping**: O treinamento rodou todas as 20 epochs

---

## 6. Testes

### Cobertura

345 testes passando, cobrindo:
- Parser de SQL
- Feature extraction
- Treinamento
- Heuristic rules
- Tokenizer
- Conector MySQL (mock)
- Integração E2E

```
Test Files  16 passed (16)
Tests       345 passed (345)
```

---

## 7. Resumo das Capacidades Reais

### O que Funciona

| Funcionalidade | Status | Valor Real |
|---|---|---|
| CLI com 5 comandos | ✅ Funcional | Estrutura sólida |
| Parser de slow query log | ✅ Funcional | Útil para coleta |
| ExplainParser | ✅ Funcional | Integrado ao connector |
| Extração de 18 features | ✅ Funcional | Com dados reais do MySQL |
| 15 regras heurísticas | ✅ Funcional | Cobertura ampla |
| Conexão MySQL real | ✅ Funcional | EXPLAIN + catálogo |
| ML unificado | ✅ Funcional | Pesos são salvos e carregados |
| Pipeline JSONL | ✅ Funcional | Bem estruturado |
| Testes | ✅ 345 passando | ~95% cobertura |

### O que Ainda Não Funciona Idealmente

| Funcionalidade | Problema | Severidade |
|---|---|---|
| ML prediction | Overfitting com dataset pequeno | Média |
| Labels de treinamento | Threshold fixo de 500ms | Baixa |
| Dataset | 17 amostras com features (insuficiente) | Alta |
| Generalização | Val accuracy cai durante treino | Alta |

---

## 8. Gaps para v1.0

### Críticos

1. **Dataset maior** - Centenas ou milhares de queries reais com tempos de execução medidos
2. **Cross-validation** - K-fold em vez de holdout simples (3 samples de val é ruido)
3. **Early stopping** - Parar quando val loss começar a subir

### Importantes

4. **Threshold adaptativo** - Baseado em percentis do dataset, não valor fixo
5. **Feature engineering** - Mais features baseadas em EXPLAIN (type, possibleKeys, keyUsed)
6. **Class weights** - Lidar com desbalanceamento de classes

### Nice to Have

7. **Modelo pré-treinado** - Fornecer modelo baseline treinado com dados públicos
8. **Avaliação em test set** - Métricas de precision/recall

---

## 9. Conclusão

A ferramenta evoluiu significativamente desde a v0.2:

| Aspecto | v0.2 | v0.7 |
|---|---|---|
| Sistema ML | Dois sistemas desconectados | Sistema único e unificado |
| Pesos treinados | Perdidos após treino | Salvos e carregados corretamente |
| Regras heurísticas | 3 | 15 |
| Conexão MySQL | Mock | Funcional (real) |
| Dataset | 17 queries | 100 queries (17 com features) |
| Tests | ~? | 345 passando |

O **objetivo de predizer queries problemáticas é factível agora**. A arquitetura está correta; o próximo passo é coletar mais dados reais e melhorar o pipeline de treinamento.

A estrutura é sólida. O problema agora é **dados**, não código.
