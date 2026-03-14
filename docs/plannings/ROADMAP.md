# Roadmap de Evolução - sql-sage

> Visão geral do plano de evolução da v0.8.0 até v1.0-beta

---

## Visão Geral das Versões

| Versão | Código | Escopo | Status |
|--------|--------|--------|--------|
| [v0.8.0](ROADMAP-v080-scanner-typeorm.md) | Scanner TypeORM | Scanner com Strategy pattern | ⏳ Próxima |
| [v0.8.1](ROADMAP-v081-perf-schema.md) | Perf Schema | Integração Performance Schema | 📋 Planejado |
| [v0.9.0](ROADMAP-v090-consolidated-pipeline.md) | Pipeline | Pipeline unificado | 📋 Planejado |
| [v0.9.1](ROADMAP-v091-validation.md) | Validation | Validação em banco real | 📋 Planejado |
| [v0.9.2](ROADMAP-v092-daemon-dashboard.md) | Daemon + Dashboard | Auto-treinamento e métricas | 📋 Planejado |
| [v1.0-beta](ROADMAP-v100-beta.md) | Beta | Beta release | 📋 Planejado |

---

## Fluxo de Evolução

```
v0.7.0 (atual)
    │
    ▼
v0.8.0 ── Scanner TypeORM (Strategy pattern)
    │
    ▼
v0.8.1 ── Performance Schema Integration
    │
    ▼
v0.9.0 ── Consolidated Pipeline
    │
    ▼
v0.9.1 ── Validation (Alpha)
    │
    ▼
v0.9.2 ── Daemon + Dashboard
    │
    ▼
v1.0-beta ── Beta Release
```

---

## Resumo por Versão

### v0.8.0 - Scanner TypeORM

- Scanner estático de código TypeScript
- 4 patterns iniciais: QueryBuilder, Repository find, Raw queries, QueryRunner
- **Padrão Strategy** para extensibilidade
- Output: JSONL com queries categorizadas

### v0.8.1 - Performance Schema Integration

- Coleta queries do `performance_schema`
- Captura tempos de execução reais
- Integração com scanner

### v0.9.0 - Consolidated Pipeline

- Unifica 3 fontes: Scanner + Perf Schema + Manual
- Threshold adaptativo
- Pipeline completo integrado

### v0.9.1 - Validation Phase

- Testes em banco de desenvolvimento
- Métricas: Precision, Recall, F1-Score
- Ajuste de heurísticas

### v0.9.2 - Daemon + Dashboard

- Daemon de auto-treinamento
- CLI Dashboard (tables) para monitoramento
- HTML Report para apresentar ao time
- Hot-reload do modelo

### v1.0-beta - Beta Release

- Modelo pré-treinado
- Documentação completa
- Apresentação para o time

---

## TDDs por Versão

Cada versão terá seus próprios TDDs conforme especificado no roadmap de cada versão.

### v0.8.0
- `docs/tdd-scanner-architecture.md`
- `docs/tdd-query-builder-strategy.md`
- `docs/tdd-repository-find-strategy.md`
- `docs/tdd-raw-query-strategy.md`
- `docs/tdd-query-runner-strategy.md`

### v0.8.1
- `docs/tdd-perf-schema-collector.md`

### v0.9.0
- `docs/tdd-consolidator.md`
- `docs/tdd-adaptive-threshold.md`
- `docs/tdd-pipeline-cli.md`

### v0.9.1
- `docs/tdd-validation-metrics.md`

### v0.9.2
- `docs/tdd-daemon-architecture.md`
- `docs/tdd-cli-dashboard.md`
- `docs/tdd-html-dashboard.md`

---

## Referências

- Auditoria v0.7: `docs/120-auditoria-tecnica-v07.md`
- Validation v0.7: `docs/140-validation-v07.md`
- Plano Evolução: `docs/130-plano-evolucao-v08-v10.md`
