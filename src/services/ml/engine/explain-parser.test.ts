import { describe, it, expect, beforeEach } from 'vitest';
import { ExplainParser } from './explain-parser.js';
import { IExecutionPlan } from '../../data/types.js';

describe('ExplainParser', () => {
  let parser: ExplainParser;

  beforeEach(() => {
    parser = new ExplainParser();
  });

  describe('parse()', () => {
    it('should parse snake_case MySQL EXPLAIN result', () => {
      const result = parser.parse({
        select_type: 'SIMPLE',
        table: 'users',
        type: 'ref',
        possible_keys: 'idx_email,idx_name',
        key: 'idx_email',
        rows_examined: 150,
        rows_returned: 10,
      });

      expect(result.selectType).toBe('SIMPLE');
      expect(result.table).toBe('users');
      expect(result.type).toBe('ref');
      expect(result.possibleKeys).toEqual(['idx_email,idx_name']);
      expect(result.keyUsed).toBe('idx_email');
      expect(result.rowsExamined).toBe(150);
      expect(result.rowsReturned).toBe(10);
    });

    it('should parse camelCase properties', () => {
      const result = parser.parse({
        selectType: 'PRIMARY',
        table: 'orders',
        type: 'range',
        possibleKeys: 'idx_date',
        keyUsed: 'idx_date',
        rowsExamined: 500,
        rowsReturned: 25,
      });

      expect(result.selectType).toBe('PRIMARY');
      expect(result.table).toBe('orders');
      expect(result.type).toBe('range');
      expect(result.possibleKeys).toEqual(['idx_date']);
      expect(result.keyUsed).toBe('idx_date');
      expect(result.rowsExamined).toBe(500);
      expect(result.rowsReturned).toBe(25);
    });

    it('should handle rows as alias for rowsExamined', () => {
      const result = parser.parse({
        select_type: 'SIMPLE',
        table: 'products',
        type: 'ALL',
        rows: 9999,
      });

      expect(result.rowsExamined).toBe(9999);
    });

    it('should handle null and undefined values gracefully', () => {
      const result = parser.parse({});

      expect(result.selectType).toBe('');
      expect(result.table).toBe('');
      expect(result.type).toBe('');
      expect(result.possibleKeys).toEqual([]);
      expect(result.keyUsed).toBeUndefined();
      expect(result.rowsExamined).toBe(0);
      expect(result.rowsReturned).toBe(0);
    });

    it('should handle string numbers for rows_examined', () => {
      const result = parser.parse({
        select_type: 'SIMPLE',
        table: 'logs',
        type: 'ALL',
        rows_examined: '1234',
        rows_returned: '56',
      });

      expect(result.rowsExamined).toBe(1234);
      expect(result.rowsReturned).toBe(56);
    });

    it('should handle arrays for possible_keys', () => {
      const result = parser.parse({
        select_type: 'SIMPLE',
        table: 'users',
        type: 'ref',
        possible_keys: ['idx_email', 'idx_name'],
      });

      expect(result.possibleKeys).toEqual(['idx_email', 'idx_name']);
    });

    it('should return id starting with plan_', () => {
      const result = parser.parse({
        select_type: 'SIMPLE',
        table: 'users',
        type: 'const',
      });

      expect(result.id).toMatch(/^plan_/);
    });
  });

  describe('parseFromText()', () => {
    it('should parse tab-separated EXPLAIN text', () => {
      const text = 'SIMPLE\tusers\tref\tidx_email\tidx_email\t100\t10';
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(1);
      expect(plans[0].selectType).toBe('SIMPLE');
      expect(plans[0].table).toBe('users');
      expect(plans[0].type).toBe('ref');
      expect(plans[0].possibleKeys).toEqual(['idx_email']);
      expect(plans[0].keyUsed).toBe('idx_email');
      expect(plans[0].rowsExamined).toBe(100);
      expect(plans[0].rowsReturned).toBe(10);
    });

    it('should skip lines starting with +', () => {
      const text = '+----+\nSIMPLE\tusers\tref\tidx_email\tidx_email\t50\t5';
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(1);
      expect(plans[0].selectType).toBe('SIMPLE');
    });

    it('should skip lines starting with | and =', () => {
      const text = '| header |\n=======\nSIMPLE\torders\tALL\t\t\t1000\t0';
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(1);
      expect(plans[0].table).toBe('orders');
    });

    it('should skip empty lines', () => {
      const text = '\n\nSIMPLE\tusers\tconst\tPRIMARY\tPRIMARY\t1\t1\n\n';
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(1);
      expect(plans[0].type).toBe('const');
    });

    it('should skip lines with fewer than 3 tab-separated cells', () => {
      const text = 'only_one\nfoo\tbar\nSIMPLE\tusers\tref\tidx\tidx\t50\t5';
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(1);
      expect(plans[0].selectType).toBe('SIMPLE');
    });

    it('should parse multiple plans from multi-line text', () => {
      const text = [
        'SIMPLE\tusers\tref\tidx_email\tidx_email\t100\t10',
        'SIMPLE\torders\tALL\t\t\t5000\t0',
      ].join('\n');
      const plans = parser.parseFromText(text);

      expect(plans).toHaveLength(2);
      expect(plans[0].table).toBe('users');
      expect(plans[1].table).toBe('orders');
      expect(plans[1].type).toBe('ALL');
    });

    it('should return empty array for empty input', () => {
      const plans = parser.parseFromText('');

      expect(plans).toEqual([]);
    });
  });

  describe('getSummary()', () => {
    it('should sum totalRowsExamined and totalRowsReturned', () => {
      const plans: IExecutionPlan[] = [
        { id: 'p1', selectType: 'SIMPLE', table: 'users', type: 'ref', possibleKeys: [], keyUsed: null, rowsExamined: 100, rowsReturned: 10 },
        { id: 'p2', selectType: 'SIMPLE', table: 'orders', type: 'ref', possibleKeys: [], keyUsed: null, rowsExamined: 200, rowsReturned: 20 },
      ];
      const summary = parser.getSummary(plans);

      expect(summary.totalRowsExamined).toBe(300);
      expect(summary.totalRowsReturned).toBe(30);
    });

    it('should detect full scan for type ALL', () => {
      const plans: IExecutionPlan[] = [
        { id: 'p1', selectType: 'SIMPLE', table: 'users', type: 'ALL', possibleKeys: [], keyUsed: null, rowsExamined: 10000, rowsReturned: 10000 },
      ];
      const summary = parser.getSummary(plans);

      expect(summary.hasFullScan).toBe(true);
    });

    it('should detect full scan for type index', () => {
      const plans: IExecutionPlan[] = [
        { id: 'p1', selectType: 'SIMPLE', table: 'users', type: 'index', possibleKeys: [], keyUsed: null, rowsExamined: 5000, rowsReturned: 5000 },
      ];
      const summary = parser.getSummary(plans);

      expect(summary.hasFullScan).toBe(true);
    });

    it('should not detect full scan for ref, const, etc.', () => {
      const plans: IExecutionPlan[] = [
        { id: 'p1', selectType: 'SIMPLE', table: 'users', type: 'ref', possibleKeys: [], keyUsed: 'idx_email', rowsExamined: 10, rowsReturned: 1 },
        { id: 'p2', selectType: 'SIMPLE', table: 'orders', type: 'const', possibleKeys: [], keyUsed: 'PRIMARY', rowsExamined: 1, rowsReturned: 1 },
      ];
      const summary = parser.getSummary(plans);

      expect(summary.hasFullScan).toBe(false);
    });

    it('should handle empty plans array', () => {
      const summary = parser.getSummary([]);

      expect(summary.totalRowsExamined).toBe(0);
      expect(summary.totalRowsReturned).toBe(0);
      expect(summary.hasFullScan).toBe(false);
    });
  });
});
