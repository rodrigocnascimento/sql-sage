import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';
import { QueryPatternFactory } from './strategies/index.js';
import { IExtractedQuery, IScanResult, IScanOptions, IScanContext } from './types.js';

export class TypeORMScanner {
  private projectDir: string;
  private factory: QueryPatternFactory;
  
  constructor(projectDir: string) {
    this.projectDir = resolve(projectDir);
    this.factory = new QueryPatternFactory();
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
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = file.replace(this.projectDir + '/', '');
        const fileQueries = this.extractFromFile(content, relativePath, options.pattern);
        
        for (const query of fileQueries) {
          if (!options.pattern || query.patternId === options.pattern) {
            queries.push(query);
            stats.byPattern[query.patternId] = (stats.byPattern[query.patternId] || 0) + 1;
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
  
  private extractFromFile(content: string, filePath: string, patternFilter?: string): IExtractedQuery[] {
    const results: IExtractedQuery[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context: IScanContext = {
        filePath,
        lineNumber: i + 1,
        fileContent: content,
      };
      
      const extracted = this.factory.extractAll(line, context);
      
      for (const query of extracted) {
        if (!patternFilter || query.patternId === patternFilter) {
          results.push(query);
        }
      }
    }
    
    return results;
  }
  
  getRegisteredPatterns(): string[] {
    return this.factory.getRegisteredPatterns().map(s => s.patternId);
  }
  
  hasPattern(patternId: string): boolean {
    return this.factory.hasPattern(patternId);
  }
}
