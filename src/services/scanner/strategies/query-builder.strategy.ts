import { AbstractBaseStrategy } from './base.strategy.js';
import { IExtractedQuery, IScanContext } from '../types.js';

interface IQueryBuilderParts {
  alias: string;
  select: string[];
  from: string;
  where: string;
  joins: string[];
  orderBy: string;
  limit: number | null;
}

export class QueryBuilderStrategy extends AbstractBaseStrategy {
  readonly patternId = 'query-builder';
  readonly patternName = 'QueryBuilder';
  
  match(code: string): boolean {
    return code.includes('createQueryBuilder(');
  }
  
  extract(code: string, context: IScanContext): IExtractedQuery | null {
    const fullCode = context.fileContent;
    const position = fullCode.indexOf(code);
    if (position === -1) return null;
    
    const lines = fullCode.substring(0, position).split('\n');
    const lineNumber = lines.length;
    
    const match = code.match(/createQueryBuilder\(['"]?(\w+)['"]?(?:\s*,\s*['"](\w+)['"])?\)([\s\S]*?)(\.getOne|\.getMany|\.getRawOne|\.getRawMany|\.execute)/);
    if (!match) return null;
    
    const alias = match[1];
    const explicitAlias = match[2];
    const chain = match[3];
    const queryType = match[4];
    
    const parts = this.extractParts(chain, alias, explicitAlias);
    const sql = this.buildSQL(parts);
    
    return {
      id: this.generateId(context.filePath, lineNumber),
      patternId: this.patternId,
      entity: alias,
      sql,
      file: context.filePath,
      line: lineNumber,
      params: this.extractParams(chain),
      metadata: {
        queryType: queryType.replace('.', ''),
        ...parts,
      },
    };
  }
  
  private extractParts(chain: string, alias: string, explicitAlias?: string): IQueryBuilderParts {
    const result: IQueryBuilderParts = {
      alias: explicitAlias || alias,
      select: [],
      from: alias,
      where: '',
      joins: [],
      orderBy: '',
      limit: null,
    };
    
    const selectMatch = chain.match(/\.select\s*\(\s*(\[[\s\S]*?\])\s*\)/);
    if (selectMatch) {
      try {
        result.select = JSON.parse(selectMatch[1].replace(/'/g, '"'));
      } catch {
        result.select = [];
      }
    }
    
    const whereMatch = chain.match(/\.where\s*\(\s*(['"][^'"]+['"]|\w+)\s*(?:,\s*(\{[\s\S]*?\}))?/);
    if (whereMatch) {
      result.where = whereMatch[1].replace(/['"]/g, '');
    }
    
    const joinMatches = chain.matchAll(/\.(innerJoin|leftJoin|rightJoin|innerJoinAndSelect|leftJoinAndSelect|rightJoinAndSelect)\s*\(\s*['"]?(\w+)['"]?(?:\s*,\s*['"]?(\w+)['"]?)?/g);
    for (const joinMatch of joinMatches) {
      const joinType = joinMatch[1].replace('AndSelect', '');
      const relation = joinMatch[2];
      const joinAlias = joinMatch[3] || relation;
      result.joins.push(`${joinType.toUpperCase()} JOIN ${relation} ${joinAlias}`);
    }
    
    const orderMatch = chain.match(/\.orderBy\s*\(\s*['"]?(\w+)['"]?(?:\s*,\s*['"]?(ASC|DESC)['"]?)?/);
    if (orderMatch) {
      result.orderBy = `ORDER BY ${orderMatch[1]} ${orderMatch[2] || 'ASC'}`;
    }
    
    const limitMatch = chain.match(/\.take\s*\(\s*(\d+)\s*\)/);
    if (limitMatch) {
      result.limit = parseInt(limitMatch[1], 10);
    }
    
    return result;
  }
  
  private buildSQL(parts: IQueryBuilderParts): string {
    const clauses: string[] = [];
    
    if (parts.select.length > 0) {
      clauses.push(`SELECT ${parts.select.join(', ')}`);
    } else {
      clauses.push(`SELECT *`);
    }
    
    clauses.push(`FROM ${parts.from} ${parts.alias}`);
    
    if (parts.joins.length > 0) {
      clauses.push(parts.joins.join(' '));
    }
    
    if (parts.where) {
      clauses.push(`WHERE ${parts.where}`);
    }
    
    if (parts.orderBy) {
      clauses.push(parts.orderBy);
    }
    
    if (parts.limit !== null) {
      clauses.push(`LIMIT ${parts.limit}`);
    }
    
    return clauses.join(' ');
  }
}
