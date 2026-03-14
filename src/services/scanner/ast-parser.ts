import { Project, SyntaxKind, Node, CallExpression, PropertyAccessExpression } from 'ts-morph';

export interface IMethodCall {
  name: string;
  repositoryName: string;
  arguments: string;
  line: number;
  endLine: number;
}

export class TypeOrmAstParser {
  private project: Project;
  private useInMemory: boolean;

  constructor(_rootDir: string, useInMemory = true) {
    this.useInMemory = useInMemory;
    this.project = new Project({
      useInMemoryFileSystem: useInMemory,
      compilerOptions: {
        target: 99,
        module: 99,
        strict: false,
      },
    });
  }

  parseFile(filePath: string): IMethodCall[] {
    const results: IMethodCall[] = [];
    
    try {
      let sourceFile;
      
      if (this.useInMemory) {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf-8');
        sourceFile = this.project.createSourceFile(filePath, content);
      } else {
        sourceFile = this.project.addSourceFileAtPath(filePath);
      }
      
      sourceFile.forEachDescendant((node: Node) => {
        if (Node.isCallExpression(node)) {
          const methodCall = this.extractMethodCall(node);
          if (methodCall) {
            results.push(methodCall);
          }
        }
      });
    } catch (error) {
      // File might not be parseable, skip it
    }
    
    return results;
  }

  parseText(code: string): IMethodCall[] {
    const results: IMethodCall[] = [];
    
    try {
      const sourceFile = this.project.createSourceFile('test.ts', code);
      
      sourceFile.forEachDescendant((node: Node) => {
        if (Node.isCallExpression(node)) {
          const methodCall = this.extractMethodCall(node);
          if (methodCall) {
            results.push(methodCall);
          }
        }
      });
    } catch (error) {
      // Code might not be parseable, skip it
    }
    
    return results;
  }

  private extractMethodCall(node: CallExpression): IMethodCall | null {
    const expression = node.getExpression();
    
    if (!Node.isPropertyAccessExpression(expression)) {
      return null;
    }
    
    const methodName = expression.getName();
    const typeORMMethods = [
      // Find methods
      'find', 'findOne', 'findOneOrFail', 'findOneBy', 'findBy', 
      'findAndCount', 'findAndCountBy', 'count', 'countBy', 
      'exists', 'existsBy',
      // Save methods
      'save', 'create', 'insert', 'upsert',
      // Delete methods
      'delete', 'remove', 'softDelete', 'softRemove',
      // Update methods
      'update', 'updateAll', 'increment', 'decrement',
    ];
    
    if (!typeORMMethods.includes(methodName)) {
      return null;
    }
    
    const objectExpression = expression.getExpression();
    const objectText = objectExpression.getText();
    
    if (!objectText.includes('Repository') && !objectText.includes('repository')) {
      return null;
    }
    
    const args = node.getArguments();
    const argsText = args.map(arg => arg.getText()).join(', ');
    
    const startPos = node.getStart();
    const sourceFile = node.getSourceFile();
    const startLine = sourceFile.getLineAndColumnAtPos(startPos).line;
    const endLine = sourceFile.getLineAndColumnAtPos(node.getEnd()).line;
    
    return {
      name: methodName,
      repositoryName: objectText,
      arguments: argsText,
      line: startLine,
      endLine,
    };
  }

  dispose(): void {
    // ts-morph doesn't require explicit disposal in most cases
  }
}
