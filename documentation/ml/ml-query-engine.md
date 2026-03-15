---
title: MLQueryEngine
parent: ML Architecture
nav_order: 4
---

# MLQueryEngine

Orchestrates feature extraction, schema context, and model inference.

## Responsibilities

- Initialize ML model
- Process SQL queries into vectors
- Return performance score and insights

## Data flow

```mermaid
flowchart LR
  A[SQL input] --> B[Tokenizer + features]
  B --> C[Model inference]
  C --> D[Score + insights]
```

## Inputs

- SQL string
- Optional schema context (DDL)
- Optional live EXPLAIN and catalog data

## Outputs

- `performanceScore`
- `insights[]`
- `features`
