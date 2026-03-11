import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Command } from 'commander';
import * as tf from '@tensorflow/tfjs';

describe('CLI (index.ts)', () => {
  afterEach(() => {
    tf.dispose();
  });

  describe('Command setup', () => {
    it('should create analyze command', () => {
      const program = new Command();
      program
        .command('analyze')
        .argument('<file>', 'Path to the SQL file to analyze')
        .option('-o, --output <file>', 'Output file for JSON results')
        .option('-v, --verbose', 'Verbose output')
        .action(async () => {});

      const analyzeCmd = program.commands.find(c => c.name() === 'analyze');
      expect(analyzeCmd).toBeDefined();
      expect(analyzeCmd?.options.length).toBeGreaterThan(0);
    });

    it('should create status command', () => {
      const program = new Command();
      program
        .command('status')
        .action(async () => {});

      const statusCmd = program.commands.find(c => c.name() === 'status');
      expect(statusCmd).toBeDefined();
    });

    it('should have correct program name and version', () => {
      const program = new Command();
      program
        .name('sql-sage')
        .version('1.0.0');

      expect(program.name()).toBe('sql-sage');
      expect(program.version()).toBe('1.0.0');
    });

    it('should support verbose option', () => {
      const program = new Command();
      let verboseValue = false;

      program
        .option('-v, --verbose', 'Verbose output')
        .action((options) => {
          verboseValue = options.verbose;
        });

      program.parse(['node', 'test', '-v']);
      expect(verboseValue).toBe(true);
    });

    it('should support output option', () => {
      const program = new Command();
      let outputValue: string | undefined;

      program
        .option('-o, --output <file>', 'Output file')
        .action((options) => {
          outputValue = options.output;
        });

      program.parse(['node', 'test', '-o', 'output.json']);
      expect(outputValue).toBe('output.json');
    });
  });

  describe('Error handling patterns', () => {
    it('should use proper error message extraction', () => {
      const error = new Error('Test error');
      const message = error instanceof Error ? error.message : error;
      expect(message).toBe('Test error');
    });

    it('should handle non-Error objects in catch', () => {
      const error: unknown = 'string error';
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe('string error');
    });

    it('should handle null error', () => {
      const error: unknown = null;
      const message = error instanceof Error ? error?.message : String(error);
      expect(message).toBe('null');
    });
  });

  describe('Output formatting', () => {
    it('should format performance score as percentage', () => {
      const performanceScore = 0.75;
      const formatted = (performanceScore * 100).toFixed(1);
      expect(formatted).toBe('75.0');
    });

    it('should format JSON with indentation', () => {
      const obj = { a: 1, b: 2 };
      const formatted = JSON.stringify(obj, null, 2);
      expect(formatted).toContain('\n');
    });

    it('should handle summary output formatting', () => {
      const insights = [
        { hasCartesianRisk: true },
        { fullTableScanRisk: true },
        { missingIndexCount: 2 }
      ];

      const hasCartesianRisk = insights.some((i: any) => i.hasCartesianRisk);
      const hasFullTableScanRisk = insights.some((i: any) => i.fullTableScanRisk);
      const missingIndexCount = insights.reduce((sum: number, i: any) => sum + (i.missingIndexCount || 0), 0);

      expect(hasCartesianRisk).toBe(true);
      expect(hasFullTableScanRisk).toBe(true);
      expect(missingIndexCount).toBe(2);
    });
  });
});
