import { IQueryRecord, IConsolidatorConfig, IConsolidatorStats, ILabelingConfig } from './types.js';

export class QueryConsolidator {
  private config: IConsolidatorConfig;

  constructor(config: Partial<IConsolidatorConfig> = {}) {
    this.config = {
      sources: config.sources || ['scanner', 'perf-schema', 'manual'],
      dedupeConfig: config.dedupeConfig || {
        ignoreParams: true,
        normalizeWhitespace: true,
      },
      labelingConfig: config.labelingConfig || {
        method: 'percentile',
        percentile: 90,
      },
    };
  }

  consolidate(queries: IQueryRecord[]): { records: IQueryRecord[]; stats: IConsolidatorStats } {
    const normalized = queries.map(q => ({
      ...q,
      normalized: this.normalizeQuery(q.query),
    }));

    const { unique, duplicates } = this.deduplicate(normalized);

    const labeled = this.applyLabels(unique);

    const stats = this.generateStats(labeled, duplicates.length);

    return { records: labeled, stats };
  }

  normalizeQuery(sql: string): string {
    let normalized = sql;

    if (this.config.dedupeConfig.normalizeWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (this.config.dedupeConfig.ignoreParams) {
      normalized = normalized.replace(/'[^']*'/g, '?');
      normalized = normalized.replace(/\d+/g, '?');
      normalized = normalized.replace(/\?\s*(,|\))/g, '?');
    }

    return normalized.toUpperCase();
  }

  private deduplicate(
    queries: (IQueryRecord & { normalized: string })[]
  ): { unique: IQueryRecord[]; duplicates: string[] } {
    const seen = new Map<string, IQueryRecord>();
    const duplicates: string[] = [];

    for (const q of queries) {
      const key = q.normalized;
      if (seen.has(key)) {
        duplicates.push(q.id);
      } else {
        const { normalized, ...record } = q;
        seen.set(key, record);
      }
    }

    return {
      unique: Array.from(seen.values()),
      duplicates,
    };
  }

  private applyLabels(queries: IQueryRecord[]): IQueryRecord[] {
    const config = this.config.labelingConfig;

    const withTiming = queries.filter(q => q.hasTiming && q.executionTimeMs !== undefined);
    const withoutTiming = queries.filter(q => !q.hasTiming || q.executionTimeMs === undefined);

    const thresholds = this.calculateThresholds(withTiming, config);

    const labeled = queries.map(q => {
      if (!q.hasTiming || q.executionTimeMs === undefined) {
        return { ...q, label: 'unknown' as const };
      }

      const time = q.executionTimeMs;
      let label: 'fast' | 'medium' | 'slow';

      if (time > thresholds.slow) {
        label = 'slow';
      } else if (time > thresholds.medium) {
        label = 'medium';
      } else {
        label = 'fast';
      }

      return { ...q, label };
    });

    return labeled;
  }

  private calculateThresholds(
    queries: IQueryRecord[],
    config: ILabelingConfig
  ): { slow: number; medium: number } {
    if (queries.length === 0) {
      return { slow: 500, medium: 200 };
    }

    const times = queries
      .map(q => q.executionTimeMs!)
      .sort((a, b) => a - b);

    switch (config.method) {
      case 'percentile': {
        const p = config.percentile || 90;
        const p75 = times[Math.floor(times.length * 0.75)] || 200;
        const p90 = times[Math.floor(times.length * p / 100)] || 500;
        return { slow: p90, medium: p75 };
      }
      case 'iqr': {
        const q1 = times[Math.floor(times.length * 0.25)] || 100;
        const q3 = times[Math.floor(times.length * 0.75)] || 300;
        const iqr = q3 - q1;
        return { slow: q3 + 1.5 * iqr, medium: q3 };
      }
      case 'fixed':
      default: {
        const slow = config.fixed || 500;
        return { slow, medium: slow * 0.5 };
      }
    }
  }

  private generateStats(queries: IQueryRecord[], duplicateCount: number): IConsolidatorStats {
    const bySource: Record<string, number> = {};
    const byLabel: Record<string, number> = {};

    for (const q of queries) {
      bySource[q.source] = (bySource[q.source] || 0) + 1;
      const label = q.label || 'unknown';
      byLabel[label] = (byLabel[label] || 0) + 1;
    }

    const withTiming = queries.filter(q => q.hasTiming && q.executionTimeMs);
    const thresholds = this.calculateThresholds(withTiming, this.config.labelingConfig);

    return {
      total: queries.length,
      bySource,
      byLabel,
      threshold: {
        method: this.config.labelingConfig.method,
        slow: thresholds.slow,
        medium: thresholds.medium,
      },
      deduplicated: duplicateCount,
    };
  }
}
