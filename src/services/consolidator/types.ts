export interface IConsolidatorConfig {
  sources: ('scanner' | 'perf-schema' | 'manual')[];
  dedupeConfig: IDedupeConfig;
  labelingConfig: ILabelingConfig;
}

export interface IDedupeConfig {
  ignoreParams: boolean;
  normalizeWhitespace: boolean;
}

export interface ILabelingConfig {
  method: 'percentile' | 'iqr' | 'fixed';
  percentile?: number;
  fixed?: number;
}

export interface IQueryRecord {
  id: string;
  query: string;
  source: 'scanner' | 'perf-schema' | 'manual';
  hasTiming: boolean;
  executionTimeMs?: number;
  label?: 'fast' | 'medium' | 'slow' | 'unknown';
  database?: string;
  timestamp?: string;
}

export interface IConsolidatorStats {
  total: number;
  bySource: Record<string, number>;
  byLabel: Record<string, number>;
  threshold: {
    method: string;
    slow?: number;
    medium?: number;
  };
  deduplicated: number;
}
