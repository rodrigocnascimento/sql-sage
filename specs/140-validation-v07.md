# Validation Checklist & Evolution Roadmap

> Post v0.7.0 — Assessment Document

## Current State (v0.7.0)

| Component | Status | Notes |
|---|---|---|
| Unified ML System | ✅ Implemented | Single pipeline: train → save weights → load for inference |
| Weights Persistence | ✅ Fixed | `saveWeights()` and `loadWeights()` working correctly |
| MySQL Connector | ✅ Functional | Real EXPLAIN + catalog queries |
| Heuristic Rules | ✅ 15 rules | All implemented and triggered correctly |
| Test Suite | 345 tests, 16 files, 0 failures | — |
| Dataset | 100 queries (17 with features) | Growing |

### What v0.7.0 Unlocked

Before v0.7.0, the ML system had two major problems:

| Problem | Before | After |
|---|---|---|
| Two incompatible ML systems | System A (analyze) used random weights; System B (train) saved topology only | Single unified system: `QueryPerformancePredictor` used by both |
| Weights lost after training | `model.toJSON()` saved only architecture, not weights | `saveWeights()` serializes actual learned weights to JSON |

The critical fix: **the trained model now loads and is used for inference**:

```
[ML Engine] Loaded trained model: models/model-v1772987881334-weights.json
[ML Engine] Engine ready.
```

---

## Part 1: Validation Checklist

### 1.1 ML System Validation

These confirm the unified ML pipeline works end-to-end:

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Model loads trained weights | `npm run dev -- analyze data/examples/ecommerce-queries.sql --verbose` | Log shows "Loaded trained model" |
| 2 | Weights persistence | Check `models/model-v*-weights.json` exists | JSON with `name`, `shape`, `data` fields |
| 3 | Combined scoring | Run analyze with and without trained model | With model: combines heuristic(60%) + ML(40%); Without: heuristics only |
| 4 | Training produces usable model | `npm run dev -- train --epochs 20` then analyze | New model version appears in models/ |
| 5 | Model versioning | Multiple training runs | Each creates unique `model-v{timestamp}*` files |

### 1.2 Heuristic Rules Validation

Confirm all 15 rules are triggered appropriately:

| # | Rule ID | Query That Triggers |
|---|---|---|
| 1 | `cartesian-product` | `SELECT * FROM a, b, c` |
| 2 | `leading-wildcard` | `WHERE name LIKE '%foo'` |
| 3 | `select-star-join` | `SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id` |
| 4 | `no-where-mutation` | `UPDATE products SET price = price * 1.1` |
| 5 | `or-different-columns` | `WHERE status = 'active' OR total > 100` |
| 6 | `function-on-column` | `WHERE UPPER(name) = 'FOO'` |
| 7 | `subquery-in-where` | `WHERE id IN (SELECT product_id FROM banned)` |
| 8 | `no-limit` | `SELECT * FROM orders` |
| 9 | `count-no-where` | `SELECT COUNT(*) FROM products` |
| 10 | `join-no-on` | `SELECT * FROM a JOIN b` (no ON) |
| 11 | `or-to-in` | `WHERE id = 1 OR id = 2 OR id = 3 OR id = 4` |
| 12 | `deep-subquery` | Nested subqueries (3+ levels) |
| 13 | `union-without-all` | `UNION` (not `UNION ALL`) |
| 14 | `too-many-joins` | `JOIN` x 6+ |
| 15 | `distinct-order-by` | `SELECT DISTINCT ... ORDER BY name` |

Run validation:
```bash
npm run dev -- analyze data/examples/ecommerce-queries.sql --verbose 2>&1 | grep issueType
```

### 1.3 Feature Extraction Validation

Confirm all 18 features are extracted correctly:

| # | Feature | Validation |
|---|---|---|
| 1 | `hasJoin` | Query with JOIN → 1 |
| 2 | `joinCount` | 3 JOINs → 3 |
| 3 | `hasSubquery` | Has subquery → 1 |
| 4 | `subqueryCount` | 2 subqueries → 2 |
| 5 | `hasFunctionInWhere` | `WHERE YEAR(date) = 2024` → 1 |
| 6 | `selectStar` | `SELECT *` → 1 |
| 7 | `tableCount` | 3 tables → 3 |
| 8 | `whereColumnsIndexed` | With live DB + indexed column → 1 |
| 9 | `estimatedRows` | With live EXPLAIN → normalized value |
| 10 | `hasOr` | Has OR in WHERE → 1 |
| 11 | `hasUnion` | Has UNION → 1 |
| 12 | `hasLike` | Has LIKE → 1 |
| 13 | `hasCountStar` | `COUNT(*)` → 1 |
| 14 | `nestedJoinDepth` | 2 JOINs → 1 |
| 15 | `hasGroupBy` | Has GROUP BY → 1 |
| 16 | `hasOrderBy` | Has ORDER BY → 1 |
| 17 | `hasLimit` | Has LIMIT → 1 |
| 18 | `orConditionCount` | 2 ORs → 2 |

