---
title: SQLFeatureEngineer
parent: ML Architecture
nav_order: 2
---

# SQLFeatureEngineer

Tokenizes SQL queries and extracts structural features for real-time prediction.

## Flow

```mermaid
flowchart LR
  A[SQL text] --> B[Tokenize]
  B --> C[Vocabulary map]
  C --> D[Structural features]
  D --> E[Normalize]
```

## Responsibilities

- Tokenize SQL into a fixed-length sequence
- Extract lightweight structural features for inference
- Normalize values to a 0..1 range

## Features (v0.1)

Examples include join count, subquery depth, and LIKE wildcard risk.

## Inputs and outputs

- Input: raw SQL string
- Output: token sequence + feature vector
