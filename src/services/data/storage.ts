import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { ISQLQueryRecord } from './types';

export class DatasetStorage {
  private outputPath: string;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    const dir = dirname(this.outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  appendRecord(record: ISQLQueryRecord): void {
    const line = JSON.stringify(record) + '\n';
    appendFileSync(this.outputPath, line, 'utf-8');
  }

  appendRecords(records: ISQLQueryRecord[]): void {
    const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
    appendFileSync(this.outputPath, lines, 'utf-8');
  }

  saveAll(records: ISQLQueryRecord[]): void {
    const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(this.outputPath, lines, 'utf-8');
  }

  getOutputPath(): string {
    return this.outputPath;
  }
}
