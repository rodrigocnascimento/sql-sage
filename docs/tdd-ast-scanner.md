# TDD: AST-based TypeORM Scanner

## 1. Objective & Scope

- **What:** Substituir o scanner baseado em regex por um scanner baseado em AST para detecção de queries TypeORM
- **Why:** Resolver limitações do regex (multi-linha, parênteses aninhados, formatação variável)
- **Target:** `docs/tdd-ast-scanner.md`

## 2. Proposed Technical Strategy

### Dependencies
- Adicionar `ts-morph` (ou similar) para parsing AST de TypeScript

### Arquitetura
- Novo serviço: `src/services/scanner/ast-parser.ts`
- Reescrever strategies para usar AST em vez de regex

### Padrões TypeORM Suportados (v1)
- **Find**: find, findOne, findOneOrFail, findOneBy, findBy, findAndCount, count, countBy, exists, existsBy
- **Save**: save, create, insert, upsert
- **Delete**: delete, remove, softDelete, softRemove
- **Update**: update, updateAll, increment, decrement

## 3. Implementation Plan

1. Adicionar `ts-morph` como dependência
2. Criar `ast-parser.ts` com utilitários AST
3. Modificar strategies para usar AST
4. Testar no medical-calendar
5. Verificar se todos os testes passam
