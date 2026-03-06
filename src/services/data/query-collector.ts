import { Command } from 'commander';
import { SlowLogParser } from './slow-log-parser';
import { DatasetStorage } from './storage';
import { ISQLQueryRecord } from './types';

export function createCollectCommand(): Command {
  const command = new Command('collect');

  command
    .description('Collect SQL queries from various sources')
    .option('-i, --input <path>', 'Input file (slow query log)')
    .option('-o, --output <path>', 'Output file path', 'data/queries.jsonl')
    .option('-q, --query <sql>', 'Single query to add')
    .option('-t, --time <ms>', 'Execution time in milliseconds', '0')
    .option('-d, --database <name>', 'Database name', 'default')
    .option('--timestamp <iso>', 'Timestamp (ISO format)', new Date().toISOString());

  command.action(async (options) => {
    const storage = new DatasetStorage(options.output);

    if (options.input) {
      console.log(`[Collect] Parsing slow query log: ${options.input}`);
      const parser = new SlowLogParser();
      const records = parser.parse(options.input);
      storage.appendRecords(records);
      console.log(`[Collect] Added ${records.length} queries to ${options.output}`);
    }

    if (options.query) {
      const record: ISQLQueryRecord = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        query: options.query,
        executionTimeMs: parseInt(options.time, 10),
        database: options.database,
        timestamp: options.timestamp,
      };
      storage.appendRecord(record);
      console.log(`[Collect] Added query: ${options.query.substring(0, 50)}...`);
    }

    if (!options.input && !options.query) {
      console.error('[Collect] Error: Specify --input or --query');
      process.exit(1);
    }
  });

  return command;
}