### 1.4 MySQL Integration Validation

| # | Check | Command | What to Observe |
|---|---|---|---|
| 1 | `status` with DB | `npm run dev -- status --host localhost --port 3316 --user root --password sqlsage_root_pass --database ecommerce_demo` | Shows tables, connected: true |
| 2 | Live EXPLAIN | Analyze with DB connection | `liveExplain: true`, `estimatedRows > 0` |
| 3 | Live catalog | Analyze with DB connection | `liveCatalog: true`, `whereColumnsIndexed` reflects indexes |
| 4 | Graceful fallback | Analyze without DB | Works offline, heuristics only |

### 1.5 Pipeline Validation (collect → features → train → analyze)

| # | Step | Command | What to Observe |
|---|---|---|---|
| 1 | Collect | `npm run dev -- collect data/examples/ecommerce-queries.sql` | Writes to data/queries.jsonl |
| 2 | Features | `npm run dev -- features` | Extracts 18 features per query |
| 3 | Train | `npm run dev -- train --epochs 20` | Saves model-v*.json + weights |
| 4 | Analyze | Run analyze with trained model | `mlAvailable: true` |

### 1.6 Regression Checks

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | All tests pass | `npm test` | 345 tests, 0 failures |
| 2 | TypeScript clean | `npx tsc --noEmit` | No errors |
| 3 | Build succeeds | `npm run build` | dist/ populated |
| 4 | Version | Check package.json | 0.7.0 |

---

## Part 2: Known Limitations

These are the documented issues to address in future versions:

### 2.1 Dataset Size (High Priority)

**Problem:** 17 samples with extracted features is insufficient for BiLSTM training.

**Evidence:**
```
trainSamples: 14
valSamples: 3
finalAccuracy: 84.6%
valAccuracy: 25%
```

3 validation samples = statistical noise.

**Plan:** See `specs/130-plano-evolucao-v08-v10.md` for detailed plan.

### 2.2 Overfitting (High Priority)

**Problem:** Validation loss increases while training loss decreases:
```
Epoch 1:  train loss 0.708, val loss 0.673
Epoch 20: train loss 0.627, val loss 0.694
```

The model memorizes training data but doesn't generalize.

**Plan:** Implement early stopping and K-fold cross-validation.

### 2.3 Fixed Threshold (Low Priority)

**Problem:** Labels use fixed 500ms threshold regardless of dataset distribution.

**Plan:** Implement adaptive threshold based on percentiles.

---

## Part 3: Evolution Roadmap

### 3.1 Immediate Opportunities (v0.8)

#### A. Benchmark Command

**What:** Execute queries multiple times and measure real execution times.

**Why:** Current dataset has fabricated execution times. Real timing data improves ML labels.

**Implementation:**
```bash
sql-sage benchmark <queries.sql> --iterations 10 --warmup 3 --output data/benchmarked.jsonl
```

#### B. Early Stopping

**What:** Stop training when validation loss stops improving.

**Why:** Prevents overfitting.

**Implementation:**
```bash
sql-sage train --early-stopping --patience 10
```

### 3.2 Medium-Term Enhancements (v0.9)

#### C. K-Fold Cross-Validation

**What:** Replace simple holdout with 5-fold CV.

**Why:** More robust validation with limited data.

#### D. Threshold Adaptativo

**What:** Calculate threshold based on dataset percentiles (e.g., p75, p90).

**Why:** Fixed 500ms doesn't fit all contexts.

#### E. More EXPLAIN Features

**What:** Extract more features from EXPLAIN: `type`, `possible_keys`, `extra` (filesort, temp table).

**Why:** Richer feature set = better predictions.

### 3.3 Long-Term (v1.0)

#### F. Pre-trained Model

**What:** Ship with baseline model trained on public datasets (Sakila, TPCH).

**Why:** Users can use immediately without collecting own data.

#### G. Precision/Recall Evaluation

**What:** Formal evaluation metrics on held-out test set.

**Why:** Know actual model performance.

---

## Part 4: Feature/Data Coverage Matrix

### 18 ML Features vs Query Complexity

