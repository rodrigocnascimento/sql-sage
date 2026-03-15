---
title: SchemaRegistry
parent: ML Architecture
nav_order: 3
---

# SchemaRegistry

Stores table definitions to provide schema context and index awareness.

## How it works

SchemaRegistry parses DDL statements and keeps a lightweight in-memory map of tables, columns, and indexes. The ML pipeline uses this to detect missing indexes and improve insight accuracy.

## Capabilities

- Register DDL and parse columns, primary keys, and indexes
- Check if a column is indexed

## Key methods

- `registerTable(ddl)`
- `isIndexed(table, column)`
- `getStats()`

## Example

```ts
const registry = new SchemaRegistry();
registry.registerTable('CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(120), INDEX idx_email (email))');

registry.isIndexed('users', 'email'); // true
```
