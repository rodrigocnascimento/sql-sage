---
title: SQLFeatureEngineer
parent: ML Architecture
nav_order: 2
---

# SQLFeatureEngineer

Tokenizes SQL queries and extracts structural features for real-time prediction.

## Flow

```
SQL -> Tokenize -> Vocabulary map -> Structural features -> Normalize
```

## Features (v0.1)

Examples include join count, subquery depth, and LIKE wildcard risk.
