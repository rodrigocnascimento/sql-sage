# SQL ML CLI

Ferramenta de linha de comando para **análise estática e predição de performance de queries SQL**, combinando regras heurísticas com Machine Learning (BiLSTM / TensorFlow.js).

Detecta anti-patterns, gargalos de performance e sugere otimizações — antes da query chegar em produção.

---

## Funcionalidades

- **15 regras heurísticas** de análise estática com detecção de anti-patterns e gargalos
- **Modelo BiLSTM** treinável com TensorFlow.js para predição de performance
- **18 features estruturais** extraídas automaticamente de cada query
- **Conector plugável** para MySQL/MariaDB com EXPLAIN real e consulta de catálogo ao vivo
- **Pipeline completo**: coleta → extração de features → treinamento → análise
- **Base de demonstração** com Docker (schema e-commerce, 7 tabelas, ~26k linhas)

---

## Início Rápido

### Pré-requisitos

- Node.js >= 18
- Docker e Docker Compose (para o banco de demonstração)

### Instalação

```bash
git clone https://github.com/rodrigocnascimento/sqlsage.git
cd sqlsage
npm install
npm run build
```

### Analisar uma query (sem banco de dados)

```bash
sql-ml analyze minha-query.sql
```

### Pipeline completo com banco de demonstração

```bash
# 1. Subir o MySQL via Docker
npm run db:up

# 2. Aguardar o container ficar pronto (~10s) e popular com dados
npm run db:seed

# 3. Configurar conexão
cp docker/.env.docker .env

# 4. Coletar queries de um arquivo .sql
sql-ml collect data/examples/ecommerce-queries.sql

# 5. Extrair features
sql-ml features

# 6. Treinar o modelo
sql-ml train

# 7. Analisar queries com heurísticas + ML
sql-ml analyze minha-query.sql --verbose
```

---

## Comandos

### `analyze` — Analisar queries SQL

Analisa um arquivo SQL e retorna score de performance, insights e features extraídas.

```bash
sql-ml analyze <arquivo.sql>
sql-ml analyze <arquivo.sql> --verbose
sql-ml analyze <arquivo.sql> --output resultado.json
sql-ml analyze <arquivo.sql> --host localhost --port 3316 --user root --password pass --database mydb
```

| Flag | Descrição |
|---|---|
| `-o, --output <file>` | Salva resultado em JSON |
| `-m, --model <dir>` | Diretório do modelo treinado (padrão: `models`) |
| `-v, --verbose` | Exibe status detalhado do motor ML |

Quando flags de conexão ao banco são informadas, o `analyze` executa **EXPLAIN real** e consulta o **catálogo de índices** para enriquecer a análise.

### `collect` — Coletar queries

Coleta queries SQL de diversas fontes: arquivos `.sql`, slow query logs do MySQL ou diretamente do `performance_schema`.

```bash
# Arquivo .sql (detecção automática pelo formato)
sql-ml collect data/examples/ecommerce-queries.sql

# Slow query log do MySQL
sql-ml collect --input /var/log/mysql/slow.log

# Direto do performance_schema (requer conexão ao banco)
sql-ml collect --source db --host localhost --port 3316 --user root --password pass --database mydb

# Query individual
sql-ml collect --query "SELECT * FROM users WHERE id = 1" --time 150 --database mydb
```

| Flag | Descrição | Padrão |
|---|---|---|
| `[file]` | Argumento posicional — arquivo de entrada (.sql ou slow log) | — |
| `-i, --input <path>` | Arquivo de entrada (alternativa ao posicional) | — |
| `-o, --output <path>` | Arquivo de saída JSONL | `data/queries.jsonl` |
| `-q, --query <sql>` | Query individual para adicionar | — |
| `-t, --time <ms>` | Tempo de execução em milissegundos | `0` |
| `-d, --database <name>` | Nome do banco de dados | `default` |
| `-s, --source <type>` | Origem: `file` ou `db` | `file` |
| `--min-time <ms>` | Filtro de tempo mínimo (coleta via DB) | `0` |
| `--limit <n>` | Máximo de queries coletadas do DB | `100` |
| `--timestamp <iso>` | Timestamp em formato ISO | data atual |

### `features` — Extrair features

Extrai as 18 features estruturais das queries coletadas.

```bash
sql-ml features
sql-ml features --input data/queries.jsonl --output data/features.jsonl
```

| Flag | Descrição | Padrão |
|---|---|---|
| `-i, --input <path>` | Arquivo de entrada JSONL | `data/queries.jsonl` |
| `-o, --output <path>` | Arquivo de saída com features | `data/features.jsonl` |

### `train` — Treinar modelo

Treina o modelo BiLSTM com os dados de features extraídos.

```bash
sql-ml train
sql-ml train --epochs 100 --batch-size 64
```

