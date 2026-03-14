export interface IExtractedQuery {
  id: string;
  patternId: string;
  entity: string | null;
  sql: string;
  file: string;
  line: number;
  params: unknown[];
  metadata: Record<string, unknown>;
}

export interface IScanContext {
  filePath: string;
  lineNumber: number;
  fileContent: string;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanResult {
  queries: IExtractedQuery[];
  stats: {
    totalFiles: number;
    totalQueries: number;
    byPattern: Record<string, number>;
  };
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}

export interface IScanOptions {
  pattern?: string;
  verbose?: boolean;
}
