---
title: End-to-End Tutorial
nav_order: 3
---

# End-to-End Tutorial

This tutorial walks through the full pipeline: collect queries, extract features, train the model, and analyze SQL.

## Overview

```
collect -> features -> train -> analyze
```

## 1) Collect queries

### From a SQL file

```bash
sql-sage collect data/examples/ecommerce-queries.sql
```

Expected:
- `data/queries.jsonl` created
- CLI reports how many queries were added

### From slow query log (optional)

```bash
sql-sage collect --input /var/log/mysql/slow.log
```

## 2) Extract features

```bash
sql-sage features
```

Expected:
- `data/features.jsonl` created
- CLI prints statistics (JOIN count, subqueries, SELECT * usage)

## 3) Train the model

```bash
sql-sage train
```

Expected:
- Training output with loss/accuracy per epoch
- Artifacts under `models/`

## 4) Analyze a query

```bash
sql-sage analyze my-query.sql --verbose
```

Expected:
- `performanceScore` between 0 and 1
- `insights[]` list with heuristic findings
- `features` object with extracted values

## What to check

- Use `data/queries.jsonl` and `data/features.jsonl` for pipeline inputs
- Validate `models/` contains the latest `training-result-*.json`
- For complex SQL, expect lower scores and more insights

## Troubleshooting

- **No data to train:** ensure at least 10 records in `data/features.jsonl`
- **Missing insights:** confirm the query triggers known heuristic rules
- **Slow log parsing:** verify MySQL slow log format and permissions

## Related pages

- [CLI reference](cli.md)
- [Pipeline overview](pipeline.md)
- [Testing guide](testing.md)
