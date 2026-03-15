---
title: CLI Reference
nav_order: 4
---

# CLI Reference

## analyze

Analyze a SQL file and return a performance score, insights, and extracted features.

**When to use:** validating a query before it reaches production or as part of CI checks.

**Inputs:** a `.sql` file (single query is best).

```bash
sql-sage analyze <file.sql>
sql-sage analyze <file.sql> --verbose
sql-sage analyze <file.sql> --output result.json
```

Key flags:

- `--output`: write JSON output to a file
- `--verbose`: include ML engine status and extra diagnostics
- `--host/--port/--user/--password/--database`: enable live EXPLAIN and catalog lookups

Expected output:

- `performanceScore` (0..1)
- `insights[]` (heuristic findings)
- `features` (structural features)

## collect

Collect queries from a file, slow log, or database source.

**When to use:** building a dataset for training or feature extraction.

**Outputs:** `data/queries.jsonl` (default).

```bash
sql-sage collect data/examples/ecommerce-queries.sql
sql-sage collect --input /var/log/mysql/slow.log
sql-sage collect --source db --host localhost --port 3316 --user root --password pass --database mydb
```

Key flags:

- `--input`: slow log path
- `--source db`: collect from database via `performance_schema`
- `--limit`: cap number of collected queries
- `--min-time`: filter by execution time

## features

Extract 18 structural features from collected queries.

**When to use:** after collection, before training.

**Outputs:** `data/features.jsonl` (default).

```bash
sql-sage features
sql-sage features --input data/queries.jsonl --output data/features.jsonl
```

Expected output:

- Feature statistics summary in the CLI

## train

Train the BiLSTM model with extracted features.

**When to use:** after `features`, to generate a trained model.

**Outputs:** model artifacts in `models/`.

```bash
sql-sage train
sql-sage train --epochs 100 --batch-size 64
```

Key flags:

- `--epochs`: number of epochs
- `--batch-size`: batch size
- `--validation-split`: validation ratio
- `--learning-rate`: optimizer learning rate

## status

Show ML engine status and database connection info.

**When to use:** verify the engine is ready and model is loaded.

```bash
sql-sage status
```

## Global connection flags

Available in all commands. Priority: CLI flags > env vars > defaults.

```bash
--host <host> --port <port> --user <user> --password <pass> --database <name> --engine <engine> --ssl
```
