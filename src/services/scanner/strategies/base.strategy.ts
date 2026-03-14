import { IExtractedQuery, IScanContext } from '../types.js';

export interface IQueryPatternStrategy {
  readonly patternId: string;
  readonly patternName: string;
  
  match(code: string): boolean;
  extract(code: string, context: IScanContext): IExtractedQuery | null;
  toSQL(extraction: IExtractedQuery): string;
}

export abstract class AbstractBaseStrategy implements IQueryPatternStrategy {
  abstract readonly patternId: string;
  abstract readonly patternName: string;
  
  abstract match(code: string): boolean;
  abstract extract(code: string, context: IScanContext): IExtractedQuery | null;
  
  toSQL(extraction: IExtractedQuery): string {
    return extraction.sql;
  }
  
  protected generateId(file: string, line: number): string {
    const str = `${this.patternId}_${file}_${line}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${this.patternId}_${Math.abs(hash).toString(16)}`;
  }
  
  protected extractParams(code: string): unknown[] {
    const paramsMatch = code.match(/\[[\s\S]*?\]/);
    if (!paramsMatch) return [];
    
    try {
      const params = JSON.parse(paramsMatch[0]);
      return Array.isArray(params) ? params : [];
    } catch {
      return [];
    }
  }
  
  protected findLineNumber(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }
}
