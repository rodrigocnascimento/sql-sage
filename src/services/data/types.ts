export interface ISQLQueryRecord {
  id: string;
  query: string;
  executionTimeMs: number;
  database: string;
  timestamp: string;
  executionPlan?: IExecutionPlan;
  catalogInfo?: ICatalogInfo;
}

export interface IExecutionPlan {
  id: string;
  selectType: string;
  table: string;
  type: string;
  possibleKeys: string[];
  keyUsed: string | null;
  rowsExamined: number;
  rowsReturned: number;
}

export interface ICatalogInfo {
  database: string;
  table: string;
  rowCount: number;
  avgRowLength: number;
  indexes: IIndexInfo[];
}

export interface IIndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface IDatasetConfig {
  inputPath: string;
  outputPath: string;
  database?: string;
}
