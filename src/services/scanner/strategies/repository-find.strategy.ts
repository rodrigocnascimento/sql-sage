import { AbstractBaseStrategy } from './base.strategy.js';
import { IExtractedQuery, IScanContext } from '../types.js';

interface IScanOptions {
  where?: Record<string, unknown>;
  relations?: string[];
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
  select?: string[];
}

export class RepositoryFindStrategy extends AbstractBaseStrategy {
  readonly patternId = 'repository-find';
  readonly patternName = 'Repository Find';
  
  match(code: string): boolean {
    return /\.(find|findOne|findAndCount|findOneById)\s*\(/.test(code);
  }
  
  extract(code: string, context: IScanContext): IExtractedQuery | null {
    const fullCode = context.fileContent;
    const position = fullCode.indexOf(code);
    if (position === -1) return null;
    
    const lines = fullCode.substring(0, position).split('\n');
    const lineNumber = lines.length;
    
    const match = code.match(/(\w+Repository)\.(\w+)\s*\(([\s\S]*?)\)/);
    if (!match) return null;
    
    const repositoryName = match[1];
    const methodName = match[2];
    const optionsStr = match[3];
    
    const entity = repositoryName.replace('Repository', '');
    const options = this.parseOptions(optionsStr);
    const sql = this.buildSQL(entity, options, methodName);
    
    return {
      id: this.generateId(context.filePath, lineNumber),
      patternId: this.patternId,
      entity,
      sql,
      file: context.filePath,
      line: lineNumber,
      params: [],
      metadata: {
        method: methodName,
        ...options,
      },
    };
  }
  
  private parseOptions(optionsStr: string): IScanOptions {
    const options: IScanOptions = {};
    
    const whereMatch = optionsStr.match(/where:\s*\{([\s\S]*?)\}/);
    if (whereMatch) {
      try {
        const whereStr = '{' + whereMatch[1] + '}';
        options.where = JSON.parse(whereStr.replace(/(\w+):/g, '"$1":'));
      } catch {
        options.where = {};
      }
    }
    
    const relationsMatch = optionsStr.match(/relations:\s*(\[[\s\S]*?\])/);
    if (relationsMatch) {
      try {
        options.relations = JSON.parse(relationsMatch[1].replace(/'/g, '"'));
      } catch {
        options.relations = [];
      }
    }
    
    const takeMatch = optionsStr.match(/take:\s*(\d+)/);
    if (takeMatch) {
      options.take = parseInt(takeMatch[1], 10);
    }
    
    const skipMatch = optionsStr.match(/skip:\s*(\d+)/);
    if (skipMatch) {
      options.skip = parseInt(skipMatch[1], 10);
    }
    
    const orderMatch = optionsStr.match(/order:\s*\{([\s\S]*?)\}/);
    if (orderMatch) {
      try {
        const orderStr = '{' + orderMatch[1] + '}';
        options.order = JSON.parse(orderStr.replace(/(\w+):/g, '"$1":'));
      } catch {
        options.order = {};
      }
    }
    
    const selectMatch = optionsStr.match(/select:\s*(\[[\s\S]*?\])/);
    if (selectMatch) {
      try {
        options.select = JSON.parse(selectMatch[1].replace(/'/g, '"'));
      } catch {
        options.select = [];
      }
    }
    
    return options;
  }
  
  private buildSQL(entity: string, options: IScanOptions, method: string): string {
    const tableName = entity.toLowerCase() + 's';
    const clauses: string[] = [];
    
    if (options.select && options.select.length > 0) {
      clauses.push(`SELECT ${options.select.join(', ')}`);
    } else {
      clauses.push('SELECT *');
    }
    
    clauses.push(`FROM ${tableName}`);
    
    if (options.where && Object.keys(options.where).length > 0) {
      const whereClauses = Object.entries(options.where).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${value}'`;
        }
        return `${key} = ${value}`;
      });
      clauses.push(`WHERE ${whereClauses.join(' AND ')}`);
    }
    
    if (options.order && Object.keys(options.order).length > 0) {
      const orderClauses = Object.entries(options.order).map(([key, dir]) => `${key} ${dir}`);
      clauses.push(`ORDER BY ${orderClauses.join(', ')}`);
    }
    
    if (options.skip) {
      clauses.push(`OFFSET ${options.skip}`);
    }
    
    if (options.take || method === 'findOne') {
      const limit = options.take || 1;
      clauses.push(`LIMIT ${limit}`);
    }
    
    return clauses.join(' ');
  }
}
