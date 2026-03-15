---
title: FeatureExtractor
parent: ML Architecture
nav_order: 6
---

# FeatureExtractor (v0.2)

Extracts 18 structural features used by the training pipeline.

## How it works

FeatureExtractor parses SQL and enriches results with optional execution plan and catalog data when available.

## Examples

- JOIN presence and count
- Subquery presence and count
- SELECT * detection
- OR and UNION detection
- GROUP BY / ORDER BY flags

## Inputs and outputs

- Input: SQL string (optionally with execution plan and catalog info)
- Output: a normalized feature object plus numeric array representation
