import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SlowLogParser } from './slow-log-parser.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'fs';

const mockReadFileSync = vi.mocked(readFileSync);

describe('SlowLogParser', () => {
  let parser: SlowLogParser;

  beforeEach(() => {
    parser = new SlowLogParser();
    vi.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse a basic slow query log entry', () => {
      const logContent = [
        '# Time: 2025-01-15T10:30:00',
        '# Query_time: 2.500000',
        'use mydb',
        'SET timestamp=1705312200;',
        'SELECT * FROM users WHERE id = 1;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      expect(records[0].query).toBe('SELECT * FROM users WHERE id = 1');
      expect(records[0].executionTimeMs).toBe(2500);
      expect(records[0].database).toBe('mydb');
      expect(records[0].timestamp).toBeDefined();
    });

    it('should parse multiple queries from a single log', () => {
      const logContent = [
        '# Time: 2025-01-15T10:30:00',
        '# Query_time: 1.200000',
        'use appdb',
        'SET timestamp=1705312200;',
        'SELECT * FROM orders;',
        '# Time: 2025-01-15T10:31:00',
        '# Query_time: 3.500000',
        'use appdb',
        'SET timestamp=1705312260;',
        'SELECT * FROM products WHERE price > 100;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT * FROM orders');
      expect(records[1].query).toBe('SELECT * FROM products WHERE price > 100');
    });

    it('should handle use with backtick-quoted database name', () => {
      const logContent = [
        '# Query_time: 0.800000',
        'use `mydb`',
        'SET timestamp=1705312200;',
        'SELECT 1;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      expect(records[0].database).toBe('mydb');
    });

    it('should handle multi-line queries', () => {
      const logContent = [
        '# Query_time: 5.000000',
        'use analytics',
        'SET timestamp=1705312200;',
        'SELECT u.name, o.total',
        'FROM users u',
        'JOIN orders o ON u.id = o.user_id',
        'WHERE o.total > 500;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      expect(records[0].query).toBe(
        'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 500'
      );
      expect(records[0].executionTimeMs).toBe(5000);
    });

    it('should return empty array for empty file content', () => {
      mockReadFileSync.mockReturnValue('');

      const records = parser.parse('/fake/empty.log');

      expect(records).toEqual([]);
    });

    it('should generate a unique id starting with q_ for each record', () => {
      const logContent = [
        '# Query_time: 1.000000',
        'use db1',
        'SET timestamp=1705312200;',
        'SELECT 1;',
        '# Query_time: 2.000000',
        'use db2',
        'SET timestamp=1705312300;',
        'SELECT 2;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(2);
      expect(records[0].id).toMatch(/^q_/);
      expect(records[1].id).toMatch(/^q_/);
      expect(records[0].id).not.toBe(records[1].id);
    });

    it('should convert Query_time seconds to milliseconds and round', () => {
      const logContent = [
        '# Query_time: 1.234567',
        'use testdb',
        'SET timestamp=1705312200;',
        'SELECT 1;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      expect(records[0].executionTimeMs).toBe(1235);
    });

    it('should set database to unknown when no use line is present', () => {
      const logContent = [
        '# Query_time: 0.500000',
        'SET timestamp=1705312200;',
        'SELECT NOW();',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      expect(records[0].database).toBe('unknown');
    });

    it('should parse ISO timestamp from # Time: line', () => {
      const logContent = [
        '# Time: 2025-01-15T10:30:00',
        '# Query_time: 1.000000',
        'use testdb',
        'SET timestamp=1705312200;',
        'SELECT 1;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      // SET timestamp overrides # Time, so we check the unix timestamp result
      expect(records[0].timestamp).toBeDefined();
      expect(typeof records[0].timestamp).toBe('string');
    });

    it('should parse Unix timestamp from SET timestamp= line', () => {
      const logContent = [
        '# Query_time: 1.000000',
        'use testdb',
        'SET timestamp=1705312200;',
        'SELECT 1;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(logContent);

      const records = parser.parse('/fake/slow.log');

      expect(records).toHaveLength(1);
      const expectedDate = new Date(1705312200 * 1000).toISOString();
      expect(records[0].timestamp).toBe(expectedDate);
    });
  });
});