| Feature | Simple Query | Medium Query | Complex Query |
|---|---|---|---|
| `hasJoin` | 0 | 1 | 1 |
| `joinCount` | 0 | 1-2 | 3+ |
| `hasSubquery` | 0 | 0-1 | 1+ |
| `subqueryCount` | 0 | 0-1 | 2+ |
| `hasFunctionInWhere` | 0 | 0-1 | 1 |
| `selectStar` | 0-1 | 0-1 | 0-1 |
| `tableCount` | 1 | 2-3 | 4+ |
| `whereColumnsIndexed` | 0-1 | 0-1 | 0 |
| `estimatedRows` | low | medium | high |
| `hasOr` | 0 | 0-1 | 1+ |
| `hasUnion` | 0 | 0-1 | 1 |
| `hasLike` | 0 | 0-1 | 0-1 |
| `hasCountStar` | 0 | 0-1 | 0-1 |
| `nestedJoinDepth` | 0 | 0-1 | 1-2 |
| `hasGroupBy` | 0 | 0-1 | 1 |
| `hasOrderBy` | 0 | 0-1 | 1 |
| `hasLimit` | 1 | 0-1 | 0 |
| `orConditionCount` | 0 | 0-1 | 2+ |

### Heuristic Rules vs Severity

| Rule | Severity | Penalty |
|---|---|---|
| `no-where-mutation` | CRITICAL | -30 |
| `cartesian-product` | HIGH | -25 |
| `join-no-on` | HIGH | -25 |
| `subquery-in-where` | HIGH | -20 |
| `leading-wildcard` | MEDIUM | -15 |
| `function-on-column` | MEDIUM | -15 |
| `deep-subquery` | MEDIUM | -15 |
| `select-star-join` | LOW | -10 |
| `or-different-columns` | LOW | -10 |
| `count-no-where` | LOW | -10 |
| `too-many-joins` | LOW | -10 |
| `distinct-order-by` | LOW | -10 |
| `no-limit` | MINIMAL | -5 |
| `or-to-in` | MINIMAL | -5 |
| `union-without-all` | MINIMAL | -5 |

---

## Part 5: Data Flow Summary

```
                          CLI Input
                             |
                    [SQL file or query]
                             |
              resolveConnectionConfig()
              CLI flags > .env > defaults
                             |
                    +--------+--------+
                    |                 |
              No database       Has database
              (offline)         (live mode)
                    |                 |
                    |        createConnector()
                    |        MysqlConnector
                    |                 |
                    |        +-------+-------+
                    |        |               |
                    |   connector.explain()  connector.getCatalogInfo()
                    |   -> IExecutionPlan[]  -> ICatalogInfo
                    |        |               |
                    +--------+-------+-------+
                             |
                  MLPredictionService.predict(sql, connector?)
                             |
                  MLQueryEngine.processQuery(sql, plan?, catalog?)
                             |
               +------------+------------+
               |            |            |
         HeuristicEngine  FeatureExtractor  QueryPerformancePredictor
         (15 rules)       (18 features)     (BiLSTM + weights)
               |            |            |
            score*0.6    features     mlScore*0.4
               |            |            |
               +-----+------+------+-----+
                     |             |
               finalScore      insights[]
                     |             |
               MLPredictionResponse
               {performanceScore, insights, features,
                mlAvailable, liveExplain, liveCatalog}
```

---

## Appendix: Quick Reference Commands

```bash
# Analyze (offline — heuristics only)
npm run dev -- analyze data/examples/ecommerce-queries.sql --verbose

# Analyze (live — with EXPLAIN + catalog)
npm run dev -- analyze data/examples/ecommerce-queries.sql \
  --host localhost --port 3316 --user root \
  --password sqlsage_root_pass --database ecommerce_demo --verbose

# Full pipeline
npm run dev -- collect data/examples/ecommerce-queries.sql
npm run dev -- features
npm run dev -- train --epochs 20
npm run dev -- analyze data/examples/ecommerce-queries.sql -o report.json

# Status
npm run dev -- status --host localhost --port 3316 --user root \
  --password sqlsage_root_pass --database ecommerce_demo

# Train
npm run dev -- train --epochs 50 --batch-size 32

# Train with custom threshold
npm run dev -- train --epochs 50 --slow-threshold 1000

# Tests
npm test                         # All 345 tests
npm run test:unit                # Unit only
npm run test:e2e                 # E2E pipeline only
npx tsc --noEmit                 # Type check

# Infrastructure
npm run db:up                    # Start MySQL container
npm run db:down                  # Stop container
npm run db:seed                  # Populate demo data
npm run db:reset                 # Destroy + recreate
```

---

## References

- Previous validation: `specs/110-validation-and-evolution.md` (v0.5.0)
- Technical audit: `specs/100-auditoria-tecnica-v02.md` (v0.2)
- Evolution plan: `specs/130-plano-evolucao-v08-v10.md`
- Latest audit: `specs/120-auditoria-tecnica-v07.md`
