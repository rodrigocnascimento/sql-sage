import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaRegistry } from './schema-registry.js';

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('constructor', () => {
    it('should initialize with empty tables map', () => {
      expect(registry.tables.size).toBe(0);
    });
  });

  describe('registerTable', () => {
    it('should register a basic table', () => {
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100))');
      
      expect(registry.tables.size).toBe(1);
      expect(registry.tables.has('USERS')).toBe(true);
    });

    it('should register table with IF NOT EXISTS', () => {
      registry.registerTable('CREATE TABLE IF NOT EXISTS users (id INT)');
      
      expect(registry.tables.size).toBe(1);
    });

    it('should extract column names', () => {
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100), email VARCHAR(255))');
      
      const table = registry.tables.get('USERS');
      expect(table?.columns.size).toBe(3);
      expect(table?.columns.has('ID')).toBe(true);
      expect(table?.columns.has('NAME')).toBe(true);
      expect(table?.columns.has('EMAIL')).toBe(true);
    });

    it('should handle PRIMARY KEY in separate clause', () => {
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100), PRIMARY KEY (id))');
      
      const table = registry.tables.get('USERS');
      expect(table?.primaryKey).toBe('ID');
      expect(table?.indexes.has('ID')).toBe(true);
    });

    it('should handle KEY as index', () => {
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100), KEY idx_name (name))');
      
      const table = registry.tables.get('USERS');
      expect(table?.indexes.has('NAME')).toBe(true);
    });

    it('should handle UNIQUE KEY', () => {
      registry.registerTable('CREATE TABLE users (id INT, email VARCHAR(255), UNIQUE KEY uk_email (email))');
      
      const table = registry.tables.get('USERS');
      expect(table?.indexes.has('EMAIL')).toBe(true);
    });

    it('should register multiple tables', () => {
      registry.registerTable('CREATE TABLE users (id INT PRIMARY KEY)');
      registry.registerTable('CREATE TABLE orders (id INT PRIMARY KEY, user_id INT)');
      registry.registerTable('CREATE TABLE products (id INT PRIMARY KEY)');
      
      expect(registry.tables.size).toBe(3);
    });

    it('should overwrite existing table', () => {
      registry.registerTable('CREATE TABLE users (id INT)');
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100))');
      
      expect(registry.tables.size).toBe(1);
      const table = registry.tables.get('USERS');
      expect(table?.columns.size).toBe(2);
    });

    it('should handle multiline DDL', () => {
      registry.registerTable(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name VARCHAR(100)
        )
      `);
      
      expect(registry.tables.has('USERS')).toBe(true);
    });

    it('should handle invalid DDL gracefully', () => {
      registry.registerTable('NOT A VALID DDL');
      
      expect(registry.tables.size).toBe(0);
    });

    it('should handle DDL without parentheses', () => {
      registry.registerTable('CREATE TABLE users');
      
      expect(registry.tables.size).toBe(0);
    });

    it('should handle table with no columns', () => {
      registry.registerTable('CREATE TABLE empty_table ()');
      
      expect(registry.tables.has('EMPTY_TABLE')).toBe(true);
    });

    it('should handle table with only primary key clause', () => {
      registry.registerTable('CREATE TABLE users (id INT, PRIMARY KEY (id))');
      
      expect(registry.tables.has('USERS')).toBe(true);
      const table = registry.tables.get('USERS');
      expect(table?.primaryKey).toBe('ID');
    });
  });

  describe('isIndexed', () => {
    beforeEach(() => {
      registry.registerTable('CREATE TABLE users (id INT, name VARCHAR(100), PRIMARY KEY (id), KEY idx_name (name))');
    });

    it('should return true for indexed column', () => {
      expect(registry.isIndexed('users', 'name')).toBe(true);
    });

    it('should return true for primary key', () => {
      expect(registry.isIndexed('users', 'id')).toBe(true);
    });

    it('should return false for non-indexed column', () => {
      expect(registry.isIndexed('users', 'unknown')).toBe(false);
    });

    it('should return false for unknown table', () => {
      expect(registry.isIndexed('unknown', 'id')).toBe(false);
    });

    it('should be case insensitive for table name', () => {
      expect(registry.isIndexed('USERS', 'name')).toBe(true);
      expect(registry.isIndexed('Users', 'name')).toBe(true);
    });

    it('should be case insensitive for column name', () => {
      expect(registry.isIndexed('users', 'NAME')).toBe(true);
      expect(registry.isIndexed('users', 'Name')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return 0 for empty registry', () => {
      const stats = registry.getStats();
      expect(stats.tableCount).toBe(0);
    });

    it('should return correct table count', () => {
      registry.registerTable('CREATE TABLE users (id INT)');
      registry.registerTable('CREATE TABLE orders (id INT)');
      
      const stats = registry.getStats();
      expect(stats.tableCount).toBe(2);
    });
  });
});