| Flag | Descrição | Padrão |
|---|---|---|
| `-i, --input <path>` | Arquivo de features JSONL | `data/features.jsonl` |
| `-o, --output <path>` | Diretório do modelo | `models` |
| `-e, --epochs <n>` | Epochs de treinamento | `50` |
| `-b, --batch-size <n>` | Tamanho do batch | `32` |
| `-v, --validation-split <n>` | Split de validação (0-1) | `0.2` |
| `-l, --learning-rate <n>` | Taxa de aprendizado | `0.001` |
| `-s, --slow-threshold <n>` | Limiar em ms para classificar query como lenta | `500` |

### `status` — Status do motor ML

Exibe status do motor ML e informações de conexão ao banco.

```bash
sql-ml status
```

---

## Flags Globais de Conexão

Disponíveis em todos os comandos. Podem ser substituídas por variáveis de ambiente (`SQLML_*`) ou arquivo `.env`.

| Flag | Variável de Ambiente | Descrição |
|---|---|---|
| `--host <host>` | `SQLML_HOST` | Host do banco |
| `--port <port>` | `SQLML_PORT` | Porta do banco |
| `--user <user>` | `SQLML_USER` | Usuário |
| `--password <pass>` | `SQLML_PASSWORD` | Senha |
| `--database <name>` | `SQLML_DATABASE` | Nome do banco |
| `--engine <engine>` | `SQLML_ENGINE` | Engine (`mysql`, `mariadb`) |
| `--ssl` | — | Habilitar SSL |

**Prioridade de resolução:** flags CLI > variáveis de ambiente / `.env` > valores padrão

---

## Regras Heurísticas

O motor de análise estática aplica 15 regras com penalidades proporcionais à gravidade:

| Regra | Tipo | Penalidade |
|---|---|---|
| `cartesian-product` — Cross join implícito | PERFORMANCE_BOTTLENECK | -25 |
| `join-no-on` — JOIN sem cláusula ON | PERFORMANCE_BOTTLENECK | -25 |
| `no-where-mutation` — UPDATE/DELETE sem WHERE | PERFORMANCE_BOTTLENECK | -30 |
| `subquery-in-where` — Subquery na cláusula WHERE | PERFORMANCE_BOTTLENECK | -20 |
| `deep-subquery` — Subqueries profundamente aninhadas | PERFORMANCE_BOTTLENECK | -15 |
| `function-on-column` — Função em coluna no WHERE | ANTI_PATTERN | -15 |
| `leading-wildcard` — LIKE com wildcard no início | ANTI_PATTERN | -15 |
| `select-star-join` — SELECT * com JOIN | ANTI_PATTERN | -10 |
| `distinct-order-by` — DISTINCT com ORDER BY | ANTI_PATTERN | -10 |
| `or-different-columns` — OR em colunas diferentes | PERFORMANCE_BOTTLENECK | -10 |
| `count-no-where` — COUNT(*) sem WHERE | PERFORMANCE_BOTTLENECK | -10 |
| `too-many-joins` — Mais de 5 JOINs | PERFORMANCE_BOTTLENECK | -10 |
| `no-limit` — SELECT sem LIMIT | SYNTAX_OPTIMIZATION | -5 |
| `or-to-in` — Múltiplos OR na mesma coluna (usar IN) | SYNTAX_OPTIMIZATION | -5 |
| `union-without-all` — UNION sem ALL | SYNTAX_OPTIMIZATION | -5 |

Score final: `100 - soma das penalidades` (mínimo 0).

Quando o modelo ML está disponível, o score combina ambos: `heurístico * 0.6 + ML * 0.4`.

---

## Features ML

18 features estruturais extraídas de cada query para alimentar o modelo BiLSTM:

| # | Feature | Tipo |
|---|---|---|
| 1 | `hasJoin` | binário (0/1) |
| 2 | `joinCount` | numérico |
| 3 | `hasSubquery` | binário (0/1) |
| 4 | `subqueryCount` | numérico |
| 5 | `hasFunctionInWhere` | binário (0/1) |
| 6 | `selectStar` | binário (0/1) |
| 7 | `tableCount` | numérico |
| 8 | `whereColumnsIndexed` | binário (0/1) |
| 9 | `estimatedRows` | normalizado (0-1) |
| 10 | `hasOr` | binário (0/1) |
| 11 | `hasUnion` | binário (0/1) |
| 12 | `hasLike` | binário (0/1) |
| 13 | `hasCountStar` | binário (0/1) |
| 14 | `nestedJoinDepth` | numérico |
| 15 | `hasGroupBy` | binário (0/1) |
| 16 | `hasOrderBy` | binário (0/1) |
| 17 | `hasLimit` | binário (0/1) |
| 18 | `orConditionCount` | numérico |

Quando conectado a um banco real, `whereColumnsIndexed` e `estimatedRows` são populados via EXPLAIN e `INFORMATION_SCHEMA`.

---

## Banco de Demonstração (Docker)

