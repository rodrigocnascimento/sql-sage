# SQL ML CLI

Ferramenta CLI para analisar arquivos SQL usando predição de performance baseada em ML com TensorFlow.js.

## Funcionalidades

- **Predição de Performance**: Prediz o score de performance de queries (0-100%)
- **Detecção de Insights**: Identifica anti-patterns comuns em SQL:
  - Risco de produto cartesiano
  - Risco de full table scan
  - Sugestões de índices ausentes
- **Extração de Features**: Extrai 18 features estruturais de queries SQL
- **Coleta de Dados**: Importa queries de slow query logs do MySQL
- **Treinamento de Modelo**: Pipeline completo para treinar o modelo com dados reais

## Instalação

```bash
npm install
npm run build
```

Para uso global:

```bash
npm link
```

## Comandos

### `analyze` - Analisar query SQL

Analisa um arquivo SQL e retorna predição de performance.

```bash
sql-ml analyze <arquivo.sql>
sql-ml analyze <arquivo.sql> --output resultado.json
sql-ml analyze <arquivo.sql> --verbose
```

**Opções:**
- `-o, --output <file>` - Salva resultado em JSON
- `-v, --verbose` - Exibe status detalhado do motor ML

### `collect` - Coletar queries

Coleta queries SQL de diversas fontes (slow query log ou manual).

```bash
# Importar de slow query log
sql-ml collect --input /var/log/mysql/slow.log

# Adicionar query manual
sql-ml collect --query "SELECT * FROM users WHERE id = 1" --time 150 --database mydb

# Especificar arquivo de saída
sql-ml collect --input slow.log --output data/queries.jsonl
```

**Opções:**
- `-i, --input <path>` - Arquivo de entrada (slow query log do MySQL)
- `-o, --output <path>` - Arquivo de saída (padrão: `data/queries.jsonl`)
- `-q, --query <sql>` - Query individual para adicionar
- `-t, --time <ms>` - Tempo de execução em milissegundos
- `-d, --database <name>` - Nome do banco de dados
- `--timestamp <iso>` - Timestamp em formato ISO

### `features` - Extrair features

Extrai as 18 features estruturais das queries coletadas.

```bash
sql-ml features
sql-ml features --input data/queries.jsonl --output data/features.jsonl
```

**Opções:**
- `-i, --input <path>` - Arquivo de entrada JSONL (padrão: `data/queries.jsonl`)
- `-o, --output <path>` - Arquivo de saída com features (padrão: `data/features.jsonl`)

### `train` - Treinar modelo

Treina o modelo de ML com os dados de features extraídos.

```bash
sql-ml train
sql-ml train --epochs 100 --batch-size 64
sql-ml train --input data/features.jsonl --output models
```

**Opções:**
- `-i, --input <path>` - Arquivo de features (padrão: `data/features.jsonl`)
- `-o, --output <path>` - Diretório do modelo (padrão: `models`)
- `-e, --epochs <number>` - Epochs de treinamento (padrão: 50)
- `-b, --batch-size <number>` - Tamanho do batch (padrão: 32)
- `-v, --validation-split <number>` - Split de validação 0-1 (padrão: 0.2)
- `-l, --learning-rate <number>` - Taxa de aprendizado (padrão: 0.001)

### `status` - Status do motor ML

```bash
sql-ml status
```

## Pipeline Completo

O fluxo de trabalho recomendado:

```bash
# 1. Coletar queries do slow query log
sql-ml collect --input /var/log/mysql/slow.log

# 2. Extrair features das queries coletadas
sql-ml features

# 3. Treinar o modelo
sql-ml train

# 4. Analisar queries
sql-ml analyze minha-query.sql
```

## Exemplo de Saída

```bash
sql-ml analyze minha-query.sql
```

```json
{
  "performanceScore": 0.75,
  "insights": [
    {
      "lineNumber": 1,
      "issueType": "SCHEMA_SUGGESTION",
      "severityScore": 0.7,
      "educationalFix": "Filter condition on unindexed column detected...",
      "affectedSegment": "WHERE clause"
    }
  ],
  "features": {
    "joinCount": 2,
    "subqueryDepth": 1,
    "whereClauseComplexity": 3,
    "selectedColumnsCount": 5,
    "hasCartesianRisk": false,
    "missingIndexCount": 1,
    "fullTableScanRisk": false
  }
}
```

## Arquitetura

```
src/
  index.ts                          # Entry point CLI (commander)
  services/
    ml-prediction.service.ts        # Serviço de predição principal
    data/
      storage.ts                    # Armazenamento JSONL
      slow-log-parser.ts            # Parser de slow query log MySQL
      query-collector.ts            # Comando collect
      features-command.ts           # Comando features
      train-command.ts              # Comando train
      types.ts                      # Interfaces de dados
    ml/
      train.ts                      # ModelTrainer (pipeline de treinamento)
      engine/
        index.ts                    # MLQueryEngine (orquestrador)
        model.ts                    # Modelo BiLSTM (TensorFlow.js)
        feature-engineer.ts         # Feature engineer v0.1 (8 features)
        feature-extractor.ts        # Feature extractor v0.2 (18 features)
        explain-parser.ts           # Parser de EXPLAIN do MySQL
        catalog-gatherer.ts         # Coleta de catálogo/índices
        schema-registry.ts          # Registro de schemas DDL
        types.ts                    # Interfaces ML
```

### Componentes Principais

- **TensorFlow.js**: Rede neural BiLSTM para predição de performance
- **Feature Engineer (v0.1)**: Tokeniza e extrai 8 features estruturais para o modelo de predição
- **Feature Extractor (v0.2)**: Extrai 18 features expandidas para treinamento
- **Schema Registry**: Conhecimento de schema para recomendações de índice
- **Data Pipeline**: Coleta, extração de features e treinamento

## Desenvolvimento

```bash
npm run dev             # Executar com tsx (desenvolvimento)
npm run build           # Compilar TypeScript
npm run start           # Executar JavaScript compilado
npm run test            # Rodar testes
npm run test:watch      # Testes em modo watch
npm run test:coverage   # Testes com relatório de cobertura
```

## Documentação

Documentação completa disponível em [`docs/`](docs/):

- [Planejamento](docs/00-planning.md)
- [QueryPerformancePredictor](docs/10-query-performance-predictor.md)
- [SQLFeatureEngineer](docs/20-sql-feature-engineer.md)
- [SchemaRegistry](docs/30-schema-registry.md)
- [MLQueryEngine](docs/40-ml-query-engine.md)
- [MLPredictionService](docs/50-ml-prediction-service.md)
- [Interface CLI](docs/60-cli-interface.md)
- [Pipeline de Dados](docs/70-data-pipeline.md)
- [Feature Extractor v0.2](docs/80-feature-extractor.md)
- [Treinamento de Modelo](docs/90-model-training.md)
- [Workflow Completo](docs/95-end-to-end-workflow.md)

## Licença

MIT
