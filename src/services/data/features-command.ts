import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { FeatureExtractor } from '../ml/engine/feature-extractor';
import { ISQLQueryRecord } from './types';

interface IFeatureRecord extends ISQLQueryRecord {
  features: Record<string, number>;
}

export function createFeaturesCommand(): Command {
  const command = new Command('features');

  command
    .description('Extract features from collected queries')
    .option('-i, --input <path>', 'Input file (JSONL)', 'data/queries.jsonl')
    .option('-o, --output <path>', 'Output file with features', 'data/features.jsonl')
    .action(async (options) => {
      console.log(`[Features] Reading from: ${options.input}`);

      const content = readFileSync(options.input, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');

      const records: ISQLQueryRecord[] = lines.map(line => {
        try {
          return JSON.parse(line) as ISQLQueryRecord;
        } catch {
          return null;
        }
      }).filter((r): r is ISQLQueryRecord => r !== null);

      console.log(`[Features] Loaded ${records.length} queries`);

      const extractor = new FeatureExtractor();
      const featureRecords: IFeatureRecord[] = records.map(record => {
        const features = extractor.extractFromRecord(record);
        return {
          ...record,
          features: {
            hasJoin: features.hasJoin,
            joinCount: features.joinCount,
            hasSubquery: features.hasSubquery,
            subqueryCount: features.subqueryCount,
            hasFunctionInWhere: features.hasFunctionInWhere,
            selectStar: features.selectStar,
            tableCount: features.tableCount,
            whereColumnsIndexed: features.whereColumnsIndexed,
            estimatedRows: features.estimatedRows,
            hasOr: features.hasOr,
            hasUnion: features.hasUnion,
            hasLike: features.hasLike,
            hasCountStar: features.hasCountStar,
            nestedJoinDepth: features.nestedJoinDepth,
            hasGroupBy: features.hasGroupBy,
            hasOrderBy: features.hasOrderBy,
            hasLimit: features.hasLimit,
            orConditionCount: features.orConditionCount,
          },
        };
      });

      const output = featureRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
      writeFileSync(options.output, output);

      console.log(`[Features] Saved ${featureRecords.length} records to ${options.output}`);

      const stats = {
        total: featureRecords.length,
        withJoin: featureRecords.filter(r => r.features.hasJoin).length,
        withSubquery: featureRecords.filter(r => r.features.hasSubquery).length,
        withSelectStar: featureRecords.filter(r => r.features.selectStar).length,
        avgExecutionTime: featureRecords.reduce((sum, r) => sum + r.executionTimeMs, 0) / featureRecords.length,
      };

      console.log('[Features] Statistics:');
      console.log(`  Total queries: ${stats.total}`);
      console.log(`  With JOIN: ${stats.withJoin}`);
      console.log(`  With Subquery: ${stats.withSubquery}`);
      console.log(`  With SELECT *: ${stats.withSelectStar}`);
      console.log(`  Avg execution time: ${stats.avgExecutionTime.toFixed(2)}ms`);
    });

  return command;
}
