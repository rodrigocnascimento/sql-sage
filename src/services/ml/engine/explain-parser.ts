import { IExecutionPlan } from '../../data/types';

export class ExplainParser {
  parse(mysqlExplainResult: Record<string, unknown>): IExecutionPlan {
    const getString = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (val === null || val === undefined) return '';
      return String(val);
    };

    const getNumber = (val: unknown): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseInt(val, 10) || 0;
      return 0;
    };

    const getArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') return val ? [val] : [];
      return [];
    };

    return {
      id: `plan_${Date.now()}`,
      selectType: getString(mysqlExplainResult.select_type || mysqlExplainResult.selectType),
      table: getString(mysqlExplainResult.table),
      type: getString(mysqlExplainResult.type),
      possibleKeys: getArray(mysqlExplainResult.possible_keys || mysqlExplainResult.possibleKeys),
      keyUsed: (mysqlExplainResult.key || mysqlExplainResult.keyUsed) as string | null,
      rowsExamined: getNumber(mysqlExplainResult.rows_examined || mysqlExplainResult.rowsExamined || mysqlExplainResult.rows),
      rowsReturned: getNumber(mysqlExplainResult.rows_returned || mysqlExplainResult.rowsReturned),
    };
  }

  parseFromText(explainText: string): IExecutionPlan[] {
    const lines = explainText.trim().split('\n');
    const plans: IExecutionPlan[] = [];

    for (const line of lines) {
      if (line.startsWith('+') || line.startsWith('|') || line.startsWith('=')) continue;
      if (line.trim() === '') continue;

      const cells = line.split('\t').filter(c => c.trim() !== '');
      if (cells.length < 3) continue;

      const plan: IExecutionPlan = {
        id: `plan_${Date.now()}_${plans.length}`,
        selectType: cells[0] || '',
        table: cells[1] || '',
        type: cells[2] || '',
        possibleKeys: cells[3] ? cells[3].split(',') : [],
        keyUsed: cells[4] || null,
        rowsExamined: cells[5] ? parseInt(cells[5], 10) || 0 : 0,
        rowsReturned: cells[6] ? parseInt(cells[6], 10) || 0 : 0,
      };
      plans.push(plan);
    }

    return plans;
  }

  getSummary(plans: IExecutionPlan[]): { totalRowsExamined: number; totalRowsReturned: number; hasFullScan: boolean } {
    let totalRowsExamined = 0;
    let totalRowsReturned = 0;
    let hasFullScan = false;

    for (const plan of plans) {
      totalRowsExamined += plan.rowsExamined;
      totalRowsReturned += plan.rowsReturned;
      if (plan.type === 'ALL' || plan.type === 'index') {
        hasFullScan = true;
      }
    }

    return { totalRowsExamined, totalRowsReturned, hasFullScan };
  }
}
