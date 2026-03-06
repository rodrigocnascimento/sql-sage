# Workflow Completo

## Visao Geral

O `sql-ml-cli` opera em um pipeline de 4 etapas: coleta de dados, extracao de features, treinamento do modelo e analise de queries.

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌─────────┐
│ collect  │ ──→ │ features │ ──→ │  train  │ ──→ │ analyze │
└─────────┘     └──────────┘     └─────────┘     └─────────┘
  Slow Log       queries.jsonl   features.jsonl    Modelo ML
  Query Manual                                     treinado
```

## Etapa 1: Coletar Queries

### De Slow Query Log

A fonte mais rica de dados. Configure o MySQL para gerar slow query logs:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- queries > 1 segundo
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

Depois importe:

```bash
sql-ml collect --input /var/log/mysql/slow.log
```

### Manualmente

Para queries conhecidas que voce quer incluir no dataset:

```bash
# Query lenta conhecida
sql-ml collect \
  --query "SELECT * FROM orders WHERE status = 'pending'" \
  --time 3500 \
  --database production

# Query rapida para balancear o dataset
sql-ml collect \
  --query "SELECT id, name FROM users WHERE id = 42" \
  --time 5 \
  --database production
```

### Verificar Dados Coletados

```bash
wc -l data/queries.jsonl     # Numero de queries
head -1 data/queries.jsonl   # Primeira query (JSON)
```

**Minimo recomendado:** 10 queries (minimo tecnico), mas quanto mais dados, melhor o treinamento. Ideal: 100+ queries com variedade de tempos de execucao.

## Etapa 2: Extrair Features

Processa cada query coletada e extrai as 18 features estruturais:

```bash
sql-ml features
```

Isso le `data/queries.jsonl` e gera `data/features.jsonl` com as features adicionadas a cada registro.

### Verificar Features

```bash
# Ver estatisticas
sql-ml features

# Saida esperada:
# [Features] Loaded 150 queries
# [Features] Statistics:
#   Total queries: 150
#   With JOIN: 45
#   With Subquery: 12
#   With SELECT *: 23
#   Avg execution time: 342.50ms
```

## Etapa 3: Treinar o Modelo

Com as features extraidas, treinar o modelo:

```bash
# Treinamento padrao (50 epochs)
sql-ml train

# Treinamento mais longo para datasets maiores
sql-ml train --epochs 100 --batch-size 64

# Treinamento rapido para teste
sql-ml train --epochs 5 --batch-size 8
```

### Interpretar Resultados

```
[Train] Training completed!
  Model version: v1705312200000
  Final loss: 0.4523
  Final accuracy: 78.50%
  Training samples: 120
  Validation samples: 30
```

| Metrica | Bom | Ruim | Acao |
|---|---|---|---|
| Loss | < 0.5 | > 0.7 | Mais dados ou mais epochs |
| Accuracy | > 75% | < 60% | Mais variedade nos dados |
| Val vs Train gap | Pequeno | > 20% | Overfitting: reduzir epochs |

## Etapa 4: Analisar Queries

Com o modelo treinado (ou usando o modelo padrao com pesos aleatorios):

```bash
# Analise basica
sql-ml analyze minha-query.sql

# Salvar resultado em JSON
sql-ml analyze minha-query.sql --output resultado.json

# Com detalhes do motor ML
sql-ml analyze minha-query.sql --verbose
```

## Exemplo Completo

```bash
# 1. Coletar queries de producao
sql-ml collect --input /var/log/mysql/slow.log
# [Collect] Added 47 queries to data/queries.jsonl

# 2. Adicionar queries rapidas para balancear
sql-ml collect --query "SELECT id FROM users WHERE id = 1" --time 2 --database prod
sql-ml collect --query "SELECT name FROM products WHERE id = 5" --time 3 --database prod
sql-ml collect --query "SELECT 1" --time 1 --database prod

# 3. Extrair features
sql-ml features
# [Features] Loaded 50 queries
# [Features] Statistics:
#   With JOIN: 15
#   With SELECT *: 8
#   Avg execution time: 1234.50ms

# 4. Treinar
sql-ml train --epochs 30
# [Train] Training completed!
#   Final accuracy: 82.00%

# 5. Analisar nova query
echo "SELECT u.*, o.* FROM users u, orders o WHERE o.total > 100" > query.sql
sql-ml analyze query.sql
```

## Estrutura de Arquivos

Apos executar o pipeline completo:

```
data/
  queries.jsonl          # Queries coletadas (47 + 3 manuais)
  features.jsonl         # Features extraidas (50 registros)
  examples/
    queries.jsonl        # Exemplos commitados
    features.jsonl       # Exemplos commitados

models/
  model-v1705312200000.json           # Topologia do modelo
  training-result-v1705312200000.json # Metricas de treinamento
  examples/
    model-v1-example.json             # Exemplo commitado
    training-result-v1-example.json   # Exemplo commitado
```

## Dicas

### Dataset Balanceado

Para bons resultados, o dataset deve conter:
- Queries rapidas (< 100ms) e lentas (> 1s)
- Queries simples (`SELECT * FROM t WHERE id = 1`) e complexas (multi-JOIN, subqueries)
- Variedade de patterns: com/sem JOIN, com/sem subquery, com/sem LIKE, etc.

### Iteracao

O pipeline e incremental:
- `collect` faz **append** (nao sobrescreve)
- Voce pode coletar mais dados e re-treinar a qualquer momento
- Cada treinamento gera um novo modelo versionado

### Integracao CI/CD

```bash
#!/bin/bash
sql-ml analyze query.sql --output result.json

SCORE=$(jq '.performanceScore' result.json)
if (( $(echo "$SCORE < 0.5" | bc -l) )); then
  echo "Query com performance ruim (score: $SCORE)"
  exit 1
fi
```