O projeto inclui uma infraestrutura Docker com MySQL 8.0 e schema e-commerce para testes e demonstração.

### Schema

7 tabelas: `categories`, `products`, `customers`, `orders`, `order_items`, `payments`, `reviews` — com **lacunas intencionais de índice** em `products.name`, `reviews.rating`, `orders.total_amount` e `customers.phone` para exercitar detecção de full table scans.

### Comandos

```bash
npm run db:up      # Subir container MySQL (porta 3316)
npm run db:down    # Parar container
npm run db:reset   # Recriar do zero (destrói volumes)
npm run db:seed    # Popular com dados (~26k linhas no scale padrão)
```

O seed aceita `--scale` para controlar o volume de dados:

```bash
npm run db:seed -- --scale 5000   # ~130k linhas
```

### Configuração

```bash
cp docker/.env.docker .env
```

---

## Arquitetura

```
src/
  index.ts                              # Entry point CLI (commander)
  services/
    ml-prediction.service.ts            # Serviço de predição principal
    config/
      connection-config.ts              # Resolver de configuração (CLI > env > defaults)
    data/
      query-collector.ts                # Comando collect
      features-command.ts               # Comando features
      train-command.ts                  # Comando train
      storage.ts                        # Armazenamento JSONL
      slow-log-parser.ts               # Parser de slow query log MySQL
      sql-file-parser.ts               # Parser de arquivos .sql
      types.ts                          # Interfaces de dados
    db/
      connector.ts                      # Interface IDatabaseConnector + factory
      mysql-connector.ts               # Implementação MySQL/MariaDB
    ml/
      train.ts                          # Pipeline de treinamento (ModelTrainer)
      engine/
        index.ts                        # MLQueryEngine (orquestrador)
        model.ts                        # Modelo BiLSTM (TensorFlow.js)
        heuristic-rules.ts             # 15 regras de análise estática
        feature-extractor.ts           # Extração de 18 features
        tokenizer.ts                    # Tokenizador SQL para input do BiLSTM
        explain-parser.ts              # Parser de EXPLAIN do MySQL
        catalog-gatherer.ts            # Coleta de catálogo/índices
        types.ts                        # Interfaces ML

docker/
  docker-compose.yml                    # MySQL 8.0 (porta 3316, performance_schema ON)
  .env.docker                           # Template de conexão
  init/
    01-schema.sql                       # DDL das 7 tabelas e-commerce
  seed/
    seed.ts                             # Script de seed (TypeScript, LCG determinístico)

data/examples/
  ecommerce-queries.sql                 # 50 queries em 3 tiers (good/medium/bad)
  queries.jsonl                         # Exemplo de queries coletadas
  features.jsonl                        # Exemplo de features extraídas
```

---

## Desenvolvimento

```bash
npm run dev             # Executar com tsx (desenvolvimento)
npm run build           # Compilar TypeScript
npm run start           # Executar JavaScript compilado
npm run test            # Rodar testes (345 testes)
npm run test:unit       # Apenas testes unitários
npm run test:e2e        # Apenas teste E2E do pipeline
npm run test:watch      # Testes em modo watch
npm run test:coverage   # Testes com relatório de cobertura
```

### Type checking

```bash
npx tsc --noEmit
```

---

## Documentação

Documentação técnica completa em [`docs/`](docs/):

| Documento | Descrição |
|---|---|
| [Planejamento](docs/00-planning.md) | Visão geral e roadmap |
| [QueryPerformancePredictor](docs/10-query-performance-predictor.md) | Preditor de performance |
| [SQLFeatureEngineer](docs/20-sql-feature-engineer.md) | Feature engineer v0.1 |
| [MLQueryEngine](docs/40-ml-query-engine.md) | Motor de análise ML |
| [MLPredictionService](docs/50-ml-prediction-service.md) | Serviço de predição |
| [Interface CLI](docs/60-cli-interface.md) | Comandos e interface |
| [Pipeline de Dados](docs/70-data-pipeline.md) | Coleta e armazenamento |
| [Feature Extractor](docs/80-feature-extractor.md) | Extração de 18 features |
| [Treinamento de Modelo](docs/90-model-training.md) | Pipeline de treinamento |
| [Workflow Completo](docs/95-end-to-end-workflow.md) | Fluxo end-to-end |
| [Auditoria Técnica](docs/100-auditoria-tecnica-v02.md) | Auditoria v0.2 |
| [Validação e Evolução](docs/110-validation-and-evolution.md) | Checklist e roadmap |


### Technical Design Documents

| TDD | Feature |
|---|---|
| [tdd-unify-prediction-engine](docs/tdd-unify-prediction-engine.md) | Unificação heurísticas + ML |
| [tdd-real-db-connector](docs/tdd-real-db-connector.md) | Conector de banco plugável |
| [tdd-ecommerce-demo-db](docs/tdd-ecommerce-demo-db.md) | Banco de demonstração |

---

## Licença

MIT
