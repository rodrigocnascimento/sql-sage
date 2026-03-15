# MySQL Performance Schema - Configurações Ideais

## Parâmetros Obrigatórios

### Performance Schema

```ini
performance_schema=ON
performance-schema-instrument='%=ON'
performance-schema-consumer-events-statements-history=ON
performance-schema-consumer-events-statements-history-long=ON
performance-schema-consumer-events-statements-current=ON
```

### Explicação

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `performance_schema` | ON | Ativa o Performance Schema |
| `performance-schema-instrument` | %=ON | Instrumenta todas as statements |
| `performance-schema-consumer-events-statements-current` | ON | Armazena statements atuais |
| `performance-schema-consumer-events-statements-history` | ON | Armazena últimas ~10.000 statements |
| `performance-schema-consumer-events-statements-history-long` | ON | Statements longas (opcional) |

---

## Parâmetros Opcionais (Avançados)

### Para coleta de queries longas

```ini
# Aumenta tamanho do history
performance_schema_events_statements_history_size=10000
performance_schema_events_statements_history_long_size=100000

# Para monitoring em produção
performance_schema_max_sql_text_length=1024
performance_schema_max_digest_length=512
```

### Para statements history com user/statement

```ini
performance-schema-consumer-events-statements-history-etl=ON
```

---

## Docker Compose Exemplo

```yaml
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: rh_app
    command:
      - --performance-schema=ON
      - --performance-schema-instrument='%=ON'
      - --performance-schema-consumer-events-statements-history=ON
      - --performance-schema-consumer-events-statements-history-long=ON
      - --performance-schema-consumer-events-statements-current=ON
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## Verificar se está Ativo

```sql
-- Verificar status
SHOW VARIABLES LIKE 'performance_schema';

-- Verificar consumers ativos
SELECT * FROM performance_schema.setup_consumers;

-- Verificar instrumentos
SELECT name, enabled 
FROM performance_schema.setup_instruments 
WHERE name LIKE 'statement/%' 
LIMIT 10;
```

---

## Tabelas Principais para Consulta

| Tabela | Uso |
|--------|-----|
| `performance_schema.events_statements_summary_by_digest` | Queries agregadas por digest |
| `performance_schema.events_statements_history` | Histórico de queries |
| `performance_schema.events_statements_current` | Queries em execução |

---

## Configuração Mínima para sql-sage

```sql
-- Query básica para coletar queries
SELECT 
  DIGEST AS id,
  DIGEST_TEXT AS query,
  ROUND(SUM_TIMER_WAIT / 1000000000, 2) AS executionTimeMs,
  COUNT_STAR AS executions,
  SCHEMA_NAME AS `database`
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT IS NOT NULL
  AND SCHEMA_NAME IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 100;
```
