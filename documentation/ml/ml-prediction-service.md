---
title: MLPredictionService
parent: ML Architecture
nav_order: 5
---

# MLPredictionService

High-level service that wraps MLQueryEngine and formats output for the CLI.

## How it works

This service initializes the ML engine, runs inference, and normalizes the output for CLI and JSON consumers.

## Typical output

- performance score
- insights list
- extracted features
- tokens preview

## Inputs

- SQL string
- Optional schema context
- Optional connector for live EXPLAIN and catalog

## Output shape

- `performanceScore` (0..1)
- `insights[]`
- `features`
- `tokens`
