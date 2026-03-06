# Contribuindo

Guia para contribuir com o projeto `sql-ml-cli`.

## Pre-requisitos

- Node.js >= 18
- npm

## Setup do Ambiente

```bash
git clone <repo-url>
cd sql-ml-cli
npm install
```

## Comandos de Desenvolvimento

```bash
npm run dev             # Executar com tsx (hot reload)
npm run build           # Compilar TypeScript para dist/
npm run start           # Executar JavaScript compilado
npm run test            # Rodar testes uma vez
npm run test:watch      # Testes em modo watch
npm run test:coverage   # Testes com relatorio de cobertura
npx tsc --noEmit        # Verificacao de tipos sem compilar
```

### Rodar um teste especifico

```bash
npx vitest run --testNamePattern "nome do teste"
npx vitest run src/services/ml/engine/feature-extractor.test.ts
```

## Estrutura do Projeto

```
src/
  index.ts                          # Entry point CLI
  services/
    ml-prediction.service.ts        # Servico de predicao
    data/                           # Pipeline de dados
      storage.ts                    # Armazenamento JSONL
      slow-log-parser.ts            # Parser de slow query log
      query-collector.ts            # Comando collect
      features-command.ts           # Comando features
      train-command.ts              # Comando train
      types.ts                      # Interfaces de dados
    ml/
      train.ts                      # Pipeline de treinamento
      engine/                       # Motor de ML
        index.ts                    # Orquestrador
        model.ts                    # Modelo BiLSTM
        feature-engineer.ts         # Feature engineer v0.1
        feature-extractor.ts        # Feature extractor v0.2
        explain-parser.ts           # Parser de EXPLAIN
        catalog-gatherer.ts         # Coleta de catalogo
        schema-registry.ts          # Registro de schemas
        types.ts                    # Interfaces ML
docs/                               # Documentacao tecnica
data/
  examples/                         # Dados de exemplo (commitados)
models/
  examples/                         # Modelos de exemplo (commitados)
```

## Convencoes de Codigo

### Geral

- ES Modules com CommonJS output (tsconfig `module: "CommonJS"`)
- 2 espacos para indentacao
- Aspas simples
- Ponto e virgula no final de statements

### Imports

```typescript
// Externos primeiro, depois locais
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { MLPredictionService } from './services/ml-prediction.service';
```

- Imports relativos sem extensao `.js` (o CommonJS resolve automaticamente)
- Sem aliases (`@/`, `~/`, etc.) - usar caminhos relativos (`../`, `./`)

### TypeScript

- Strict mode habilitado
- Tipos de retorno explicitos em funcoes
- Interfaces com prefixo `I` (ex: `ISQLInsight`, `IExtractedFeatures`)
- `unknown` para erros capturados, com narrowing via type guards

### Nomenclatura

| Elemento | Padrao | Exemplo |
|---|---|---|
| Classes | PascalCase | `MLPredictionService` |
| Interfaces | PascalCase com `I` | `ISQLQueryRecord` |
| Funcoes/variaveis | camelCase | `getStatus()`, `const sql` |
| Constantes | UPPER_SNAKE_CASE | `VOCAB_SIZE` |
| Arquivos | kebab-case | `ml-prediction.service.ts` |

### Error Handling

```typescript
try {
  // operacao
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
```

### Logging

- `console.log` para saida geral
- `console.error` para erros
- Prefixo com colchetes: `[MLPredictionService] Engine initialized`

## Testes

- Framework: Vitest
- Cobertura atual: ~83% statements, 234 testes
- Testes ficam junto ao codigo fonte: `feature-extractor.ts` → `feature-extractor.test.ts`

### Padrao de Teste

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MinhaClasse } from './minha-classe';

describe('MinhaClasse', () => {
  let instance: MinhaClasse;

  beforeEach(() => {
    instance = new MinhaClasse();
  });

  describe('meuMetodo', () => {
    it('should do something specific', () => {
      const result = instance.meuMetodo('input');
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking

Para modulos com I/O (fs, etc.), usar `vi.mock`:

```typescript
import { vi } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));
```

## TensorFlow.js

- Import: `import * as tf from '@tensorflow/tfjs'`
- Sempre dar dispose em tensores apos uso para evitar memory leaks
- Usar async/await para operacoes de modelo
- O projeto usa `@tensorflow/tfjs` (CPU puro), nao `@tensorflow/tfjs-node`

## Commits

O projeto segue Conventional Commits:

```
<tipo>(<escopo>): <descricao>
```

Tipos permitidos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`

Exemplos:
- `feat(ml): add model training pipeline`
- `fix(parser): handle multi-line queries`
- `docs(readme): add training workflow`
- `test(ml): add feature extractor tests`

## Branches

- `main` e protegida - sem commits diretos em geral
- Features: `feat/<issue-id>-<slug>`
- Bugfixes: `fix/<issue-id>-<slug>`

## Documentacao

- Documentacao tecnica em `docs/` (portugues)
- Novos componentes devem ter um doc correspondente
- Formato: `docs/<numero>-<slug>.md`
