# Feature Extractor v0.2

## Visao Geral

O `FeatureExtractor` e a evolucao do sistema de extracao de features, expandindo de 8 para 18 features estruturais. Trabalha em conjunto com o `ExplainParser` e o `CatalogGatherer` para extrair informacoes mais ricas das queries SQL.

## Diferenca entre v0.1 e v0.2

| Aspecto | v0.1 (`feature-engineer.ts`) | v0.2 (`feature-extractor.ts`) |
|---|---|---|
| Features | 8 estruturais | 18 estruturais |
| Input | Query string | Query + ExecutionPlan + CatalogInfo |
| Normalizacao | 0-1 para todas | Binarias (0/1) + contadores + normalizadas |
| Uso | Alimenta o modelo de predicao | Alimenta o pipeline de treinamento |
| Dependencias | SchemaRegistry | ExplainParser, CatalogGatherer |

Ambos os sistemas coexistem: o v0.1 e usado pelo `MLQueryEngine` para predicao em tempo real, e o v0.2 e usado pelo pipeline de dados para treinamento.

## FeatureExtractor

**Arquivo:** `src/services/ml/engine/feature-extractor.ts`

### 18 Features Extraidas

| # | Feature | Tipo | Descricao |
|---|---------|------|-----------|
| 1 | `hasJoin` | binaria | Query contem JOIN (INNER, LEFT, RIGHT, CROSS) |
| 2 | `joinCount` | contador | Numero total de JOINs |
| 3 | `hasSubquery` | binaria | Query contem subquery |
| 4 | `subqueryCount` | contador | Numero de subqueries (max 5) |
| 5 | `hasFunctionInWhere` | binaria | WHERE contem funcoes (LOWER, CONCAT, DATE, etc.) |
| 6 | `selectStar` | binaria | Query usa `SELECT *` |
| 7 | `tableCount` | contador | Numero de tabelas referenciadas (max 10) |
| 8 | `whereColumnsIndexed` | binaria | Colunas do WHERE estao indexadas |
| 9 | `estimatedRows` | normalizada | Linhas estimadas / 1.000.000 (max 1.0) |
| 10 | `hasOr` | binaria | WHERE contem OR |
| 11 | `hasUnion` | binaria | Query usa UNION ou UNION ALL |
| 12 | `hasLike` | binaria | Query usa LIKE |
| 13 | `hasCountStar` | binaria | Query usa COUNT(*) |
| 14 | `nestedJoinDepth` | contador | Profundidade de JOINs aninhados (max 3) |
| 15 | `hasGroupBy` | binaria | Query usa GROUP BY |
| 16 | `hasOrderBy` | binaria | Query usa ORDER BY |
| 17 | `hasLimit` | binaria | Query usa LIMIT |
| 18 | `orConditionCount` | contador | Numero de ORs no WHERE (max 5) |

### Uso

```typescript
const extractor = new FeatureExtractor();

// Extrair de query string
const features = extractor.extract('SELECT * FROM users WHERE id = 1 OR name = "test"');
// { hasJoin: 0, joinCount: 0, ..., hasOr: 1, orConditionCount: 1, ... }

// Extrair de registro completo (com execution plan e catalog info)
const features = extractor.extractFromRecord(queryRecord);

// Converter para array numerico (para TensorFlow)
const array = extractor.toArray(features); // [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]
```

### Deteccao de Funcoes no WHERE

O extractor detecta funcoes no WHERE que impedem uso de indices:

- `CONCAT`, `LOWER`, `UPPER`, `TRIM`, `SUBSTRING`
- `DATE`, `NOW`, `IFNULL`, `COALESCE`
- Padrao generico `funcao(coluna)`

### Verificacao de Indices

Quando `catalogInfo` e fornecido, o extractor verifica se as colunas no WHERE estao indexadas:

```typescript
const catalogInfo: ICatalogInfo = {
  database: 'mydb',
  table: 'users',
  rowCount: 10000,
  avgRowLength: 100,
  indexes: [
    { name: 'idx_email', columns: ['email'], isUnique: true }
  ]
};

const features = extractor.extract(
  'SELECT * FROM users WHERE email = "test@example.com"',
  undefined,
  catalogInfo
);
// features.whereColumnsIndexed = 1 (email esta indexada)
```

## ExplainParser

Parser para resultados de `EXPLAIN` do MySQL. Converte tanto formato JSON quanto formato texto tabular.

**Arquivo:** `src/services/ml/engine/explain-parser.ts`

