import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { TypeORMScanner } from './scanner.service.js';
import { QueryPatternFactory } from './strategies/index.js';

export function createScanCommand(): Command {
  return new Command('scan')
    .description('Scan TypeORM project for SQL queries')
    .argument('<directory>', 'Path to TypeORM project')
    .option('-o, --output <file>', 'Output file (JSONL)', 'data/scanned-queries.jsonl')
    .option('-p, --pattern <pattern>', 'Filter by pattern')
    .option('--list-patterns', 'List available patterns')
    .option('-v, --verbose', 'Verbose output')
    .action(async (directory: string, options: { output?: string; pattern?: string; listPatterns?: boolean; verbose?: boolean }) => {
      if (options.listPatterns) {
        const factory = new QueryPatternFactory();
        console.log('Available patterns:');
        for (const strategy of factory.getRegisteredPatterns()) {
          console.log(`  ${strategy.patternId}: ${strategy.patternName}`);
        }
        return;
      }

      try {
        console.log(`Scanning TypeORM project: ${directory}`);
        
        const scanner = new TypeORMScanner(directory);
        const result = await scanner.scan({
          pattern: options.pattern,
          verbose: options.verbose,
        });

        console.log(`\nScan complete!`);
        console.log(`  Files scanned: ${result.stats.totalFiles}`);
        console.log(`  Queries found: ${result.stats.totalQueries}`);
        
        if (options.verbose) {
          console.log('\nBy pattern:');
          for (const [pattern, count] of Object.entries(result.stats.byPattern)) {
            console.log(`  ${pattern}: ${count}`);
          }
        }

        const output = result.queries
          .map(q => JSON.stringify(q))
          .join('\n');

        if (options.output) {
          writeFileSync(options.output, output + '\n');
          console.log(`\nSaved to: ${options.output}`);
        } else {
          console.log('\n--- Queries ---');
          console.log(output);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
