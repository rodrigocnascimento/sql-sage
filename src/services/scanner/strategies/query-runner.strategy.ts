import { AbstractBaseStrategy } from './base.strategy.js';
import { IExtractedQuery, IScanContext } from '../types.js';

export class QueryRunnerStrategy extends AbstractBaseStrategy {
  readonly patternId = 'query-runner';
  readonly patternName = 'QueryRunner';
  
  match(code: string): boolean {
    return /queryRunner\.(query|execute)\s*\(/.test(code);
  }
  
  extract(code: string, context: IScanContext): IExtractedQuery | null {
    const fullCode = context.fileContent;
    const position = fullCode.indexOf(code);
    if (position === -1) return null;
    
    const lines = fullCode.substring(0, position).split('\n');
    const lineNumber = lines.length;
    
    const match = code.match(/queryRunner\.(query|execute)\s*\(\s*(['"])([\s\S]*?)\2/);
    if (!match) return null;
    
    const sql = match[3].trim();
    
    return {
      id: this.generateId(context.filePath, lineNumber),
      patternId: this.patternId,
      entity: null,
      sql,
      file: context.filePath,
      line: lineNumber,
      params: this.extractParams(code),
      metadata: {},
    };
  }
}
