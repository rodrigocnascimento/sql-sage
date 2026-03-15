---
title: Getting Started
nav_order: 2
---

# Getting Started

This page covers development setup. If you want to use SQL Sage as a CLI, install from npm.

## Install from npm

```bash
npm install -g sql-sage
```

Run the CLI:

```bash
sql-sage analyze my-query.sql
```

## Prerequisites

- Node.js >= 18
- Docker and Docker Compose (optional, for the demo database)

## Development setup

```bash
git clone https://github.com/rodrigocnascimento/sql-sage.git
cd sql-sage
npm install
npm run build
```

## Run a quick analysis (dev)

```bash
sql-sage analyze my-query.sql
```

## Full pipeline with the demo database

```bash
# 1. Start MySQL demo container
npm run db:up

# 2. Seed demo data
npm run db:seed

# 3. Configure connection
cp docker/.env.docker .env

# 4. Collect queries from a sample file
sql-sage collect data/examples/ecommerce-queries.sql

# 5. Extract features
sql-sage features

# 6. Train model
sql-sage train

# 7. Analyze with heuristics + ML
sql-sage analyze my-query.sql --verbose
```

## Common scripts

```bash
npm run dev       # Run with tsx (development)
npm run build     # Compile TypeScript
npm run start     # Run compiled JavaScript
npm run test      # Run tests once
```

## Next step

- [End-to-end tutorial](tutorial.md)
