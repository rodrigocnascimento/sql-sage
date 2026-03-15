---
title: Daemon
parent: Operations
nav_order: 1
---

# Daemon

The daemon runs SQL Sage in the background to collect queries and trigger training.

## Quick start

```bash
sql-sage daemon start --database myapp
sql-sage daemon status
```

## Key commands

- `daemon start` / `stop` / `restart`
- `daemon status` / `metrics` / `alerts` / `history`
- `daemon report` to generate HTML output

## State files

The daemon persists state under `.sqlsage/`:

```
.sqlsage/
  state.json
  history.json
```
