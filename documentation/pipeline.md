---
title: Pipeline Overview
nav_order: 5
---

# Pipeline Overview

SQL Sage runs in four steps: collect, extract features, train, and analyze.

```
collect -> features -> train -> analyze
```

## 1. Collect queries

```bash
sql-sage collect --input /var/log/mysql/slow.log
sql-sage collect --query "SELECT * FROM users WHERE id = 1" --time 5 --database mydb
```

## 2. Extract features

```bash
sql-sage features
```

## 3. Train the model

```bash
sql-sage train
sql-sage train --epochs 100 --batch-size 64
```

## 4. Analyze a query

```bash
sql-sage analyze my-query.sql
sql-sage analyze my-query.sql --output result.json
```

## Data artifacts

```
data/
  queries.jsonl
  features.jsonl
models/
  model-v<timestamp>.json
  training-result-v<timestamp>.json
```
