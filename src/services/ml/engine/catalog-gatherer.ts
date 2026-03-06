import { ICatalogInfo, IIndexInfo } from '../../data/types';

export interface ICatalogConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
}

export class CatalogGatherer {
  private config: ICatalogConfig | null = null;

  setConfig(config: ICatalogConfig): void {
    this.config = config;
  }

  gather(database: string, tableName?: string): ICatalogInfo[] {
    const results: ICatalogInfo[] = [];

    if (tableName) {
      results.push(this.createMockCatalogInfo(database, tableName));
    } else {
      results.push(this.createMockCatalogInfo(database, 'users'));
      results.push(this.createMockCatalogInfo(database, 'orders'));
      results.push(this.createMockCatalogInfo(database, 'products'));
    }

    return results;
  }

  private createMockCatalogInfo(database: string, table: string): ICatalogInfo {
    const indexes: IIndexInfo[] = [
      { name: `${table}_id_pk`, columns: ['id'], isUnique: true },
    ];

    if (table === 'orders') {
      indexes.push({ name: `${table}_user_id_idx`, columns: ['user_id'], isUnique: false });
      indexes.push({ name: `${table}_created_idx`, columns: ['created_at'], isUnique: false });
    } else if (table === 'products') {
      indexes.push({ name: `${table}_category_idx`, columns: ['category_id'], isUnique: false });
    }

    const rowCounts: Record<string, number> = {
      users: 10000,
      orders: 50000,
      products: 5000,
    };

    return {
      database,
      table,
      rowCount: rowCounts[table] || 1000,
      avgRowLength: Math.floor(Math.random() * 200) + 50,
      indexes,
    };
  }

  getIndexesForTable(database: string, table: string): IIndexInfo[] {
    const catalog = this.gather(database, table);
    return catalog[0]?.indexes || [];
  }

  isColumnIndexed(database: string, table: string, column: string): boolean {
    const indexes = this.getIndexesForTable(database, table);
    return indexes.some(idx => idx.columns.includes(column));
  }
}
