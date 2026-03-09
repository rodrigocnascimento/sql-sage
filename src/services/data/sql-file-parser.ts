import { readFileSync } from 'fs';
import { ISQLQueryRecord } from './types.js';

/**
 * Parses plain .sql files into ISQLQueryRecord[].
 *
 * Handles:
 * - Single-line comments (-- ...)
 * - Multi-line comments (/* ... *​/)
 * - Statements separated by semicolons
 * - Multi-line statements
 * - Empty lines and whitespace
 *
 * Each extracted statement becomes a record with executionTimeMs = 0
 * (no timing data available from static .sql files).
 */
export class SqlFileParser {
  parse(filePath: string, database?: string): ISQLQueryRecord[] {
    const content = readFileSync(filePath, 'utf-8');
    return this.parseContent(content, database);
  }

  parseContent(content: string, database?: string): ISQLQueryRecord[] {
    const cleaned = this.stripComments(content);
    const statements = this.splitStatements(cleaned);
    return statements.map((sql) => this.createRecord(sql, database));
  }

  private stripComments(content: string): string {
    // Remove multi-line comments (/* ... */)
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments (-- ...)
    result = result.replace(/--.*$/gm, '');
    return result;
  }

  private splitStatements(content: string): string[] {
    return content
      .split(';')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 0);
  }

  private createRecord(query: string, database?: string): ISQLQueryRecord {
    return {
      id: this.generateId(),
      query,
      executionTimeMs: 0,
      database: database || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
