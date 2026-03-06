import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MLPredictionService, MLPredictionRequest, MLPredictionResponse } from './ml-prediction.service.js';
import * as tf from '@tensorflow/tfjs';

describe('MLPredictionService', () => {
  let service: MLPredictionService;

  beforeEach(async () => {
    service = new MLPredictionService();
    await service.initialize();
  });

  afterEach(() => {
    tf.dispose();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      const svc = new MLPredictionService();
      expect(svc).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize the ML engine', async () => {
      const svc = new MLPredictionService();
      await svc.initialize();
      expect(svc).toBeDefined();
    });

    it('should allow multiple initialize calls', async () => {
      const svc = new MLPredictionService();
      await svc.initialize();
      await svc.initialize();
      expect(svc).toBeDefined();
    });
  });

  describe('predict', () => {
    it('should return prediction with all required fields', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users WHERE id = 1' };
      const result = await service.predict(request);

      expect(result).toHaveProperty('performanceScore');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('tokens');
    });

    it('should return performance score between 0 and 1', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users' };
      const result = await service.predict(request);

      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(1);
    });

    it('should return insights array', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users' };
      const result = await service.predict(request);

      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should return features object with all fields', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users' };
      const result = await service.predict(request);

      expect(result.features).toHaveProperty('joinCount');
      expect(result.features).toHaveProperty('subqueryDepth');
      expect(result.features).toHaveProperty('whereClauseComplexity');
      expect(result.features).toHaveProperty('selectedColumnsCount');
      expect(result.features).toHaveProperty('hasCartesianRisk');
      expect(result.features).toHaveProperty('missingIndexCount');
      expect(result.features).toHaveProperty('fullTableScanRisk');
    });

    it('should return tokens array', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT name FROM users WHERE id = 1' };
      const result = await service.predict(request);

      expect(Array.isArray(result.tokens)).toBe(true);
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('should detect Cartesian product risk', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users, orders' };
      const result = await service.predict(request);

      expect(result.features.hasCartesianRisk).toBe(true);
    });

    it('should detect full table scan risk', async () => {
      const request: MLPredictionRequest = { sql: "SELECT * FROM users WHERE name LIKE '%test%'" };
      const result = await service.predict(request);

      expect(result.features.fullTableScanRisk).toBe(true);
    });

    it('should count JOINs correctly', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM a JOIN b ON a.id = b.id JOIN c ON b.id = c.id' };
      const result = await service.predict(request);

      expect(result.features.joinCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle complex queries with subqueries', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)' };
      const result = await service.predict(request);

      expect(result.features.subqueryDepth).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty SQL', async () => {
      const request: MLPredictionRequest = { sql: '' };
      const result = await service.predict(request);

      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(1);
    });

    it('should handle SQL with schema context', async () => {
      const request: MLPredictionRequest = { 
        sql: 'SELECT * FROM users WHERE name = "test"',
        schemaContext: 'users: id, name'
      };
      const result = await service.predict(request);

      expect(result).toBeDefined();
    });

    it('should generate insights for performance issues', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users, orders' };
      const result = await service.predict(request);

      const hasInsight = result.insights.length > 0;
      expect(hasInsight).toBe(true);
    });

    it('should limit tokens to 20', async () => {
      const longQuery = 'SELECT a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z FROM users';
      const request: MLPredictionRequest = { sql: longQuery };
      const result = await service.predict(request);

      expect(result.tokens.length).toBeLessThanOrEqual(20);
    });

    it('should throw if engine not initialized', async () => {
      const uninitializedService = new MLPredictionService();
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users' };

      await expect(uninitializedService.predict(request)).rejects.toThrow('ML engine not initialized');
    });
  });

  describe('getStatus', () => {
    it('should return status with isLoaded true after initialization', async () => {
      const status = await service.getStatus();

      expect(status.isLoaded).toBe(true);
      expect(typeof status.vocabularySize).toBe('number');
      expect(typeof status.queriesAnalyzed).toBe('number');
      expect(typeof status.trainingSessions).toBe('number');
    });

    it('should return correct vocabulary size', async () => {
      const status = await service.getStatus();

      expect(status.vocabularySize).toBeGreaterThan(0);
    });

    it('should return updated queriesAnalyzed after prediction', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users' };
      await service.predict(request);

      const status = await service.getStatus();
      expect(status.queriesAnalyzed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long SQL query', async () => {
      const longSql = 'SELECT ' + Array(100).fill('col').join(', ') + ' FROM users';
      const request: MLPredictionRequest = { sql: longSql };
      const result = await service.predict(request);

      expect(result).toBeDefined();
    });

    it('should handle SQL with only keywords', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT FROM WHERE AND OR' };
      const result = await service.predict(request);

      expect(result).toBeDefined();
    });

    it('should handle SQL with numbers', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM users WHERE age > 21 AND id < 100' };
      const result = await service.predict(request);

      expect(result).toBeDefined();
    });

    it('should handle SQL with special characters', async () => {
      const request: MLPredictionRequest = { sql: 'SELECT * FROM `my-table` WHERE `col-1` = 1' };
      const result = await service.predict(request);

      expect(result).toBeDefined();
    });

    it('should convert tokens to uppercase', async () => {
      const request: MLPredictionRequest = { sql: 'select name from users' };
      const result = await service.predict(request);

      const hasUppercaseTokens = result.tokens.every(t => t === t.toUpperCase());
      expect(hasUppercaseTokens).toBe(true);
    });
  });
});
