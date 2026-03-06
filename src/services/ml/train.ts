import * as tf from '@tensorflow/tfjs';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export interface ITrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  learningRate: number;
}

export interface ITrainingResult {
  modelVersion: string;
  epochs: number;
  finalLoss: number;
  finalAccuracy: number;
  trainSamples: number;
  valSamples: number;
  metrics: {
    loss: number[];
    valLoss: number[];
    accuracy: number[];
    valAccuracy: number[];
  };
}

export interface IFeatureRecord {
  query: string;
  executionTimeMs: number;
  database: string;
  timestamp: string;
  features: Record<string, number>;
}

export class ModelTrainer {
  private model: tf.LayersModel | null = null;
  private readonly VOCAB_SIZE = 100;
  private readonly SEQ_LEN = 20;
  private readonly META_FEATURES = 18;

  async train(
    inputPath: string,
    outputDir: string,
    config: ITrainingConfig = { epochs: 50, batchSize: 32, validationSplit: 0.2, learningRate: 0.001 }
  ): Promise<ITrainingResult> {
    console.log('[Train] Loading dataset...');
    const records = this.loadDataset(inputPath);
    
    if (records.length < 10) {
      throw new Error('Need at least 10 samples for training');
    }

    console.log(`[Train] Loaded ${records.length} samples`);

    console.log('[Train] Preparing features...');
    const { XSeq, XMeta, y } = this.prepareData(records);

    console.log('[Train] Building model...');
    this.buildTrainingModel();

    console.log(`[Train] Starting training for ${config.epochs} epochs...`);
    const history = await this.trainModel(XSeq, XMeta, y, config);

    console.log('[Train] Saving model...');
    const modelVersion = await this.saveModel(outputDir);

    console.log('[Train] Building result...');
    const valSamples = Math.floor(records.length * config.validationSplit);
    const trainSamples = records.length - valSamples;

    const lossArray = history.history.loss as number[];
    const accArray = history.history.acc as number[];
    const valLossArray = history.history.val_loss as number[];
    const valAccArray = history.history.val_acc as number[];

    const result: ITrainingResult = {
      modelVersion,
      epochs: config.epochs,
      finalLoss: lossArray[lossArray.length - 1] || 0,
      finalAccuracy: accArray[accArray.length - 1] || 0,
      trainSamples,
      valSamples,
      metrics: {
        loss: lossArray,
        valLoss: valLossArray,
        accuracy: accArray,
        valAccuracy: valAccArray,
      },
    };

    this.saveTrainingResult(outputDir, result);

    return result;
  }

  private loadDataset(filePath: string): IFeatureRecord[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    return lines
      .map(line => {
        try {
          return JSON.parse(line) as IFeatureRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is IFeatureRecord => r !== null && r.features !== undefined);
  }

  private prepareData(records: IFeatureRecord[]): { XSeq: tf.Tensor; XMeta: tf.Tensor; y: tf.Tensor } {
    const featureKeys = [
      'hasJoin', 'joinCount', 'hasSubquery', 'subqueryCount', 'hasFunctionInWhere',
      'selectStar', 'tableCount', 'whereColumnsIndexed', 'estimatedRows', 'hasOr',
      'hasUnion', 'hasLike', 'hasCountStar', 'nestedJoinDepth', 'hasGroupBy',
      'hasOrderBy', 'hasLimit', 'orConditionCount'
    ];

    const maxExecutionTime = Math.max(...records.map(r => r.executionTimeMs));

    const XSeqData: number[][] = [];
    const XMetaData: number[][] = [];
    const yData: number[] = [];

    for (const record of records) {
      const tokenSeq = this.tokenizeQuery(record.query);
      XSeqData.push(tokenSeq);

      const metaFeatures = featureKeys.map(key => record.features[key] || 0);
      XMetaData.push(metaFeatures);

      const normalizedTime = record.executionTimeMs / maxExecutionTime;
      const performanceScore = normalizedTime > 0.5 ? 1 : 0;
      yData.push(performanceScore);
    }

    const XSeq = tf.tensor2d(XSeqData);
    const XMeta = tf.tensor2d(XMetaData);
    const y = tf.tensor2d(yData, [yData.length, 1]);

    return { XSeq, XMeta, y };
  }

  private tokenizeQuery(query: string): number[] {
    const words = query.toUpperCase().match(/\b\w+\b/g) || [];
    const tokens: number[] = [];
    
    for (const word of words.slice(0, this.SEQ_LEN)) {
      const hash = this.simpleHash(word);
      tokens.push(hash % this.VOCAB_SIZE);
    }

    while (tokens.length < this.SEQ_LEN) {
      tokens.push(0);
    }

    return tokens;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private buildTrainingModel(): void {
    const inputSeq = tf.input({ shape: [this.SEQ_LEN], name: 'token_input' });
    
    const embedding = tf.layers.embedding({
      inputDim: this.VOCAB_SIZE + 2,
      outputDim: 64,
      maskZero: true
    }).apply(inputSeq);

    const biLstm = tf.layers.bidirectional({
      layer: tf.layers.lstm({ 
        units: 32, 
        returnSequences: false,
        recurrentDropout: 0.2 
      }) as tf.RNN
    }).apply(embedding);

    const inputMeta = tf.input({ shape: [this.META_FEATURES], name: 'meta_input' });
    
    const metaDense = tf.layers.dense({ 
      units: 16, 
      activation: 'relu' 
    }).apply(inputMeta);

    const concatenated = tf.layers.concatenate().apply([biLstm as tf.SymbolicTensor, metaDense as tf.SymbolicTensor]);

    const hidden1 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(concatenated);
    const output = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'performance_score' }).apply(hidden1);

    this.model = tf.model({ inputs: [inputSeq, inputMeta], outputs: output as tf.SymbolicTensor });
    
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  private async trainModel(
    XSeq: tf.Tensor,
    XMeta: tf.Tensor,
    y: tf.Tensor,
    config: ITrainingConfig
  ): Promise<tf.History> {
    if (!this.model) throw new Error('Model not built');

    const history = await this.model.fit([XSeq, XMeta], y, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: config.validationSplit,
      shuffle: true,
      verbose: 1,
    });

    return history;
  }

  private async saveModel(outputDir: string): Promise<string> {
    if (!this.model) throw new Error('Model not trained');

    const fullPath = outputDir;
    
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }

    const version = `v${Date.now()}`;
    const modelJsonPath = `${fullPath}/model-${version}.json`;
    
    const modelJson = this.model.toJSON();
    writeFileSync(modelJsonPath, JSON.stringify(modelJson, null, 2));

    console.log(`[Train] Model JSON saved to ${modelJsonPath}`);
    console.log(`[Train] Model version: ${version}`);

    return version;
  }

  private saveTrainingResult(outputDir: string, result: ITrainingResult): void {
    const resultPath = `${outputDir}/training-result-${result.modelVersion}.json`;
    writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`[Train] Training result saved to ${resultPath}`);
  }
}
