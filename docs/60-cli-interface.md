# Interface CLI

## Visao Geral

Interface de linha de comando que expoe a funcionalidade do sistema para uso direto via terminal. Construida com [Commander.js](https://github.com/tj/commander.js/).

## Comandos

### analyze

Analisa um arquivo SQL e retorna predicao de performance.

```bash
sql-sage analyze <file.sql>
sql-sage analyze <file.sql> --output result.json
sql-sage analyze <file.sql> --verbose
```

**Opcoes:**
- `-o, --output <file>`: Salva resultado em JSON
- `-v, --verbose`: Exibe status detalhado

### status

Mostra o estado atual do motor de ML.

```bash
sql-sage status
```

### collect

Coleta queries SQL de diversas fontes. Ver [Pipeline de Dados](70-data-pipeline.md).

```bash
sql-sage collect --input /var/log/mysql/slow.log
sql-sage collect --query "SELECT * FROM users" --time 150 --database mydb
```

**Opcoes:**
- `-i, --input <path>`: Slow query log do MySQL
- `-o, --output <path>`: Arquivo JSONL de saida (padrao: `data/queries.jsonl`)
- `-q, --query <sql>`: Query individual
- `-t, --time <ms>`: Tempo de execucao em milissegundos
- `-d, --database <name>`: Nome do banco de dados
- `--timestamp <iso>`: Timestamp ISO

### features

Extrai features estruturais das queries coletadas. Ver [Feature Extractor](80-feature-extractor.md).

```bash
sql-sage features
sql-sage features --input data/queries.jsonl --output data/features.jsonl
```

**Opcoes:**
- `-i, --input <path>`: Arquivo JSONL de entrada (padrao: `data/queries.jsonl`)
- `-o, --output <path>`: Arquivo de saida com features (padrao: `data/features.jsonl`)

### train

Treina o modelo de ML com dados de features. Ver [Treinamento de Modelo](90-model-training.md).

```bash
sql-sage train
sql-sage train --epochs 100 --batch-size 64
```

**Opcoes:**
- `-i, --input <path>`: Arquivo de features (padrao: `data/features.jsonl`)
- `-o, --output <path>`: Diretorio do modelo (padrao: `models`)
- `-e, --epochs <number>`: Epochs de treinamento (padrao: 50)
- `-b, --batch-size <number>`: Tamanho do batch (padrao: 32)
- `-v, --validation-split <number>`: Split de validacao (padrao: 0.2)
- `-l, --learning-rate <number>`: Taxa de aprendizado (padrao: 0.001)

## Saida

### Formato JSON (analyze)

```json
{
  "performanceScore": 0.75,
  "insights": [
    {
      "lineNumber": 1,
      "issueType": "SCHEMA_SUGGESTION",
      "severityScore": 0.7,
      "educationalFix": "...",
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

### Resumo em Texto

```
Summary:
  Performance Score: 75.0%
  Insights Found: 1
  ⚠️  1 potential missing indexes
```

## Scores e Severidade

### Performance Score (0-1)
- **0.0 - 0.3**: Critico - Query muito lenta esperada
- **0.3 - 0.6**: Alerta - Pode ter problemas de performance
- **0.6 - 0.8**: Bom - Query razoavel
- **0.8 - 1.0**: Excelente - Query bem otimizada

### Severity Score (0-1)
Cada insight tem um severityScore indicando gravidade:
- **0.0 - 0.3**: Informativo
- **0.3 - 0.6**: Moderado
- **0.6 - 0.8**: Alto
- **0.8 - 1.0**: Critico

### Threshold para Pipeline

O sistema pode ser integrado em pipelines CI/CD usando thresholds:

```bash
# Exemplo: falhar pipeline se score < 0.5 OU severity >= 0.8
sql-sage analyze query.sql --output result.json

SCORE=$(jq '.performanceScore' result.json)
SEVERITY=$(jq '[.insights[].severityScore] | max // 0' result.json)

if (( $(echo "$SCORE < 0.5" | bc -l) )) || (( $(echo "$SEVERITY >= 0.8" | bc -l) )); then
  echo "Pipeline abortado: Query com performance ruim ou problema critico"
  exit 1
fi
```

### Mapa de Tipos de Insight

| Tipo | Severity Base | Gatilho |
|------|---------------|---------|
| PERFORMANCE_BOTTLENECK | 0.9 | Produto cartesiano implicito |
| ANTI_PATTERN | 0.8 | LIKE com % no inicio |
| SCHEMA_SUGGESTION | 0.7 | Coluna sem indice |
| SYNTAX_OPTIMIZATION | 0.5 | (Reservado) |

## Instalacao

```bash
npm run build
npm link  # Para usar 'sql-sage' globalmente
```
