---
title: CLI Reference
nav_order: 3
---

# CLI Reference

## analyze

Analyze a SQL file and output performance score, insights, and extracted features.

```bash
sql-sage analyze <file.sql>
sql-sage analyze <file.sql> --verbose
sql-sage analyze <file.sql> --output result.json
```

## collect

Collect queries from a file, slow log, or database source.

```bash
sql-sage collect data/examples/ecommerce-queries.sql
sql-sage collect --input /var/log/mysql/slow.log
sql-sage collect --source db --host localhost --port 3316 --user root --password pass --database mydb
```

## features

Extract 18 structural features from collected queries.

```bash
sql-sage features
sql-sage features --input data/queries.jsonl --output data/features.jsonl
```

## train

Train the BiLSTM model with extracted features.

```bash
sql-sage train
sql-sage train --epochs 100 --batch-size 64
```

## status

Show ML engine status and database connection info.

```bash
sql-sage status
```

## Global connection flags

Available in all commands. Priority: CLI flags > env vars > defaults.

```bash
--host <host> --port <port> --user <user> --password <pass> --database <name> --engine <engine> --ssl
```
