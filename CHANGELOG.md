# Changelog

Todas as mudancas notaveis do projeto sao documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.9.1] - 2026-03-15

### Added
- QueryConsolidator: une queries de múltiplas fontes
- Deduplicação de queries
- Labeling com threshold adaptativo (percentile, IQR, fixed)
- Comando CLI: `sql-sage consolidate`

## [0.9.2] - 2026-03-15

### Added
- Documentação publica com GitHub Pages em `documentation/`

## [0.9.0] - 2026-03-15

### Added
- Suporte a `--source perf-schema` como alias para `--source db`
- Opção `--explain` disponível (para implementação futura)

## [0.8.2] - 2026-03-15

### Changed
- Scanner TypeORM agora usa AST (ts-morph) em vez de regex
- Detecção de código multi-linha agora funciona corretamente

### Added
- 11 padrões TypeORM suportados: find, findOne, findOneOrFail, findOneBy, findBy, findAndCount, count, save, insert, update, delete, softDelete, etc.

### Removed
- Código de strategies baseado em regex (obsoleto)

## [0.8.0] - 2026-03-14

### Added
- Scanner TypeORM para extração de queries SQL de projetos externos
- Padrão Strategy para detecção de patterns (extensível)
- 4 patterns iniciais: `query-builder`, `repository-find`, `raw-query`, `query-runner`
- Comando CLI `sql-sage scan <directory>` para escanear projetos TypeORM
- Output em formato JSONL compatível com pipeline
- Dependência `glob` para encontrar arquivos TypeScript

## [0.7.0] - 2026-03-10

### Changed
- Project renamed from `sql-ml-cli` to `sql-sage` across entire codebase (30 files, ~170 replacements)
- CLI binary renamed from `sql-ml` to `sql-sage`
- Environment variable prefix renamed from `SQLML_*` to `SQLSAGE_*` (9 vars)
- Docker container renamed from `sqlml-mysql` to `sqlsage-mysql`
- Docker volume renamed from `sqlml-mysql-data` to `sqlsage-mysql-data`
- Docker password renamed from `sqlml_root_pass` to `sqlsage_root_pass`
- Future config directory references renamed from `.sqlml/` to `.sqlsage/`

## [0.6.0] - 2026-03-09

### Added
- Docker Compose infrastructure for MySQL 8.0 demo database (port 3316, `performance_schema` enabled)
- E-commerce schema with 7 tables and intentional index gaps for analyzer testing (`docker/init/01-schema.sql`)
- TypeScript seed script with deterministic LCG random and configurable `--scale` flag (`docker/seed/seed.ts`)
- Query bank with 50 SQL queries across 3 tiers: good, medium, bad (`data/examples/ecommerce-queries.sql`)
- `SqlFileParser` for collecting queries from plain `.sql` files (strips comments, splits on `;`)
- Positional `[file]` argument in `collect` command with automatic format detection (`.sql` vs slow log)
- npm scripts: `db:up`, `db:down`, `db:reset`, `db:seed` for Docker database management
- `.env.docker` connection template for demo database
- Validation & evolution document: `specs/110-validation-and-evolution.md`
- Technical Design Document: `specs/tdd-ecommerce-demo-db.md`
- 16 new tests for `SqlFileParser` — total: 345 tests

### Fixed
- Flaky `mlAvailable` test now uses isolated service instance with non-existent model directory

## [0.5.0] - 2026-03-06

### Added
- Pluggable database connector architecture (`IDatabaseConnector` interface) for multi-engine support
- MySQL/MariaDB connector (`MysqlConnector`) using `mysql2/promise` with EXPLAIN, catalog info, and query collection
- `--source db` option in `collect` command to gather queries from `performance_schema`
- Live EXPLAIN execution in `analyze` command when connected to a real database
- Live catalog info gathering from `INFORMATION_SCHEMA` for index-aware feature extraction
- `liveExplain` and `liveCatalog` flags in `MLPredictionResponse` indicating real data usage
- Global CLI flags: `--host`, `--port`, `--user`, `--password`, `--database`, `--engine`, `--ssl`
- Connection config resolver with CLI > `.env` > defaults priority (`resolveConnectionConfig()`)
- `.env.example` template for `SQLSAGE_*` environment variables
- Technical Design Document: `specs/tdd-real-db-connector.md`
- 63 new tests (connector factory, MySQL connector, connection config) — total: 329 tests

### Changed
- `CatalogGatherer` refactored to async with optional real DB connector (`setConnector()`) and `gatherMock()` fallback
- `MLQueryEngine.processQuery()` now accepts optional `IExecutionPlan` and `ICatalogInfo` parameters
- `MLPredictionService.predict()` accepts optional `IDatabaseConnector` for live data enrichment
- `query-collector.ts` accepts `ConnectorResolver` for DB-sourced query collection

### Fixed
- `estimatedRows` feature (previously always 0) now populated from real EXPLAIN data when DB connected
- `whereColumnsIndexed` feature (previously always 0) now populated from real catalog data when DB connected

