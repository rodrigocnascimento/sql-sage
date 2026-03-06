import { describe, it, expect, beforeEach } from 'vitest';
import { SQLFeatureEngineer } from './feature-engineer.js';
import { SchemaRegistry } from './schema-registry.js';
import { ISchemaRegistry } from './types.js';

describe('SQLFeatureEngineer', () => {
  let engineer: SQLFeatureEngineer;
  const vocab = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'AND', 'OR', 'GROUP', 'BY', 'ORDER', 'LIMIT'];

  beforeEach(() => {
    engineer = new SQLFeatureEngineer(vocab);
  });

  describe('constructor', () => {
    it('should initialize vocabulary with correct indices', () => {
      const eng = new SQLFeatureEngineer(vocab);
      expect(eng.getVocabSize()).toBe(vocab.length);
    });

    it('should handle empty vocabulary', () => {
      const eng = new SQLFeatureEngineer([]);
      expect(eng.getVocabSize()).toBe(0);
    });

    it('should accept optional schema registry', () => {
      const registry = new SchemaRegistry();
      const eng = new SQLFeatureEngineer(vocab, registry);
      expect(eng.getVocabSize()).toBe(vocab.length);
    });
  });

  describe('process', () => {
    it('should return valid vectorized query object', () => {
      const result = engineer.process('SELECT * FROM users WHERE id = 1');
      
      expect(result).toHaveProperty('tokenSequence');
      expect(result).toHaveProperty('structuralFeatures');
      expect(result.tokenSequence).toHaveLength(100);
      expect(result.structuralFeatures).toHaveLength(8);
    });

    it('should normalize structural features to 0-1 range', () => {
      const result = engineer.process('SELECT a, b, c, d, e FROM users');
      
      const [joinCount, subqueryDepth, whereComplexity, selectedColumns] = result.structuralFeatures;
      expect(joinCount).toBeLessThanOrEqual(1);
      expect(subqueryDepth).toBeLessThanOrEqual(1);
      expect(whereComplexity).toBeLessThanOrEqual(1);
      expect(selectedColumns).toBeLessThanOrEqual(1);
    });

    it('should handle empty query', () => {
      const result = engineer.process('');
      
      expect(result.tokenSequence).toHaveLength(100);
      expect(result.structuralFeatures[0]).toBe(0);
    });

    it('should handle very long query by truncating', () => {
      const longQuery = 'SELECT ' + Array(200).fill('col').join(', ') + ' FROM users';
      const result = engineer.process(longQuery);
      
      expect(result.tokenSequence).toHaveLength(100);
    });
  });

  describe('tokenize', () => {
    it('should tokenize basic SELECT query', () => {
      const result = engineer.process('SELECT name FROM users');
      
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should tokenize operators', () => {
      const result = engineer.process('WHERE age > 18');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should handle parentheses', () => {
      const result = engineer.process('WHERE (a = 1) AND (b = 2)');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should handle commas', () => {
      const result = engineer.process('SELECT a, b, c FROM users');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should convert tokens to uppercase', () => {
      const result = engineer.process('select name from users');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });
  });

  describe('extractStructuralFeatures', () => {
    it('should count JOIN clauses', () => {
      const result = engineer.process('SELECT * FROM a JOIN b ON a.id = b.id JOIN c ON b.id = c.id');
      expect(result.structuralFeatures[0]).toBeCloseTo(2 / 10, 2);
    });

    it('should detect Cartesian product risk', () => {
      const result = engineer.process('SELECT * FROM users, orders');
      expect(result.structuralFeatures[4]).toBe(1);
    });

    it('should not flag explicit JOINs as Cartesian risk', () => {
      const result = engineer.process('SELECT * FROM users JOIN orders ON users.id = orders.user_id');
      expect(result.structuralFeatures[4]).toBe(0);
    });

    it('should detect full table scan risk with LIKE', () => {
      const result = engineer.process("SELECT * FROM users WHERE name LIKE '%john%'");
      expect(result.structuralFeatures[6]).toBe(1);
    });

    it('should calculate subquery depth', () => {
      const result = engineer.process('SELECT * FROM users WHERE id IN (SELECT id FROM active_users)');
      expect(result.structuralFeatures[1]).toBeGreaterThan(0);
    });

    it('should count WHERE clause complexity', () => {
      const result = engineer.process('SELECT * FROM users WHERE a = 1 AND b = 2 OR c = 3');
      expect(result.structuralFeatures[2]).toBeGreaterThan(0);
    });

    it('should count selected columns', () => {
      const result = engineer.process('SELECT a, b, c, d, e FROM users');
      expect(result.structuralFeatures[3]).toBeCloseTo(5 / 20, 2);
    });

    it('should detect missing indexes with schema registry', () => {
      const registry = new SchemaRegistry();
      registry.registerTable('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100))');
      
      const engWithRegistry = new SQLFeatureEngineer(vocab, registry);
      const result = engWithRegistry.process('SELECT * FROM users WHERE name = "test"');
      expect(result.structuralFeatures[5]).toBeGreaterThan(0);
    });

    it('should not flag indexed columns as missing', () => {
      const registry = new SchemaRegistry();
      registry.registerTable('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100), KEY idx_name (name))');
      
      const engWithRegistry = new SQLFeatureEngineer(vocab, registry);
      const result = engWithRegistry.process('SELECT * FROM users WHERE name = "test"');
      expect(result.structuralFeatures[5]).toBe(0);
    });
  });

  describe('getTokenType', () => {
    it('should classify SQL keywords', () => {
      const result = engineer.process('SELECT FROM WHERE JOIN AND OR');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should classify identifiers', () => {
      const result = engineer.process('SELECT user_name FROM users');
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });

    it('should handle string literals', () => {
      const result = engineer.process("SELECT * FROM users WHERE name = 'test'");
      expect(result.tokenSequence.some(idx => idx > 0)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle SQL with comments', () => {
      const result = engineer.process('SELECT -- comment\nname FROM users');
      expect(result.tokenSequence).toBeDefined();
    });

    it('should handle special characters in table names', () => {
      const result = engineer.process('SELECT * FROM `my-table` WHERE id = 1');
      expect(result.tokenSequence).toBeDefined();
    });

    it('should handle numeric values', () => {
      const result = engineer.process('SELECT * FROM users WHERE age > 21');
      expect(result.tokenSequence).toBeDefined();
    });

    it('should handle queries with no WHERE clause', () => {
      const result = engineer.process('SELECT name FROM users');
      expect(result.structuralFeatures[2]).toBe(0);
    });

    it('should handle queries with no JOINs', () => {
      const result = engineer.process('SELECT * FROM users');
      expect(result.structuralFeatures[0]).toBe(0);
    });

    it('should normalize features correctly at max values', () => {
      const manyJoins = 'SELECT * FROM a JOIN b ON a.id = b.id JOIN c ON b.id = c.id JOIN d ON c.id = d.id JOIN e ON d.id = e.id JOIN f ON e.id = f.id JOIN g ON f.id = g.id JOIN h ON g.id = h.id JOIN i ON h.id = i.id JOIN j ON i.id = j.id JOIN k ON j.id = k.id';
      const result = engineer.process(manyJoins);
      expect(result.structuralFeatures[0]).toBe(1);
    });
  });
});
