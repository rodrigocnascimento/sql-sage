import { describe, it, expect } from 'vitest';

describe('TypeORM Scanner', () => {
  it('should have scanner service', async () => {
    const { TypeORMScanner } = await import('./scanner.service.js');
    expect(TypeORMScanner).toBeDefined();
  });

  it('should have ast parser', async () => {
    const { TypeOrmAstParser } = await import('./ast-parser.js');
    expect(TypeOrmAstParser).toBeDefined();
  });
});
