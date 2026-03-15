---
title: Model Training
parent: ML Architecture
nav_order: 7
---

# Model Training

The training pipeline builds and fits the BiLSTM model using token sequences and meta features.

## Steps

1. Load `features.jsonl`
2. Build tensors for tokens and meta features
3. Train the model and track metrics
4. Save model topology and training results

## Inputs

- Token sequence (20 tokens)
- 18 extracted features

## Output artifacts

- model JSON (topology)
- training result JSON (metrics)

## Notes

- Ensure at least 10 samples before training
- Use larger datasets for meaningful accuracy
