# Roadmap v0.8.1 - Scanner TypeORM (AST)

**Código:** `feat/scanner-typeorm-v080`  
**Versão:** v0.8.1  
**Data:** 2026-03-14  
**Status:** ✅ Concluída

---

## Escopo

Implementação do scanner que varre projetos TypeORM externos e identifica queries SQL usando parsing AST.

---

## Objetivos

1. **Scanner Estático** - Varre arquivos `.ts` de um diretório especificado
2. **Parsing AST** - Usa ts-morph para parsing preciso do código TypeScript
3. **Identificação de Patterns** - Detecta 11 padrões TypeORM
4. **Suporte Multi-linha** - Detecta queries em código que span múltiplas linhas

---

## Arquitetura - AST-based (ts-morph)

### TypeOrmAstParser

```typescript
import { Project, Node, CallExpression } from 'ts-morph';

class TypeOrmAstParser {
  parseFile(filePath: string): IMethodCall[] {
    const results: IMethodCall[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = this.project.createSourceFile(filePath, content);
    
    sourceFile.forEachDescendant((node: Node) => {
      if (Node.isCallExpression(node)) {
        const methodCall = this.extractMethodCall(node);
        if (methodCall) results.push(methodCall);
      }
    });
    
    return results;
  }
}
```

### Padrões Suportados

| Categoria | Métodos |
|-----------|---------|
| Find | find, findOne, findOneOrFail, findOneBy, findBy, findAndCount, count, countBy, exists, existsBy |
| Save | save, create, insert, upsert |
| Delete | delete, remove, softDelete, softRemove |
| Update | update, updateAll, increment, decrement |

---

## Estrutura de Arquivos

```
src/
  services/
    scanner/
      index.ts              # CLI command
      scanner.service.ts    # Orquestrador principal
      ast-parser.ts         # Parser AST (ts-morph)
      types.ts              # Interfaces
```

---

## Output

### JSONL (para pipeline)

```jsonl
{"patternId": "repository-find", "entity": "User", "sql": "SELECT * FROM users", "file": "src/user.service.ts", "line": 25}
{"patternId": "repository-save", "entity": "Post", "sql": "INSERT INTO posts (...) VALUES (...)", "file": "src/post.service.ts", "line": 42}
```

---

## CLI

```bash
# Escaneia projeto TypeORM
sql-sage scan <project-dir>

# Output customizado
sql-sage scan <project-dir> --output out.jsonl

# Apenas pattern específico
sql-sage scan <project-dir> --pattern repository-find

# Lista patterns disponíveis
sql-sage scan --list-patterns

# Verbose
sql-sage scan <project-dir> --verbose
```

---

## Critérios de Aceitação

- [x] Scanner varre diretório especificado
- [x] Identifica 11 padrões TypeORM
- [x] Suporta código multi-linha
- [x] Output em formato JSONL compatível com pipeline
- [x] CLI funcional: `sql-sage scan <project-dir>`
- [x] Tests passando (347)
- [x] TypeScript compila sem erros
- [x] Dependência ts-morph adicionada

---

## TDDs Associados

- `docs/tdd-ast-scanner.md` - Parser AST

---

## Dependências

- ts-morph (novo)

---

## Resultados

- **Antes (regex):** 3 queries detectadas
- **Depois (AST):** 11 queries detectadas no medical-calendar

---

## Próxima Versão

v0.8.2 - Performance Schema Integration
