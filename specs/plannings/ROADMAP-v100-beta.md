# Roadmap v1.0-beta - Beta Release

**Código:** `feat/beta-release`  
**Versão:** v1.0-beta  
**Data Planejada:** 2026-03-XX  
**Status:** 📋 Planejado

**Dependência:** v0.9.X (Validation Phase)

---

## Escopo

Release beta para apresentação ao time e validação de hipóteses.

---

## Objetivos

1. **Modelo Pré-treinado** - Baseline com dados reais
2. **CLI Estável** - Pronto para uso
3. **Documentação** - Guias completos
4. **Beta Release** - Disponível para testes internos

---

## Entregas

### 1. Modelo Pré-treinado

```
models/
  v1.0-beta/
    model-architecture.json    # Topologia do modelo
    model-weights.json        # Pesos treinados
    metadata.json             # Info: epochs, accuracy, threshold
    training-history.json     # Histórico de treinamento
```

```json
// models/v1.0-beta/metadata.json
{
  "version": "v1.0-beta",
  "trainedAt": "2026-03-14T10:00:00Z",
  "dataset": {
    "totalQueries": 500,
    "sources": ["perf-schema", "scanner"],
    "labelDistribution": {
      "fast": 200,
      "medium": 150,
      "slow": 80,
      "unknown": 70
    }
  },
  "training": {
    "epochs": 50,
    "batchSize": 32,
    "thresholdMethod": "percentile",
    "thresholdSlow": 500,
    "thresholdMedium": 200
  },
  "metrics": {
    "accuracy": 0.75,
    "precision": 0.72,
    "recall": 0.70,
    "f1": 0.71
  }
}
```

### 2. CLI Estável

#### Comandos Principais

```bash
# Análise de query única
sql-sage analyze query.sql
sql-sage analyze query.sql --verbose

# Análise com banco de dados
sql-sage analyze query.sql --host localhost --database myapp

# Pipeline completo
sql-sage pipeline --sources scanner,perf-schema

# Scanner TypeORM
sql-sage scan /path/to/project --output queries.jsonl

# Avaliação
sql-sage evaluate --model models/v1.0-beta --test-set test.jsonl

# Status
sql-sage status
```

### 3. Documentação

| Documento | Descrição |
|-----------|-----------|
| `README.md` | Visão geral, instalação, quick start |
| `specs/getting-started.md` | Tutorial passo a passo |
| `specs/commands.md` | Referência completa de comandos |
| `specs/examples.md` | Exemplos de uso |
| `specs/architecture.md` | Arquitetura técnica |
| `specs/troubleshooting.md` | Problemas comuns e soluções |

### 4. Exemplos

```
examples/
  basic/
    simple-query.sql
    query-with-join.sql
  
  advanced/
    complex-queries.sql
    ecommerce-queries.sql
  
  typeorm/
    scanner-example/
      example.service.ts
      scanned-output.jsonl
```

---

## Features Incluídas

| Feature | v0.7.0 | v1.0-beta |
|---------|--------|-----------|
| Scanner TypeORM | ❌ | ✅ |
| Performance Schema | ❌ | ✅ |
| Consolidated Pipeline | ❌ | ✅ |
| Threshold Adaptativo | ❌ | ✅ |
| Avaliação | ❌ | ✅ |
| Modelo Pré-treinado | ❌ | ✅ |

---

## Pré-requisitos para Beta

- [ ] Testes passando (345+)
- [ ] TypeScript compilando sem erros
- [ ] Build funcionando
- [ ] 500+ queries no dataset
- [ ] Precision/Recall/F1 > 70%
- [ ] Documentação completa
- [ ] Exemplos funcionando
- [ ] README atualizado

---

## Processo de Beta

### 1. Alpha (próprio ambiente)

- Você testa com banco de desenvolvimento
- Valida hipóteses
- Ajusta heurísticas

### 2. Beta (time)

- Apresenta para o time
- Recebe feedback
- Documenta casos de uso

### 3. Release Candidate

- Ajustes baseados em feedback
- Código estável
- Pronto para uso geral

---

## Roadmap Futuro ( pós v1.0-beta )

| Versão | Escopo |
|--------|--------|
| v1.0 | Release oficial |
| v1.1 | PostgreSQL connector |
| v1.2 | Plugin system para regras customizadas |
| v1.3 | Relatórios HTML |

---

## Versionamento

### Convenções

- **v0.X** - Desenvolvimento
- **v1.0-beta** - Beta release (testes internos)
- **v1.0-rc** - Release candidate
- **v1.0** - Release oficial
- **v1.0.X** - Patch releases

### Changelog

```markdown
# Changelog

## [v1.0-beta] - 2026-03-14

### Added
- Scanner TypeORM com Strategy pattern
- Performance Schema integration
- Consolidated pipeline
- Adaptive threshold
- Avaliação com métricas

### Changed
- Sistema ML unificado
- 15 regras heurísticas
- 18 features

### Fixed
- Pesos salvos corretamente
- Modelo carregado para inferência
```

---

## Critérios de Aceitação

- [ ] Modelo pré-treinado com dados reais
- [ ] CLI funcional com todos os comandos
- [ ] Documentação completa
- [ ] Exemplos funcionando
- [ ] README atualizado
- [ ] CHANGELOG.md atualizado
- [ ] Tests passando
- [ ] Build OK

---

## TDDs Associados

- `specs/tdd-release-process.md` - Processo de release

---

## Próximos Passos

Após v1.0-beta:

1. Apresentar ao time
2. Coletar feedback
3. Ajustar conforme necessário
4. Launch v1.0

---

**Esta versão marca a transição de ferramenta de desenvolvimento para produto usável.**
