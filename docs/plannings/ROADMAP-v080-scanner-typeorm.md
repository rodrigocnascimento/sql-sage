# Roadmap v0.8.0 - Scanner TypeORM

**Código:** `feat/scanner-typeorm`  
**Versão:** v0.8.0  
**Data Planejada:** 2026-03-XX  
**Status:** ⏳ Próxima versão

---

## Escopo

Implementação do scanner que varre projetos TypeORM externos e identifica queries SQL.

---

## Objetivos

1. **Scanner Estático** - Varre arquivos `.ts` de um diretório especificado
2. **Identificação de Patterns** - Detecta 4 padrões TypeORM iniciais
3. **Geração de SQL** - Converte patterns identificados em queries SQL executáveis
4. **Extensibilidade** - Padrão Strategy para adicionar novos patterns facilmente

---

## Arquitetura - Strategy Pattern

### Interface Base

```typescript
interface IQueryPatternStrategy {
  readonly patternId: string;
  readonly patternName: string;
  
  /**
   * Verifica se o código contém este pattern
   */
  match(code: string): boolean;
  
  /**
   * Extrai informações relevantes do código
   */
  extract(code: string): IExtractedQuery | null;
  
  /**
   * Converte a extração em SQL executável
   */
  toSQL(extraction: IExtractedQuery): string;
}
```

### Factory

```typescript
class QueryPatternFactory {
  private strategies: Map<string, IQueryPatternStrategy> = new Map();
  
  register(strategy: IQueryPatternStrategy): void {
    this.strategies.set(strategy.patternId, strategy);
  }
  
  extractAll(code: string): IExtractedQuery[] {
    const results: IExtractedQuery[] = [];
    for (const strategy of this.strategies.values()) {
      if (strategy.match(code)) {
        const extraction = strategy.extract(code);
        if (extraction) {
          results.push(extraction);
        }
      }
    }
    return results;
  }
  
  getRegisteredPatterns(): IQueryPatternStrategy[] {
    return Array.from(this.strategies.values());
  }
}
```

---

## Patterns Iniciais

| Pattern ID | Descrição | Exemplo |
|------------|-----------|---------|
| `query-builder` | QueryBuilder chains | `createQueryBuilder().select().from().where()` |
| `repository-find` | Repository find methods | `find({ where: { id: 1 } })` |
| `raw-query` | Raw SQL queries | `query('SELECT * FROM users')` |
| `query-runner` | QueryRunner usage | `queryRunner.query()` |

### 1. QueryBuilder Strategy

**Detecção:**
```typescript
match(code: string): boolean {
  return code.includes('createQueryBuilder()');
}
```

**Extração:**
```typescript
// Input código:
const users = await this.userRepository
  .createQueryBuilder('user')
  .select(['user.id', 'user.name'])
  .where('user.active = :active', { active: true })
  .leftJoin('user.posts', 'posts')
  .getMany();

// Output:
{
  "patternId": "query-builder",
  "entity": "user",
  "select": ["user.id", "user.name"],
  "joins": [{"alias": "posts", "relation": "user.posts"}],
  "where": "user.active = :active",
  "sql": "SELECT user.id, user.name FROM user user LEFT JOIN posts posts ON ... WHERE user.active = ?"
}
```

### 2. Repository Find Strategy

**Detecção:**
```typescript
match(code: string): boolean {
  return /\.find\(|\.findOne\(|\.findAndCount\(/.test(code);
}
```

**Extração:**
```typescript
// Input:
const posts = await postRepository.find({
  where: {
    id: 1,
    status: 'published',
  },
  relations: ['categories', 'author'],
  take: 10,
});

// Output:
{
  "patternId": "repository-find",
  "entity": "Post",
  "where": { "id": 1, "status": "published" },
  "relations": ["categories", "author"],
  "take": 10,
  "sql": "SELECT * FROM post WHERE id = 1 AND status = 'published' LIMIT 10"
}
```

### 3. Raw Query Strategy

**Detecção:**
```typescript
match(code: string): boolean {
  return /\.query\(|\.execute\(/.test(code);
}
```

