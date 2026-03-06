import { readFileSync } from 'fs';
import { ISQLQueryRecord } from './types';

export class SlowLogParser {
  parse(filePath: string): ISQLQueryRecord[] {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const records: ISQLQueryRecord[] = [];

    let currentQuery = '';
    let currentTime = 0;
    let currentDatabase = '';
    let currentTimestamp = '';
    let inQuery = false;

    for (const line of lines) {
      if (line.startsWith('# Time:')) {
        const timeMatch = line.match(/Time:\s+(.+)/);
        if (timeMatch) {
          currentTimestamp = this.parseTimestamp(timeMatch[1]);
        }
      }

      if (line.startsWith('# Query_time:')) {
        const queryTimeMatch = line.match(/Query_time:\s+(\d+\.?\d*)/);
        if (queryTimeMatch) {
          currentTime = Math.round(parseFloat(queryTimeMatch[1]) * 1000);
        }
      }

      if (line.startsWith('use ')) {
        const dbMatch = line.match(/use\s+`?(\w+)`?/);
        if (dbMatch) {
          currentDatabase = dbMatch[1];
        }
      }

      if (line.startsWith('SET timestamp=')) {
        inQuery = true;
        const tsMatch = line.match(/SET timestamp=(\d+)/);
        if (tsMatch) {
          currentTimestamp = new Date(parseInt(tsMatch[1]) * 1000).toISOString();
        }
        continue;
      }

      if (inQuery && line.trim() && !line.startsWith('#') && !line.startsWith('SET')) {
        if (line.endsWith(';')) {
          currentQuery += line.slice(0, -1).trim();
          records.push(this.createRecord(currentQuery, currentTime, currentDatabase, currentTimestamp));
          currentQuery = '';
          inQuery = false;
        } else {
          currentQuery += line.trim() + ' ';
        }
      }
    }

    return records;
  }

  private parseTimestamp(timeStr: string): string {
    const now = new Date();
    const match = timeStr.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (match) {
      return match[1] + '.000Z';
    }
    return now.toISOString();
  }

  private createRecord(query: string, executionTimeMs: number, database: string, timestamp: string): ISQLQueryRecord {
    return {
      id: this.generateId(),
      query: query.trim(),
      executionTimeMs,
      database: database || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
    };
  }

  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
