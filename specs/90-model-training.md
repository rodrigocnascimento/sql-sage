# Treinamento de Modelo

## Visao Geral

O `ModelTrainer` implementa o pipeline completo de treinamento do modelo de ML. Carrega dados de features, prepara tensores, constroi o modelo BiLSTM, treina e salva os artefatos.

**Arquivo:** `src/services/ml/train.ts`

## Arquitetura do Modelo de Treinamento

```
Token Input (20 tokens) ──→ Embedding(64) ──→ BiLSTM(32) ──┐
                                                             ├──→ Concatenate ──→ Dense(32, relu) ──→ Dense(1, sigmoid)
Meta Input (18 features) ──→ Dense(16, relu) ───────────────┘
```

### Hiperparametros do Modelo

| Parametro | Valor |
|---|---|
| VOCAB_SIZE | 100 |
| SEQ_LEN | 20 tokens |
| META_FEATURES | 18 |
| Embedding dim | 64 |
| BiLSTM units | 32 |
| Meta dense | 16 |
| Hidden dense | 32 |
| Output | 1 (sigmoid) |
| Loss | binaryCrossentropy |
| Optimizer | Adam |
| Mask zero | true |

## Pipeline de Treinamento

### 1. Carregar Dataset

Le o arquivo `features.jsonl` e parseia cada linha como `IFeatureRecord`:

```typescript
interface IFeatureRecord {
  query: string;
  executionTimeMs: number;
  database: string;
  timestamp: string;
  features: Record<string, number>;  // 18 features
}
```

- Linhas em branco e JSON invalido sao ignorados
- Registros sem campo `features` sao filtrados
- **Minimo de 10 amostras** para iniciar treinamento

### 2. Preparar Dados

Para cada registro:

1. **Token Sequence (XSeq)**: A query e tokenizada em palavras, cada palavra e convertida em indice via hash simples (`hash % VOCAB_SIZE`), padded ate 20 tokens
2. **Meta Features (XMeta)**: As 18 features extraidas do campo `features`
3. **Label (y)**: Classificacao binaria baseada no tempo de execucao:
   - `executionTimeMs / maxExecutionTime > 0.5` → label `1` (lenta)
   - Caso contrario → label `0` (rapida)

### 3. Construir Modelo

O modelo usa duas entradas:

- **token_input**: Sequencia de 20 tokens → Embedding → BiLSTM bidirecional
- **meta_input**: 18 features numericas → Dense(16)

As saidas sao concatenadas e passam por Dense(32) → Dense(1, sigmoid).

### 4. Treinar

```typescript
model.fit([XSeq, XMeta], y, {
  epochs: config.epochs,
  batchSize: config.batchSize,
  validationSplit: config.validationSplit,
  shuffle: true,
  verbose: 1
});
```

### 5. Salvar Artefatos

Dois arquivos sao salvos no diretorio de saida:

- `model-<version>.json` - Topologia do modelo (JSON do TensorFlow.js)
- `training-result-<version>.json` - Metricas de treinamento

O versionamento usa formato `v<timestamp>` (ex: `v1705312200000`).

**Nota:** O salvamento usa `model.toJSON()` + `writeFileSync` porque `tf.model.save('file://...')` requer `@tensorflow/tfjs-node`, que nao e dependencia do projeto.

## Configuracao de Treinamento

```typescript
interface ITrainingConfig {
  epochs: number;         // Numero de epochs (padrao: 50)
  batchSize: number;      // Tamanho do batch (padrao: 32)
  validationSplit: number; // Fracao para validacao (padrao: 0.2)
  learningRate: number;    // Taxa de aprendizado (padrao: 0.001)
}
```

## Resultado do Treinamento

```typescript
interface ITrainingResult {
  modelVersion: string;     // ex: 'v1705312200000'
  epochs: number;           // Epochs executados
  finalLoss: number;        // Loss final
  finalAccuracy: number;    // Accuracy final (0-1)
  trainSamples: number;     // Amostras de treino
  valSamples: number;       // Amostras de validacao
  metrics: {
    loss: number[];         // Loss por epoch
    valLoss: number[];      // Validation loss por epoch
    accuracy: number[];     // Accuracy por epoch
    valAccuracy: number[];  // Validation accuracy por epoch
  };
}
```

## Comando `train`

**Arquivo:** `src/services/data/train-command.ts`

```bash
# Treinamento padrao
sql-sage train

# Treinamento customizado
sql-sage train --epochs 100 --batch-size 64 --learning-rate 0.0005

# Especificar entrada/saida
sql-sage train --input data/features.jsonl --output models/v2
```

### Opcoes

| Opcao | Descricao | Padrao |
|---|---|---|
| `-i, --input <path>` | Arquivo de features JSONL | `data/features.jsonl` |
| `-o, --output <path>` | Diretorio do modelo | `models` |
| `-e, --epochs <number>` | Epochs de treinamento | `50` |
| `-b, --batch-size <number>` | Tamanho do batch | `32` |
| `-v, --validation-split <number>` | Split de validacao | `0.2` |
| `-l, --learning-rate <number>` | Taxa de aprendizado | `0.001` |

### Saida Esperada

```
[Train] Starting model training...
[Train] Configuration:
  Epochs: 50
  Batch size: 32
  Validation split: 0.2
  Learning rate: 0.001
[Train] Loading dataset...
[Train] Loaded 150 samples
[Train] Preparing features...
[Train] Building model...
[Train] Starting training for 50 epochs...
...
[Train] Training completed!
  Model version: v1705312200000
  Final loss: 0.4523
  Final accuracy: 78.50%
  Training samples: 120
  Validation samples: 30
  Model saved to: models/model-v1705312200000
```

## Estrutura de Diretorios

```
models/
  model-v1705312200000.json              # Topologia do modelo (gitignored)
  training-result-v1705312200000.json    # Metricas (gitignored)
  examples/
    model-v1-example.json                # Modelo de exemplo (commitado)
    training-result-v1-example.json      # Resultado de exemplo (commitado)
```

O `.gitignore` usa `models/*` + `!models/examples/` para ignorar modelos gerados mas manter exemplos.

## Limitacoes Atuais

1. **Tokenizacao simples**: Usa hash de palavras, nao um vocabulario aprendido
2. **Labels binarias**: Classifica queries como "rapida" ou "lenta" (threshold 0.5 do max)
3. **Sem salvamento de pesos**: Salva apenas a topologia do modelo (JSON), nao os pesos treinados
4. **CatalogGatherer mock**: Informacoes de catalogo sao simuladas, nao obtidas do banco real
5. **Sem reload de modelo**: O modelo treinado nao e recarregado automaticamente pelo `analyze`
