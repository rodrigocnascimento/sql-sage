import { IQueryPatternStrategy } from './base.strategy.js';
import { IExtractedQuery, IScanContext } from '../types.js';
import { QueryBuilderStrategy } from './query-builder.strategy.js';
import { RepositoryFindStrategy } from './repository-find.strategy.js';
import { RawQueryStrategy } from './raw-query.strategy.js';
import { QueryRunnerStrategy } from './query-runner.strategy.js';

export class QueryPatternFactory {
  private strategies: Map<string, IQueryPatternStrategy> = new Map();
  
  constructor() {
    this.registerDefaultStrategies();
  }
  
  private registerDefaultStrategies(): void {
    this.register(new QueryBuilderStrategy());
    this.register(new RepositoryFindStrategy());
    this.register(new RawQueryStrategy());
    this.register(new QueryRunnerStrategy());
  }
  
  register(strategy: IQueryPatternStrategy): void {
    this.strategies.set(strategy.patternId, strategy);
  }
  
  extractAll(code: string, context: IScanContext): IExtractedQuery[] {
    const results: IExtractedQuery[] = [];
    
    for (const strategy of this.strategies.values()) {
      if (strategy.match(code)) {
        const extraction = strategy.extract(code, context);
        if (extraction) {
          results.push(extraction);
        }
      }
    }
    
    return results;
  }
  
  extractByPattern(code: string, context: IScanContext, patternId: string): IExtractedQuery | null {
    const strategy = this.strategies.get(patternId);
    if (!strategy) return null;
    
    if (strategy.match(code)) {
      return strategy.extract(code, context);
    }
    
    return null;
  }
  
  getRegisteredPatterns(): IQueryPatternStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  getPattern(patternId: string): IQueryPatternStrategy | undefined {
    return this.strategies.get(patternId);
  }
  
  hasPattern(patternId: string): boolean {
    return this.strategies.has(patternId);
  }
}
