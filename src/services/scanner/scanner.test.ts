import { describe, it, expect } from 'vitest';
import { QueryBuilderStrategy } from './strategies/query-builder.strategy.js';
import { RepositoryFindStrategy } from './strategies/repository-find.strategy.js';
import { RawQueryStrategy } from './strategies/raw-query.strategy.js';
import { QueryRunnerStrategy } from './strategies/query-runner.strategy.js';
import { IScanContext } from './types.js';

describe('QueryBuilderStrategy', () => {
  const strategy = new QueryBuilderStrategy();

  it('should detect createQueryBuilder', () => {
    const code = 'await userRepository.createQueryBuilder("user").getMany()';
    expect(strategy.match(code)).toBe(true);
  });

  it('should not match non-querybuilder code', () => {
    const code = 'const x = 1;';
    expect(strategy.match(code)).toBe(false);
  });

  it('should extract entity and basic SQL', () => {
    const code = 'createQueryBuilder("user").getMany()';
    const context: IScanContext = {
      filePath: 'src/test.ts',
      lineNumber: 1,
      fileContent: code,
    };
    const result = strategy.extract(code, context);
    expect(result).not.toBeNull();
    expect(result?.entity).toBe('user');
  });
});

describe('RepositoryFindStrategy', () => {
  const strategy = new RepositoryFindStrategy();

  it('should detect repository.find', () => {
    const code = 'userRepository.find({ where: { id: 1 } })';
    expect(strategy.match(code)).toBe(true);
  });

  it('should detect repository.findOne', () => {
    const code = 'userRepository.findOne({ where: { id: 1 } })';
    expect(strategy.match(code)).toBe(true);
  });

  it('should not match non-repository code', () => {
    const code = 'const x = 1;';
    expect(strategy.match(code)).toBe(false);
  });

  it('should extract entity', () => {
    const code = 'userRepository.find({ where: { id: 1 } })';
    const context: IScanContext = {
      filePath: 'src/test.ts',
      lineNumber: 1,
      fileContent: code,
    };
    const result = strategy.extract(code, context);
    expect(result).not.toBeNull();
    expect(result?.entity).toBe('user');
    expect(result?.sql).toContain('SELECT');
  });
});

describe('RawQueryStrategy', () => {
  const strategy = new RawQueryStrategy();

  it('should detect connection.query', () => {
    const code = "connection.query('SELECT * FROM users')";
    expect(strategy.match(code)).toBe(true);
  });

  it('should not match non-query code', () => {
    const code = 'const x = 1;';
    expect(strategy.match(code)).toBe(false);
  });

  it('should extract SQL', () => {
    const code = "connection.query('SELECT * FROM users WHERE id = ?', [1])";
    const context: IScanContext = {
      filePath: 'src/test.ts',
      lineNumber: 1,
      fileContent: code,
    };
    const result = strategy.extract(code, context);
    expect(result).not.toBeNull();
    expect(result?.sql).toBe('SELECT * FROM users WHERE id = ?');
  });
});

describe('QueryRunnerStrategy', () => {
  const strategy = new QueryRunnerStrategy();

  it('should detect queryRunner.query', () => {
    const code = "queryRunner.query('SELECT * FROM users')";
    expect(strategy.match(code)).toBe(true);
  });

  it('should not match non-queryRunner code', () => {
    const code = 'const x = 1;';
    expect(strategy.match(code)).toBe(false);
  });

  it('should extract SQL', () => {
    const code = "queryRunner.query('SELECT * FROM users')";
    const context: IScanContext = {
      filePath: 'src/test.ts',
      lineNumber: 1,
      fileContent: code,
    };
    const result = strategy.extract(code, context);
    expect(result).not.toBeNull();
    expect(result?.sql).toBe('SELECT * FROM users');
  });
});
