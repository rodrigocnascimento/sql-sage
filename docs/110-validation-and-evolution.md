# Validation Checklist & CLI Evolution Roadmap

> Post v0.5.0 + E-commerce Demo — Assessment Document

## Current State (v0.5.0)

| Component | Status | Branch |
|---|---|---|
| Pluggable DB connector (`IDatabaseConnector`) | Merged to `main` | `feat/ISSUE-050-real-db-connector` (PR #1) |
| E-commerce demo DB (Docker + seed + queries) | Validated, pending release | `feat/ISSUE-060-ecommerce-demo-db` |
| Test suite | 329 tests, 15 files, 0 failures | — |

### What v0.5.0 Unlocked

Before v0.5.0, the CLI operated in **static analysis only** mode. Two of the 18 ML features were dead:

| Feature | Before | After |
|---|---|---|
| `estimatedRows` | Always 0 (no execution plan) | Normalized from `IExecutionPlan.rowsExamined` via live `EXPLAIN` |
| `whereColumnsIndexed` | Always 0 (no catalog info) | Resolved from `INFORMATION_SCHEMA.STATISTICS` via `getCatalogInfo()` |

The e-commerce demo provides the infrastructure to exercise these features with real data.

---

## Part 1: Validation Checklist

### 1.1 Infrastructure Validation

These confirm the Docker + MySQL + seed pipeline is functional:

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Container starts and is healthy | `npm run db:up` then `docker ps` | `sqlsage-mysql` status: `Up ... (healthy)` |
| 2 | Schema is created on init | `docker exec sqlsage-mysql mysql -uroot -psqlsage_root_pass ecommerce_demo -e "SHOW TABLES"` | 7 tables: `categories`, `customers`, `order_items`, `orders`, `payments`, `products`, `reviews` |
| 3 | Seed script populates data | `npm run db:seed -- --host localhost --port 3316 --user root --password sqlsage_root_pass --database ecommerce_demo` | ~26K rows total (scale=1000) |
| 4 | `performance_schema` is ON | `docker exec sqlsage-mysql mysql -uroot -psqlsage_root_pass -e "SHOW VARIABLES LIKE 'performance_schema'"` | `ON` |
| 5 | Container reset is clean | `npm run db:reset` then repeat seed | Same counts, no duplicates (idempotent) |

### 1.2 Connector Layer Validation (Live)

These prove the v0.5.0 connector works against the real Docker DB:

| # | Check | Command | What to Observe |
|---|---|---|---|
| 6 | `status` shows DB connection | `npm run dev -- status --host localhost --port 3316 --user root --password sqlsage_root_pass --database ecommerce_demo` | Output includes connection info, table list, engine status |
| 7 | `analyze` with live EXPLAIN | `npm run dev -- analyze data/examples/ecommerce-queries.sql --host localhost --port 3316 --user root --password sqlsage_root_pass --database ecommerce_demo --verbose` | `liveExplain: true`, `estimatedRows > 0` for queries against populated tables |
| 8 | `analyze` with live catalog | Same as #7 | `liveCatalog: true`, `whereColumnsIndexed` reflects actual index coverage |
| 9 | `collect --source db` | `npm run dev -- collect --source db --host localhost --port 3316 --user root --password sqlsage_root_pass --database ecommerce_demo` | Collects queries from `performance_schema.events_statements_summary_by_digest` |
| 10 | `analyze` without DB (graceful fallback) | `npm run dev -- analyze data/examples/ecommerce-queries.sql` | Works in heuristic-only mode, `liveExplain: false`, `liveCatalog: false` |

### 1.3 ML Feature Signal Validation

The core question: **do the 2 previously dead features now carry real signal?**

| # | Check | How to Validate |
|---|---|---|
| 11 | `estimatedRows` is non-zero | Run `analyze` with `--verbose` on a query like `SELECT * FROM orders` (5000 rows). The `estimatedRows` feature should be > 0, reflecting actual `rowsExamined` from EXPLAIN |
| 12 | `whereColumnsIndexed` differentiates indexed vs unindexed | Compare: (a) `SELECT * FROM orders WHERE customer_id = 1` (indexed) vs (b) `SELECT * FROM orders WHERE total_amount > 100` (no index on `total_amount`). Feature should be 1 for (a) and 0 for (b) |
| 13 | Feature vector completeness | Run `analyze` with `--verbose -o /tmp/result.json` and inspect the `features` object. All 18 features should be present and the 2 previously dead ones should have non-zero values for appropriate queries |

### 1.4 Query Bank Coverage Validation

Confirm the 50-query bank exercises the full analysis surface:

| # | Check | How to Validate |
|---|---|---|
| 14 | All 15 heuristic rules triggered | Run `analyze` on `data/examples/ecommerce-queries.sql` with `--verbose`. Collect all unique rule IDs from insights across all 50 queries. Should include all 15 rule IDs (see table below) |
| 15 | Tier score distribution | TIER 1 (good) queries: score 70-100%. TIER 2 (medium): 40-70%. TIER 3 (bad): 0-40%. If distribution doesn't match, it reveals calibration issues |
| 16 | All 18 ML features activated | Across the 50 queries, every ML feature should have at least one non-zero occurrence |

**15 Heuristic Rules (reference):**

| Rule ID | Trigger |
|---|---|
| `cartesian-product` | Comma-join without WHERE join condition |
| `leading-wildcard` | `LIKE '%...'` |
| `select-star-join` | `SELECT *` with JOIN |
| `no-where-mutation` | UPDATE/DELETE without WHERE |
| `or-different-columns` | OR across different columns |
| `function-on-column` | Function on column in WHERE |
| `subquery-in-where` | Subquery in WHERE |
| `no-limit` | SELECT without LIMIT |
| `count-no-where` | `COUNT(*)` without WHERE |
| `join-no-on` | JOIN without ON |
| `or-to-in` | 3+ OR on same column |
| `deep-subquery` | Subquery nesting > 2 |
| `union-without-all` | UNION without ALL |
| `too-many-joins` | More than 5 JOINs |
| `distinct-order-by` | DISTINCT with ORDER BY |

### 1.5 Full Pipeline Validation (collect -> features -> train -> analyze)

The end-to-end loop that proves the system works as a complete ML pipeline:

| # | Step | Command | What to Observe |
|---|---|---|---|
| 17 | Collect from file | `npm run dev -- collect data/examples/ecommerce-queries.sql` | Writes `data/queries.jsonl` with 50 records |
| 18 | Extract features | `npm run dev -- features` | Writes `.sqlsage/features.jsonl` with 50 feature vectors |
| 19 | Train model | `npm run dev -- train --epochs 20` | Model saved to `models/`, reports accuracy and loss metrics |
| 20 | Analyze with trained model | Repeat check #7 | `mlAvailable: true`, score combines heuristic (60%) + ML (40%) |

### 1.6 Regression Checks

| # | Check | Command | Expected |
|---|---|---|---|
| 21 | Unit + integration tests pass | `npm test` | 345 tests, 0 failures |
| 22 | TypeScript compiles clean | `npx tsc --noEmit` | No errors |
| 23 | Build succeeds | `npm run build` | `dist/` directory populated, no errors |
| 24 | Original example queries still work | `npm run dev -- analyze data/examples/queries.jsonl` | Produces valid analysis output |

---

## Part 2: CLI Evolution Roadmap

### 2.1 Immediate Opportunities (Low Effort, High Value)

These are enabled directly by v0.5.0 + e-commerce demo with minimal code changes:

#### A. Train on Real Data with Live EXPLAIN

**What:** Use `collect --source db` to gather queries from `performance_schema` (with actual execution times), then `features` + `train` to build a model from real performance data.

**Why:** The current training data is synthetic (hardcoded `executionTimeMs` in JSONL). Real `performance_schema` data gives actual execution times, making the slow/fast labels accurate instead of fabricated.

**Impact:** Model accuracy improves because labels reflect real database behavior, not guesses.

#### B. Batch Analysis with JSON Report

**What:** `analyze` already supports `-o output.json`. Run it against the full 50-query bank with live DB and produce a structured report showing per-query scores, insights, and feature vectors.

**Why:** Creates a baseline benchmark. Every future change to heuristics or ML model can be measured against this snapshot.

**Impact:** Enables regression detection for analysis quality (not just code correctness).

#### C. Index Gap Detection Report

**What:** The schema intentionally has missing indexes on `products.name`, `reviews.rating`, `orders.total_amount`, `customers.phone`. When `whereColumnsIndexed = 0` for queries filtering on these columns, the analyzer correctly flags them.

**Why:** Demonstrates practical DBA value — the tool can identify real indexing gaps from production queries.

**Impact:** Validates the tool's usefulness beyond academic ML scoring.

### 2.2 Medium-Term Enhancements (Feature Work)

#### D. PostgreSQL Connector

**What:** Implement `PostgresConnector` conforming to `IDatabaseConnector`. The interface is already defined; `createConnector()` just needs a new `case 'postgresql'`.

**Scope:**
- Map PostgreSQL's `EXPLAIN (FORMAT JSON)` output to `IExecutionPlan`
- Query `pg_catalog.pg_stats` and `pg_indexes` for `ICatalogInfo`
- Query `pg_stat_statements` for `collectRecentQueries()`

**Why:** PostgreSQL is arguably the most requested engine. The connector architecture makes this additive — zero changes to the ML pipeline.

#### E. `compare` Command

**What:** New CLI command: `sql-sage compare --before <baseline.json> --after <current.json>` that diffs two analysis reports and highlights score regressions, new anti-patterns, or resolved issues.

**Why:** Useful in CI/CD pipelines — run `analyze` on PR SQL changes and compare against `main` baseline.

#### F. Confidence Scoring

**What:** Add a `confidence` field to `MLPredictionResponse` that indicates how much data backs the prediction. When running without live EXPLAIN/catalog (2 dead features), confidence is lower. When running with full connector data, confidence is higher.

**Why:** Users need to know whether a score is based on full data or partial heuristics. Currently `mlAvailable`, `liveExplain`, and `liveCatalog` are booleans — a single confidence percentage would be more actionable.

#### G. `explain` Command

**What:** New CLI command: `sql-sage explain <file.sql> --host ... --database ...` that runs each query through `EXPLAIN` and presents a human-readable interpretation of the execution plan (access type, index usage, rows examined, join order).

**Why:** The infrastructure exists (`MysqlConnector.explain()` + `ExplainParser`). Surfacing it as a standalone command adds immediate DBA utility without touching the ML layer.

### 2.3 Long-Term Architecture (Major Releases)

#### H. Model Retraining Pipeline

**What:** Automated loop: `collect --source db --schedule daily` -> `features` -> `train` -> hot-reload model. The model continuously improves from production query patterns.

**Why:** Static one-time training degrades as schema and query patterns evolve. Continuous learning keeps the model relevant.

#### I. Plugin System for Custom Rules

**What:** Allow users to define custom heuristic rules in a `.sqlsage/rules/` directory (JavaScript/TypeScript files conforming to an `IHeuristicRule` interface). The engine loads and applies them alongside built-in rules.

**Why:** Different teams have different SQL standards. A `no-select-star` rule might be critical for one team and irrelevant for another.

#### J. Multi-Database Workspace

**What:** Support multiple database connections in a single `.sqlsage/config.yml`. Each connection can have its own schema, indexes, and performance characteristics. The analyzer automatically routes queries to the appropriate connection.

**Why:** Real projects often use multiple databases (read replicas, analytics DB, OLTP vs OLAP). The connector pattern already supports this — it just needs configuration and routing.

---

## Part 3: Feature/Data Coverage Matrix

Cross-reference of which demo queries exercise which ML features and heuristic rules:

### 18 ML Features vs Query Tiers

| Feature | TIER 1 (Good) | TIER 2 (Medium) | TIER 3 (Bad) |
|---|---|---|---|
| `hasJoin` | Yes (efficient JOINs) | Yes (partial) | Yes (cartesian) |
| `joinCount` | 1-2 | 2-3 | 3-6+ |
| `hasSubquery` | No | Some | Yes (deep nesting) |
| `subqueryCount` | 0 | 0-1 | 1-3+ |
| `hasFunctionInWhere` | No | Some | Yes |
| `selectStar` | No | Some | Yes |
| `tableCount` | 1-2 | 2-3 | 3-7+ |
| `whereColumnsIndexed` | 1 (indexed) | Mixed | 0 (unindexed) |
| `estimatedRows` | Low | Medium | High (full scans) |
| `hasOr` | No | Some | Yes |
| `hasUnion` | No | Some | Yes |
| `hasLike` | No | Yes (exact) | Yes (leading %) |
| `hasCountStar` | No | Some | Yes |
| `nestedJoinDepth` | 0 | 0-1 | 1-3+ |
| `hasGroupBy` | Some | Yes | Yes |
| `hasOrderBy` | Some | Yes | Yes |
| `hasLimit` | Yes | Some | No |
| `orConditionCount` | 0 | 0-1 | 2-5+ |

### Schema Index Gaps (Intentional)

These columns have NO index, causing full table scans when filtered:

| Table | Column | Queries That Trigger Full Scan |
|---|---|---|
| `products` | `name` | `WHERE name LIKE '%...'` |
| `reviews` | `rating` | `WHERE rating > N` |
| `orders` | `total_amount` | `WHERE total_amount > N` |
| `customers` | `phone` | `WHERE phone = '...'` |

These gaps are intentional — they validate that `whereColumnsIndexed = 0` when it should be, and that the analyzer flags the performance impact.

---

## Part 4: Data Flow Summary

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
        (15 rules)       (18 features)     (BiLSTM, if trained)
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
# Infrastructure
npm run db:up                    # Start MySQL container
npm run db:down                  # Stop container
npm run db:reset                 # Destroy + recreate (clean slate)
npm run db:seed -- --host localhost --port 3316 --user root \
  --password sqlsage_root_pass --database ecommerce_demo

# Analysis (offline — heuristics only)
npm run dev -- analyze data/examples/ecommerce-queries.sql --verbose

# Analysis (live — with EXPLAIN + catalog)
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

# Tests
npm test                         # All 329 tests
npm run test:unit                # Unit only (excludes e2e)
npm run test:e2e                 # E2E pipeline only
npx tsc --noEmit                 # Type check
```
