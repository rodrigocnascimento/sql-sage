import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatasetStorage } from './storage.js';
import { ISQLQueryRecord } from './types.js';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';

const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedAppendFileSync = vi.mocked(appendFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

function createRecord(overrides: Partial<ISQLQueryRecord> = {}): ISQLQueryRecord {
  return {
    id: 'rec-001',
    query: 'SELECT * FROM users',
    executionTimeMs: 120,
    database: 'testdb',
    timestamp: '2026-03-06T12:00:00Z',
    ...overrides,
  };
}

describe('DatasetStorage', () => {
  const outputPath = '/data/output/dataset.jsonl';
  let storage: DatasetStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExistsSync.mockReturnValue(true);
    storage = new DatasetStorage(outputPath);
  });

  describe('constructor', () => {
    it('should create directory if it does not exist', () => {
      mockedExistsSync.mockReturnValue(false);

      new DatasetStorage('/some/nested/dir/file.jsonl');

      expect(mockedExistsSync).toHaveBeenCalledWith('/some/nested/dir');
      expect(mockedMkdirSync).toHaveBeenCalledWith('/some/nested/dir', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockedExistsSync.mockReturnValue(true);

      new DatasetStorage('/existing/dir/file.jsonl');

      expect(mockedExistsSync).toHaveBeenCalledWith('/existing/dir');
      expect(mockedMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('appendRecord', () => {
    it('should write a single JSON line to the file', () => {
      const record = createRecord();

      storage.appendRecord(record);

      expect(mockedAppendFileSync).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(record) + '\n',
        'utf-8'
      );
    });

    it('should serialize the record faithfully', () => {
      const record = createRecord({ id: 'rec-xyz', executionTimeMs: 999 });

      storage.appendRecord(record);

      const writtenLine = mockedAppendFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenLine.trim());
      expect(parsed.id).toBe('rec-xyz');
      expect(parsed.executionTimeMs).toBe(999);
    });
  });

  describe('appendRecords', () => {
    it('should write multiple JSON lines to the file', () => {
      const records = [
        createRecord({ id: 'rec-001' }),
        createRecord({ id: 'rec-002' }),
        createRecord({ id: 'rec-003' }),
      ];

      storage.appendRecords(records);

      const expectedLines =
        records.map((r) => JSON.stringify(r)).join('\n') + '\n';

      expect(mockedAppendFileSync).toHaveBeenCalledWith(
        outputPath,
        expectedLines,
        'utf-8'
      );
    });

    it('should handle a single record in the array', () => {
      const records = [createRecord({ id: 'only-one' })];

      storage.appendRecords(records);

      expect(mockedAppendFileSync).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(records[0]) + '\n',
        'utf-8'
      );
    });
  });

  describe('saveAll', () => {
    it('should overwrite the file with all records', () => {
      const records = [
        createRecord({ id: 'rec-a' }),
        createRecord({ id: 'rec-b' }),
      ];

      storage.saveAll(records);

      const expectedLines =
        records.map((r) => JSON.stringify(r)).join('\n') + '\n';

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        outputPath,
        expectedLines,
        'utf-8'
      );
    });

    it('should use writeFileSync instead of appendFileSync', () => {
      storage.saveAll([createRecord()]);

      expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
      expect(mockedAppendFileSync).not.toHaveBeenCalled();
    });
  });

  describe('getOutputPath', () => {
    it('should return the configured output path', () => {
      expect(storage.getOutputPath()).toBe(outputPath);
    });

    it('should return the exact path passed to the constructor', () => {
      mockedExistsSync.mockReturnValue(true);
      const customPath = '/custom/path/data.jsonl';
      const customStorage = new DatasetStorage(customPath);

      expect(customStorage.getOutputPath()).toBe(customPath);
    });
  });
});
