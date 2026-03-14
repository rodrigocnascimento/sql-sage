import { existsSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';
import { TypeOrmAstParser, IMethodCall } from './ast-parser.js';
import { IExtractedQuery, IScanResult, IScanOptions } from './types.js';

export class TypeORMScanner {
  private projectDir: string;
  
  constructor(projectDir: string) {
    this.projectDir = resolve(projectDir);
  }
  
  async scan(options: IScanOptions = {}): Promise<IScanResult> {
    const queries: IExtractedQuery[] = [];
    const stats: IScanResult['stats'] = {
      totalFiles: 0,
      totalQueries: 0,
      byPattern: {},
    };
    
    if (!existsSync(this.projectDir)) {
      throw new Error(`Directory not found: ${this.projectDir}`);
    }
    
    const files = this.findTypeScriptFiles();
    stats.totalFiles = files.length;
    
    if (options.verbose) {
      console.log(`[Scanner] Found ${files.length} TypeScript files`);
    }
    
    const parser = new TypeOrmAstParser(this.projectDir);
    
    for (const file of files) {
      try {
        const methodCalls = parser.parseFile(file);
        const relativePath = file.replace(this.projectDir + '/', '');
        
        for (const methodCall of methodCalls) {
          const extracted = this.extractQuery(methodCall, relativePath);
          if (!extracted) continue;
          
          if (!options.pattern || extracted.patternId === options.pattern) {
            queries.push(extracted);
            stats.byPattern[extracted.patternId] = (stats.byPattern[extracted.patternId] || 0) + 1;
          }
        }
      } catch (error) {
        if (options.verbose) {
          console.warn(`[Scanner] Warning: Could not process ${file}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }
    
    stats.totalQueries = queries.length;
    
    return { queries, stats };
  }
  
  private findTypeScriptFiles(): string[] {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.mts',
      'src/**/*.cts',
    ];
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = globSync(pattern, {
        cwd: this.projectDir,
        ignore: [
          '**/*.d.ts',
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
        ],
      });
      
      files.push(...matches.map((m: string) => resolve(this.projectDir, m)));
    }
    
    return files;
  }
  
  private extractQuery(methodCall: IMethodCall, filePath: string): IExtractedQuery | null {
    const { name: methodName, repositoryName, arguments: argsStr, line } = methodCall;
    
    const entity = repositoryName.replace('Repository', '').replace('repository', '');
    const patternId = this.getPatternForMethod(methodName);
    
    return {
      id: `${patternId}_${line}_${Math.random().toString(36).substring(7)}`,
      patternId,
      entity: entity.toLowerCase(),
      sql: this.buildSQL(methodName, entity, argsStr),
      file: filePath,
      line,
      params: [],
      metadata: { method: methodName },
    };
  }
  
  private getPatternForMethod(methodName: string): string {
    const findMethods = [
      'find', 'findOne', 'findOneOrFail', 'findOneBy', 'findBy', 
      'findAndCount', 'findAndCountBy', 'count', 'countBy', 
      'exists', 'existsBy'
    ];
    const saveMethods = ['save', 'create', 'insert', 'upsert'];
    const deleteMethods = ['delete', 'remove', 'softDelete', 'softRemove'];
    const updateMethods = ['update', 'updateAll', 'increment', 'decrement'];
    
    if (findMethods.includes(methodName)) return 'repository-find';
    if (saveMethods.includes(methodName)) return 'repository-save';
    if (deleteMethods.includes(methodName)) return 'repository-delete';
    if (updateMethods.includes(methodName)) return 'repository-update';
    
    return 'unknown';
  }
  
  private buildSQL(methodName: string, entity: string, argsStr: string): string {
    const tableName = entity.toLowerCase() + 's';
    const isSelect = ['find', 'findOne', 'findOneOrFail', 'findOneBy', 'findBy', 'findAndCount', 'findAndCountBy'].includes(methodName);
    const isCount = ['count', 'countBy'].includes(methodName);
    const isExists = ['exists', 'existsBy'].includes(methodName);
    
    if (isSelect) {
      let sql = 'SELECT * FROM ' + tableName;
      if (argsStr.includes('where:')) {
        sql += ' WHERE ...';
      }
      if (methodName === 'findOne' || methodName === 'findOneOrFail') {
        sql += ' LIMIT 1';
      }
      return sql;
    }
    
    if (isCount) {
      return 'SELECT COUNT(*) FROM ' + tableName;
    }
    
    if (isExists) {
      return 'SELECT 1 FROM ' + tableName + ' LIMIT 1';
    }
    
    switch (methodName) {
      case 'save':
      case 'create':
      case 'insert':
      case 'upsert':
        return `INSERT INTO ${tableName} (...) VALUES (...)`;
      case 'delete':
      case 'remove':
      case 'softDelete':
      case 'softRemove':
        return `DELETE FROM ${tableName}`;
      case 'update':
      case 'updateAll':
      case 'increment':
      case 'decrement':
        return `UPDATE ${tableName} SET ...`;
      default:
        return `${methodName.toUpperCase()} ${tableName}`;
    }
  }
}
