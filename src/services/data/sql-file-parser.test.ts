import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SqlFileParser } from './sql-file-parser.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'fs';

const mockReadFileSync = vi.mocked(readFileSync);

describe('SqlFileParser', () => {
  let parser: SqlFileParser;

  beforeEach(() => {
    parser = new SqlFileParser();
    vi.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse a single SQL statement', () => {
      mockReadFileSync.mockReturnValue('SELECT * FROM users;');

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(1);
      expect(records[0].query).toBe('SELECT * FROM users');
    });

    it('should parse multiple SQL statements', () => {
      const content = [
        'SELECT * FROM users;',
        'SELECT * FROM orders;',
        'SELECT id FROM products WHERE price > 100;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(3);
      expect(records[0].query).toBe('SELECT * FROM users');
      expect(records[1].query).toBe('SELECT * FROM orders');
      expect(records[2].query).toBe('SELECT id FROM products WHERE price > 100');
    });

    it('should strip single-line comments', () => {
      const content = [
        '-- This is a comment',
        'SELECT * FROM users;',
        '-- Another comment',
        'SELECT * FROM orders; -- inline comment',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT * FROM users');
      expect(records[1].query).toBe('SELECT * FROM orders');
    });

    it('should strip multi-line comments', () => {
      const content = [
        '/* Header comment',
        '   spanning multiple lines */',
        'SELECT * FROM users;',
        '/* Another block */ SELECT * FROM orders;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT * FROM users');
      expect(records[1].query).toBe('SELECT * FROM orders');
    });

    it('should handle multi-line SQL statements', () => {
      const content = [
        'SELECT u.name, o.total',
        '  FROM users u',
        '  JOIN orders o ON u.id = o.user_id',
        '  WHERE o.total > 500;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(1);
      expect(records[0].query).toBe(
        'SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 500'
      );
    });

    it('should return empty array for empty file', () => {
      mockReadFileSync.mockReturnValue('');

      const records = parser.parse('/fake/empty.sql');

      expect(records).toEqual([]);
    });

    it('should return empty array for comment-only file', () => {
      const content = [
        '-- Just comments',
        '/* Block comment only */',
        '-- Nothing else',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/comments.sql');

      expect(records).toEqual([]);
    });

    it('should skip empty statements from consecutive semicolons', () => {
      mockReadFileSync.mockReturnValue('SELECT 1;; ;SELECT 2;');

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT 1');
      expect(records[1].query).toBe('SELECT 2');
    });

    it('should set executionTimeMs to 0 for all records', () => {
      const content = 'SELECT 1;\nSELECT 2;';
      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(2);
      records.forEach((r) => {
        expect(r.executionTimeMs).toBe(0);
      });
    });

    it('should generate unique ids starting with q_', () => {
      const content = 'SELECT 1;\nSELECT 2;\nSELECT 3;';
      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(3);
      const ids = records.map((r) => r.id);
      ids.forEach((id) => expect(id).toMatch(/^q_/));
      expect(new Set(ids).size).toBe(3);
    });

    it('should use provided database name', () => {
      mockReadFileSync.mockReturnValue('SELECT 1;');

      const records = parser.parse('/fake/queries.sql', 'ecommerce_demo');

      expect(records).toHaveLength(1);
      expect(records[0].database).toBe('ecommerce_demo');
    });

    it('should default database to unknown when not provided', () => {
      mockReadFileSync.mockReturnValue('SELECT 1;');

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(1);
      expect(records[0].database).toBe('unknown');
    });

    it('should set a valid ISO timestamp', () => {
      mockReadFileSync.mockReturnValue('SELECT 1;');

      const records = parser.parse('/fake/queries.sql');

      expect(records).toHaveLength(1);
      expect(() => new Date(records[0].timestamp)).not.toThrow();
      expect(new Date(records[0].timestamp).toISOString()).toBe(records[0].timestamp);
    });

    it('should handle the ecommerce query bank format with tier comments', () => {
      const content = [
        '-- ============================================================',
        '-- E-commerce Query Bank for sql-sage',
        '-- ============================================================',
        '',
        '-- TIER 1: GOOD QUERIES',
        '',
        '-- Q01: Point lookup by primary key',
        '-- [Rules: none] [Features: hasLimit]',
        'SELECT id, name, email FROM customers WHERE id = 42;',
        '',
        '-- Q02: Indexed join with LIMIT',
        '-- [Rules: none] [Features: hasJoin, hasLimit]',
        'SELECT o.id, c.name',
        '  FROM orders o',
        '  JOIN customers c ON o.customer_id = c.id',
        '  LIMIT 10;',
      ].join('\n');

      mockReadFileSync.mockReturnValue(content);

      const records = parser.parse('/fake/ecommerce.sql', 'ecommerce_demo');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT id, name, email FROM customers WHERE id = 42');
      expect(records[1].query).toBe(
        'SELECT o.id, c.name FROM orders o JOIN customers c ON o.customer_id = c.id LIMIT 10'
      );
      expect(records[0].database).toBe('ecommerce_demo');
    });
  });

  describe('parseContent', () => {
    it('should parse content string directly without file I/O', () => {
      const records = parser.parseContent('SELECT 1; SELECT 2;');

      expect(records).toHaveLength(2);
      expect(records[0].query).toBe('SELECT 1');
      expect(records[1].query).toBe('SELECT 2');
    });

    it('should accept optional database parameter', () => {
      const records = parser.parseContent('SELECT 1;', 'mydb');

      expect(records).toHaveLength(1);
      expect(records[0].database).toBe('mydb');
    });
  });
});
