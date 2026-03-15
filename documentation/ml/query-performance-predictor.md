---
title: QueryPerformancePredictor
parent: ML Architecture
nav_order: 1
---

# QueryPerformancePredictor

Core ML model that predicts SQL performance and produces insights based on structural features.

## Model shape

```
Input (token_sequence) -> Embedding -> BiLSTM
                                         \
Input (structural_features) -> Dense ----> Concatenate -> Dense -> Dense (output)
```

## Output

- `performanceScore`: 0 to 1
- `insights`: heuristic insights based on key structural features
