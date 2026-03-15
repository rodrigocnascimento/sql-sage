---
title: Getting Started
nav_order: 2
---

# Getting Started

## Prerequisites

- Node.js >= 18
- Docker and Docker Compose (optional, for the demo database)

## Install

```bash
git clone https://github.com/rodrigocnascimento/sql-sage.git
cd sql-sage
npm install
npm run build
```

## Run a quick analysis

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
