# TDD: E-commerce Demo Database

**Issue:** ISSUE-060
**Branch:** `feat/ISSUE-060-ecommerce-demo-db`
**Target:** `specs/tdd-ecommerce-demo-db.md`

---

## 1. Objective & Scope

### What
Create a self-contained e-commerce demo database environment for sql-sage, consisting of:
1. Docker Compose running MySQL 8.0 with `performance_schema` enabled
2. DDL schema with 7 interrelated tables and strategic index placement
3. TypeScript seed script with configurable data volume
4. Curated bank of ~50 SQL queries organized by quality tier (good/medium/bad)

### Why
- Current example data (10 synthetic queries in `data/examples/queries.jsonl`) cannot be run against a real database
- v0.5.0 connector features (live EXPLAIN, INFORMATION_SCHEMA catalog, performance_schema collection) need a real MySQL instance
- Two ML features (`estimatedRows`, `whereColumnsIndexed`) produce zero signal without real execution plans and catalog data
- Training the model on queries with real EXPLAIN data will improve prediction quality

### Non-goals
- Not a production schema — optimized for demonstrating sql-sage
- No application code (API, ORM)
- No migration system — plain SQL DDL loaded by Docker entrypoint

---

## 2. Proposed Technical Strategy

### 2.1 Docker Compose
- Image: `mysql:8.0`, port `3316:3306`
- Database: `ecommerce_demo`, user: `root` / `sqlsage_root_pass`
- `performance_schema=ON` via command args
- Init scripts mounted via `/docker-entrypoint-initdb.d/`
- Named volume for data persistence
- Health check via `mysqladmin ping`

### 2.2 Schema (7 tables)
```
customers --< orders --< order_items >-- products >-- categories
               |
               +--< payments
customers --< reviews >-- products
```

Strategic index gaps (intentional):
- `products.name` — no index (forces full scan on LIKE '%...%')
- `reviews.rating` — no index (forces full scan on rating filter)
- `orders.total_amount` — no index (demonstrates whereColumnsIndexed = 0)

### 2.3 Seed Script (`docker/seed/seed.ts`)
- TypeScript with `mysql2/promise` (already a project dependency)
- `--scale N` flag (default 1000): ~N customers, ~5N orders
- Realistic distributions for prices, order status, ratings, payment methods
- Batch INSERT (500 rows) for performance
- Idempotent (truncates before seeding)

### 2.4 Query Bank (`data/examples/ecommerce-queries.sql`)
- ~50 queries in 3 tiers covering all 15 heuristic rules and all 18 ML features
- Each query annotated with tier and targeted rules/features

---

## 3. Implementation Plan

### Phase 1: Docker Infrastructure
- `docker/docker-compose.yml`
- `docker/init/01-schema.sql`
- `docker/.env.docker`
- `.gitignore` update
- `package.json` npm scripts

### Phase 2: Seed Script
- `docker/seed/seed.ts`

### Phase 3: Query Bank
- `data/examples/ecommerce-queries.sql`

### Phase 4: Validation
- Docker up + seed + analyze with live DB
- Existing test suite (329 tests) must still pass

---

## Approval
Approved by developer on 2026-03-06.
