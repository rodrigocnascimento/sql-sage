import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { QueryConsolidator } from './consolidator/query-consolidator.js';
import { IQueryRecord, ILabelingConfig } from './consolidator/types.js';

export function createConsolidateCommand(): Command {
  return new Command('consolidate')
    .description('Consolidate queries from multiple sources')
    .option('-i, --input <files...>', 'Input JSONL files (comma-separated sources)')
    .option('-o, --output <file>', 'Output file', 'data/consolidated.jsonl')
    .option('-s, --sources <sources>', 'Sources: scanner,perf-schema,manual', 'scanner,perf-schema')
    .option('--threshold-method <method>', 'Labeling method: percentile,iqr,fixed', 'percentile')
    .option('--threshold-p <percentile>', 'Percentile for threshold (default: 90)', '90')
    .option('--threshold-fixed <ms>', 'Fixed threshold in ms (for fixed method)', '500')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: {
      input?: string[];
      output?: string;
      sources?: string;
      thresholdMethod?: string;
      thresholdP?: string;
      thresholdFixed?: string;
      verbose?: boolean;
    }) => {
      const sources = (options.sources || 'scanner,perf-schema').split(',');
      const labelingConfig: ILabelingConfig = {
        method: (options.thresholdMethod || 'percentile') as 'percentile' | 'iqr' | 'fixed',
        percentile: options.thresholdP ? parseInt(options.thresholdP, 10) : 90,
        fixed: options.thresholdFixed ? parseInt(options.thresholdFixed, 10) : 500,
      };

      const consolidator = new QueryConsolidator({
        sources: sources as ('scanner' | 'perf-schema' | 'manual')[],
        labelingConfig,
      });

      const queries: IQueryRecord[] = [];

      if (options.input) {
        for (const file of options.input) {
          if (!existsSync(file)) {
            console.error(`[Consolidate] File not found: ${file}`);
            continue;
          }

          const content = readFileSync(file, 'utf-8');
          const lines = content.trim().split('\n').filter(l => l.trim());
          
          let source: 'scanner' | 'perf-schema' | 'manual' = 'manual';
          if (file.includes('scanned')) source = 'scanner';
          else if (file.includes('perf')) source = 'perf-schema';

          for (const line of lines) {
            try {
              const record = JSON.parse(line);
              queries.push({
                ...record,
                source: record.source || source,
                hasTiming: record.executionTimeMs !== undefined,
              });
            } catch {
              console.warn(`[Consolidate] Failed to parse line: ${line.substring(0, 50)}...`);
            }
          }

          if (options.verbose) {
            console.log(`[Consolidate] Loaded ${lines.length} queries from ${file}`);
          }
        }
      }

      console.log(`[Consolidate] Consolidating ${queries.length} queries...`);

      const { records, stats } = consolidator.consolidate(queries);

      console.log(`\nConsolidation complete!`);
      console.log(`  Total unique queries: ${stats.total}`);
      console.log(`  Duplicates removed: ${stats.deduplicated}`);
      console.log(`  By source:`, stats.bySource);
      console.log(`  By label:`, stats.byLabel);
      console.log(`  Threshold: slow > ${stats.threshold.slow}ms, medium > ${stats.threshold.medium}ms`);

      const output = records.map(r => JSON.stringify(r)).join('\n');
      
      const { writeFileSync } = await import('fs');
      writeFileSync(options.output || 'data/consolidated.jsonl', output + '\n');
      console.log(`\nSaved to: ${options.output || 'data/consolidated.jsonl'}`);
    });
}