### Parse de Resultado JSON

Aceita tanto nomes em `snake_case` (MySQL nativo) quanto `camelCase`:

```typescript
const parser = new ExplainParser();

// Formato MySQL nativo
const plan = parser.parse({
  select_type: 'SIMPLE',
  table: 'users',
  type: 'ref',
  possible_keys: ['idx_email'],
  key: 'idx_email',
  rows_examined: 1,
  rows_returned: 1
});
```

### Parse de Texto Tabular

Para saida de `EXPLAIN` em formato texto (tab-separated):

```typescript
const plans = parser.parseFromText(
  'SIMPLE\tusers\tref\tidx_email\tidx_email\t1\t1'
);
```

Linhas com `+`, `|`, `=` (bordas de tabela) e linhas vazias sao ignoradas.

### Sumario

```typescript
const summary = parser.getSummary(plans);
// {
//   totalRowsExamined: 50000,
//   totalRowsReturned: 100,
//   hasFullScan: true  // se algum plan tem type 'ALL' ou 'index'
// }
```

### IExecutionPlan

```typescript
interface IExecutionPlan {
  id: string;
  selectType: string;     // SIMPLE, PRIMARY, SUBQUERY, etc.
  table: string;          // Nome da tabela
  type: string;           // ALL, index, range, ref, const, etc.
  possibleKeys: string[]; // Indices possiveis
  keyUsed: string | null; // Indice utilizado
  rowsExamined: number;   // Linhas examinadas
  rowsReturned: number;   // Linhas retornadas
}
```

## CatalogGatherer

Coleta informacoes de catalogo do banco de dados (indices, row counts). Atualmente opera com dados mock para desenvolvimento.

**Arquivo:** `src/services/ml/engine/catalog-gatherer.ts`

### Dados Mock Disponiveis

| Tabela | Row Count | Indices |
|---|---|---|
| `users` | 10.000 | `id` (PK) |
| `orders` | 50.000 | `id` (PK), `user_id`, `created_at` |
| `products` | 5.000 | `id` (PK), `category_id` |
| Outras | 1.000 | `id` (PK) |

### API

```typescript
const gatherer = new CatalogGatherer();

// Configurar conexao (para implementacao futura)
gatherer.setConfig({ database: 'mydb' });

// Obter catalogo de todas as tabelas mock
const catalogs = gatherer.gather('mydb');           // 3 tabelas

// Obter catalogo de tabela especifica
const catalog = gatherer.gather('mydb', 'orders');  // 1 tabela

// Obter indices de uma tabela
const indexes = gatherer.getIndexesForTable('mydb', 'orders');

// Verificar se coluna esta indexada
const indexed = gatherer.isColumnIndexed('mydb', 'orders', 'user_id'); // true
```

### ICatalogInfo

```typescript
interface ICatalogInfo {
  database: string;
  table: string;
  rowCount: number;
  avgRowLength: number;
  indexes: IIndexInfo[];
}

interface IIndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
}
```

## Comando `features`

**Arquivo:** `src/services/data/features-command.ts`

Le o arquivo `queries.jsonl`, extrai as 18 features de cada query e salva em `features.jsonl`.

```bash
sql-sage features
sql-sage features --input data/queries.jsonl --output data/features.jsonl
```

### Saida

Alem de salvar o arquivo, exibe estatisticas:

```
[Features] Loaded 150 queries
[Features] Saved 150 records to data/features.jsonl
[Features] Statistics:
  Total queries: 150
  With JOIN: 45
  With Subquery: 12
  With SELECT *: 23
  Avg execution time: 342.50ms
```

### Formato do features.jsonl

Cada linha e um `ISQLQueryRecord` com o campo `features` adicionado:

```json
{
  "id": "q_1705312200000_abc1234",
  "query": "SELECT * FROM users WHERE id = 1",
  "executionTimeMs": 50,
  "database": "mydb",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "features": {
    "hasJoin": 0,
    "joinCount": 0,
    "hasSubquery": 0,
    "subqueryCount": 0,
    "hasFunctionInWhere": 0,
    "selectStar": 1,
    "tableCount": 1,
    "whereColumnsIndexed": 0,
    "estimatedRows": 0,
    "hasOr": 0,
    "hasUnion": 0,
    "hasLike": 0,
    "hasCountStar": 0,
    "nestedJoinDepth": 0,
    "hasGroupBy": 0,
    "hasOrderBy": 0,
    "hasLimit": 0,
    "orConditionCount": 0
  }
}
```
