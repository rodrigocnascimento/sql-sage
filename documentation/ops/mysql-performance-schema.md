---
title: MySQL Performance Schema
parent: Operations
nav_order: 2
---

# MySQL Performance Schema

Recommended MySQL configuration for collecting query data.

```ini
performance_schema=ON
performance-schema-instrument='%=ON'
performance-schema-consumer-events-statements-history=ON
performance-schema-consumer-events-statements-history-long=ON
performance-schema-consumer-events-statements-current=ON
```

## Validate

```sql
SHOW VARIABLES LIKE 'performance_schema';
SELECT * FROM performance_schema.setup_consumers;
```