## [0.4.0] - 2026-03-06

### Added
- E2E pipeline integration test with 50-query bank across 3 tiers (clean/medium/bad)
- Test coverage for all 6 phases: feature extraction, heuristic baseline, model training, ML+heuristic analysis, stability, summary report
- `test:e2e` and `test:unit` npm scripts for independent test execution
- 3 new unit tests for aggregate function handling in FeatureExtractor

### Fixed
- `hasSubquery()` false positive on aggregate functions (COUNT, SUM, AVG, MAX)

### Changed
- Manual test plan (`specs/99-plano-teste-manual.md`) updated to v0.3 compatibility

## [0.3.0] - 2026-03-06

### Added
- Unified heuristic + ML prediction pipeline (heuristics as base, ML as optional complement)
- `heuristic-rules.ts` - Rule-based SQL analysis engine with pattern detection
- `tokenizer.ts` - SQL tokenizer for feature extraction
- `tdd-unify-prediction-engine.md` - Technical design document

### Changed
- `MLQueryEngine` refactored to orchestrate heuristic-first, ML-second pipeline
- `model.ts` updated with proper weight serialization and `findLatestModel` fix
- `train.ts` simplified to use new tokenizer-based feature extraction
- `ml-prediction.service.ts` slimmed to delegate to unified engine
- CLI command adjustments in `index.ts`

### Removed
- `feature-engineer.ts` - Replaced by heuristic-rules + tokenizer
- `schema-registry.ts` - Dead code from v0.1 architecture
- `types.ts` - Consolidated into engine modules

## [0.2.0] - 2026-03-06

### Adicionado

- **Pipeline de Dados (Fase 1)**
  - Comando `collect` para coletar queries de slow query logs do MySQL
  - Comando para adicionar queries manualmente via CLI
  - `SlowLogParser` para parsing de slow query log do MySQL
  - `DatasetStorage` para armazenamento em formato JSONL
  - Interface `ISQLQueryRecord` com campos: id, query, executionTimeMs, database, timestamp
  - Dados de exemplo em `data/examples/queries.jsonl`

- **Feature Engineering Expandido (Fase 2)**
  - Comando `features` para extracao de features das queries coletadas
  - `FeatureExtractor` com 18 features estruturais (expansao de 8 para 18)
  - `ExplainParser` para parsing de resultados EXPLAIN do MySQL (JSON e texto)
  - `CatalogGatherer` para coleta de informacoes de catalogo (mock)
  - Dados de exemplo em `data/examples/features.jsonl`

- **Treinamento de Modelo (Fase 3)**
  - Comando `train` para treinamento do modelo BiLSTM
  - `ModelTrainer` com pipeline completo: load, prepare, build, train, save
  - Configuracao de treinamento: epochs, batch size, validation split, learning rate
  - Versionamento de modelos com formato `v<timestamp>`
  - Modelos de exemplo em `models/examples/`

- **Testes**
  - Testes unitarios para `DatasetStorage` (10 testes)
  - Testes unitarios para `SlowLogParser` (10 testes)
  - Testes unitarios para `FeatureExtractor` (51 testes)
  - Testes unitarios para `ExplainParser` (19 testes)
  - Testes unitarios para `CatalogGatherer` (18 testes)
  - Testes unitarios para `ModelTrainer` (17 testes)
  - Total: 109 → 234 testes

- **Documentacao**
  - `specs/70-data-pipeline.md` - Pipeline de dados
  - `specs/80-feature-extractor.md` - Feature extractor v0.2
  - `specs/90-model-training.md` - Treinamento de modelo
  - `specs/95-end-to-end-workflow.md` - Workflow completo
  - `CONTRIBUTING.md` - Guia de contribuicao
  - `CHANGELOG.md` - Historico de mudancas
  - README traduzido para pt-BR com todos os 5 comandos

### Alterado

- `tsconfig.json`: Modulo alterado de ESNext para CommonJS (compatibilidade Node.js)
- `package.json`: Removido `"type": "module"` (mesmo motivo)
- `.gitignore`: Adicionados padroes para `data/*` e `models/*` com excecoes para `examples/`
- README.md: Reescrito em pt-BR com documentacao dos 5 comandos CLI

## [0.1.0] - 2026-03-06

### Adicionado

- Modelo BiLSTM com TensorFlow.js para predicao de performance
- `SQLFeatureEngineer` com 8 features estruturais
- `SchemaRegistry` para registro de DDLs e verificacao de indices
- `MLQueryEngine` como orquestrador dos componentes ML
- `MLPredictionService` como servico de alto nivel
- Comandos CLI: `analyze` e `status`
- 109 testes unitarios com ~95% de cobertura
- Documentacao tecnica em `specs/` (10 a 60)
- Deteccao de 3 tipos de insights: PERFORMANCE_BOTTLENECK, SCHEMA_SUGGESTION, ANTI_PATTERN