**Extração:**
```typescript
// Input:
const result = await connection.query(
  'SELECT u.*, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at > ? GROUP BY u.id',
  [new Date('2024-01-01')]
);

// Output:
{
  "patternId": "raw-query",
  "sql": "SELECT u.*, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at > ? GROUP BY u.id",
  "params": [new Date('2024-01-01')]
}
```

### 4. QueryRunner Strategy

**Detecção:**
```typescript
match(code: string): boolean {
  return /queryRunner\.(query|execute)/.test(code);
}
```

---

## Estrutura de Arquivos

```
src/
  services/
    scanner/
      index.ts                    # CLI command
      scanner.service.ts         # Orquestrador principal
      types.ts                   # Interfaces
      strategies/
        index.ts                 # Factory + registro de strategies
        base.strategy.ts         # Classe base abstrata
        query-builder.strategy.ts
        repository-find.strategy.ts
        raw-query.strategy.ts
        query-runner.strategy.ts
      parser/
        typescript-parser.ts     # Parseador de código TS
```

---

## Output

### JSONL (para pipeline)

```jsonl
{"patternId": "query-builder", "entity": "User", "sql": "SELECT user.id, user.name FROM user user WHERE user.active = ?", "file": "src/user.service.ts", "line": 42, "params": [true]}
{"patternId": "repository-find", "entity": "Post", "sql": "SELECT * FROM post WHERE id = ? AND status = ?", "file": "src/post.repository.ts", "line": 18, "params": [1, "published"]}
{"patternId": "raw-query", "entity": null, "sql": "SELECT u.* FROM users u", "file": "src/db.ts", "line": 5}
```

---

## CLI

```bash
# Escaneia projeto TypeORM
sql-sage scan <project-dir>

# Output customizado
sql-sage scan <project-dir> --output out.jsonl

# Apenas pattern específico
sql-sage scan <project-dir> --pattern query-builder

# Lista patterns disponíveis
sql-sage scan --list-patterns

# Verbose
sql-sage scan <project-dir> --verbose
```

---

## Extensibilidade

Para adicionar novo pattern (ex: Prisma):

```typescript
// 1. Criar a strategy
class PrismaPatternStrategy implements IQueryPatternStrategy {
  readonly patternId = 'prisma';
  readonly patternName = 'Prisma Client';
  
  match(code: string): boolean {
    return code.includes('prisma.') || code.includes('$queryRaw');
  }
  
  extract(code: string): IExtractedQuery | null {
    // implementação
  }
  
  toSQL(extraction: IExtractedQuery): string {
    // conversão para SQL
  }
}

// 2. Registrar
const factory = new QueryPatternFactory();
factory.register(new PrismaPatternStrategy());

// Pronto! Scanner detecta queries Prisma
```

---

## Critérios de Aceitação

- [ ] Scanner varre diretório especificado
- [ ] Identifica os 4 patterns iniciais
- [ ] Gera SQL executável para cada pattern
- [ ] Padrão Strategy permite adicionar novos patterns sem modificar código existente
- [ ] Output em formato JSONL compatível com pipeline
- [ ] CLI funcional: `sql-sage scan <project-dir>`
- [ ] Tests cobrindo strategies
- [ ] TypeScript compila sem erros

---

## TDDs Associados

- `docs/tdd-scanner-architecture.md` - Arquitetura geral do scanner
- `docs/tdd-query-builder-strategy.md` - Implementação QueryBuilder
- `docs/tdd-repository-find-strategy.md` - Implementação Repository find
- `docs/tdd-raw-query-strategy.md` - Implementação Raw queries
- `docs/tdd-query-runner-strategy.md` - Implementação QueryRunner

---

## Dependências

- Nenhuma nova dependência externa
- Reutiliza parsing existente do projeto
- Usa `glob` ou similar para encontrar arquivos `.ts`

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Parse de código TS complexo | Usar patterns regex simples inicialmente |
| Queries dinâmicas | Documentar limitação, permitir revisão manual |
| Performance com projetos grandes | Adicionar opções de filtro/path |

---

## Próxima Versão

v0.8.1 - Performance Schema Integration
