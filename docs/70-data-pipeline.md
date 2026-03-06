# Pipeline de Dados

## Visao Geral

O pipeline de dados e responsavel por coletar queries SQL de diversas fontes, armazena-las em formato JSONL e prepara-las para extracao de features e treinamento do modelo.

## Componentes

```
Slow Query Log ──→ SlowLogParser ──→ DatasetStorage ──→ queries.jsonl
Query Manual   ──→ createRecord  ──→ DatasetStorage ──→ queries.jsonl
```

## DatasetStorage

Classe responsavel pelo armazenamento de registros em formato JSONL (JSON Lines). Cada linha do arquivo e um objeto JSON independente.

**Arquivo:** `src/services/data/storage.ts`

### API

```typescript
const storage = new DatasetStorage('data/queries.jsonl');

// Adicionar um registro
storage.appendRecord(record);

// Adicionar multiplos registros
storage.appendRecords(records);

// Sobrescrever arquivo com todos os registros
storage.saveAll(records);

// Obter caminho do arquivo
storage.getOutputPath(); // 'data/queries.jsonl'
```

### Comportamento

- O construtor cria o diretorio automaticamente se nao existir (`recursive: true`)
- `appendRecord` e `appendRecords` adicionam ao final do arquivo (nao sobrescrevem)
- `saveAll` sobrescreve o arquivo inteiro
- Encoding UTF-8

## SlowLogParser

Parser para o formato de slow query log do MySQL. Extrai queries, tempos de execucao, banco de dados e timestamps.

**Arquivo:** `src/services/data/slow-log-parser.ts`

### Formato Suportado

O parser reconhece o formato padrao do MySQL slow query log:

```
# Time: 2024-01-15T10:30:00
# User@Host: app_user[app_user] @  [10.0.0.1]
# Query_time: 2.345678  Lock_time: 0.000123  Rows_sent: 100  Rows_examined: 50000
use mydb;
SET timestamp=1705312200;
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2024-01-01';
```

### Campos Extraidos

| Campo do Log | Campo do Registro | Transformacao |
|---|---|---|
| `# Time:` | `timestamp` | Parse ISO ou fallback para `new Date()` |
| `# Query_time:` | `executionTimeMs` | Segundos → milissegundos (arredondado) |
| `use <db>` | `database` | Nome do banco (suporta backticks) |
| `SET timestamp=` | `timestamp` | Unix timestamp → ISO string |
| Linhas da query | `query` | Concatenadas ate encontrar `;` |

### Uso

```typescript
const parser = new SlowLogParser();
const records = parser.parse('/var/log/mysql/slow.log');

// Cada registro:
// {
//   id: 'q_1705312200000_abc1234',
//   query: 'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.created_at > \'2024-01-01\'',
//   executionTimeMs: 2346,
//   database: 'mydb',
//   timestamp: '2024-01-15T10:30:00.000Z'
// }
```

### Regras de Parsing

1. Linhas com `#` sao metadados (Time, Query_time)
2. `use <db>` define o banco de dados corrente
3. `SET timestamp=` marca inicio de query e define o timestamp
4. Linhas seguintes sao concatenadas ate encontrar `;` (fim da query)
5. Queries multi-linha sao suportadas
6. Se nao houver `use`, o banco e `'unknown'`

## ISQLQueryRecord

Interface principal para registros de queries.

**Arquivo:** `src/services/data/types.ts`

```typescript
interface ISQLQueryRecord {
  id: string;              // ID unico (formato: q_<timestamp>_<random>)
  query: string;           // Query SQL
  executionTimeMs: number; // Tempo de execucao em milissegundos
  database: string;        // Nome do banco de dados
  timestamp: string;       // Timestamp ISO 8601
  executionPlan?: IExecutionPlan;  // Opcional: plano de execucao
  catalogInfo?: ICatalogInfo;      // Opcional: info de catalogo
}
```

## Formato JSONL

O arquivo `queries.jsonl` armazena um registro por linha:

```jsonl
{"id":"q_1705312200000_abc1234","query":"SELECT * FROM users WHERE id = 1","executionTimeMs":50,"database":"mydb","timestamp":"2024-01-15T10:30:00.000Z"}
{"id":"q_1705312200001_def5678","query":"SELECT u.name FROM users u JOIN orders o ON u.id = o.user_id","executionTimeMs":1500,"database":"mydb","timestamp":"2024-01-15T10:31:00.000Z"}
```

### Por Que JSONL?

- **Append-friendly**: Novas queries podem ser adicionadas sem reescrever o arquivo
- **Streaming**: Processamento linha a linha sem carregar tudo em memoria
- **Simples**: Sem dependencia de banco de dados
- **Versionavel**: Pode ser commitado em exemplos (`data/examples/`)

## Comando `collect`

**Arquivo:** `src/services/data/query-collector.ts`

### Importar de Slow Query Log

```bash
sql-ml collect --input /var/log/mysql/slow.log
sql-ml collect --input slow.log --output data/queries.jsonl
```

### Adicionar Query Manual

```bash
sql-ml collect \
  --query "SELECT * FROM users WHERE email = 'test@example.com'" \
  --time 250 \
  --database production \
  --timestamp "2024-01-15T10:00:00.000Z"
```

### Opcoes

| Opcao | Descricao | Padrao |
|---|---|---|
| `-i, --input <path>` | Slow query log do MySQL | - |
| `-o, --output <path>` | Arquivo JSONL de saida | `data/queries.jsonl` |
| `-q, --query <sql>` | Query individual | - |
| `-t, --time <ms>` | Tempo de execucao (ms) | `0` |
| `-d, --database <name>` | Nome do banco | `default` |
| `--timestamp <iso>` | Timestamp ISO | `now()` |

## Estrutura de Diretorios

```
data/
  queries.jsonl         # Queries coletadas (gitignored)
  features.jsonl        # Features extraidas (gitignored)
  examples/
    queries.jsonl       # 10 queries de exemplo (commitado)
    features.jsonl      # Features de exemplo (commitado)
```

O `.gitignore` usa o padrao `data/*` + `!data/examples/` para ignorar dados reais mas manter os exemplos no repositorio.
