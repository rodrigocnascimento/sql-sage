import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { QueryPerformancePredictor } from './model.js';
import { IVectorizedQuery } from './types.js';

describe('QueryPerformancePredictor', () => {
  let predictor: QueryPerformancePredictor;

  beforeEach(() => {
    predictor = new QueryPerformancePredictor(19, 100);
  });

  afterEach(() => {
    tf.dispose();
  });

  describe('constructor', () => {
    it('should create predictor with given parameters', () => {
      expect(predictor).toBeDefined();
      expect(predictor.queriesProcessed).toBe(0);
    });
  });

  describe('buildModel', () => {
    it('should build a valid TensorFlow.js model', () => {
      predictor.buildModel();
      expect(predictor).toBeDefined();
    });

    it('should handle multiple buildModel calls', () => {
      predictor.buildModel();
      predictor.buildModel();
      expect(predictor).toBeDefined();
    });
  });

  describe('explainPrediction', () => {
    beforeEach(() => {
      predictor.buildModel();
    });

    it('should return prediction result with score and insights', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(0).map((_, i) => i % 19),
        structuralFeatures: [0.1, 0.2, 0.3, 0.4, 0, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);

      expect(result).toHaveProperty('performanceScore');
      expect(result).toHaveProperty('insights');
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(1);
    });

    it('should increment queriesProcessed counter', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 0, 0, 0, 0]
      };

      expect(predictor.queriesProcessed).toBe(0);
      await predictor.explainPrediction(vector);
      expect(predictor.queriesProcessed).toBe(1);
      await predictor.explainPrediction(vector);
      expect(predictor.queriesProcessed).toBe(2);
    });

    it('should throw error if model not built', async () => {
      const newPredictor = new QueryPerformancePredictor(19, 100);
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 0, 0, 0, 0]
      };

      await expect(newPredictor.explainPrediction(vector)).rejects.toThrow('Model not initialized');
    });

    it('should return score in valid range', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(0),
        structuralFeatures: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      };

      const result = await predictor.explainPrediction(vector);
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(1);
    });

    it('should handle various feature combinations', async () => {
      const testCases = [
        { features: [0, 0, 0, 0, 0, 0, 0, 0] },
        { features: [1, 1, 1, 1, 0, 0, 0, 0] },
        { features: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
      ];

      for (const tc of testCases) {
        const vector: IVectorizedQuery = {
          tokenSequence: Array(100).fill(1),
          structuralFeatures: tc.features as number[]
        };
        const result = await predictor.explainPrediction(vector);
        expect(result.performanceScore).toBeGreaterThanOrEqual(0);
        expect(result.performanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('generateInsights', () => {
    beforeEach(() => {
      predictor.buildModel();
    });

    it('should generate insights for Cartesian risk', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const hasCartesianInsight = result.insights.some(i => i.issueType === 'PERFORMANCE_BOTTLENECK');
      expect(hasCartesianInsight).toBe(true);
    });

    it('should generate insights for missing indexes', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 0, 0.5, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const hasSchemaInsight = result.insights.some(i => i.issueType === 'SCHEMA_SUGGESTION');
      expect(hasSchemaInsight).toBe(true);
    });

    it('should generate insights for full table scan', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 0, 0, 1, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const hasAntiPattern = result.insights.some(i => i.issueType === 'ANTI_PATTERN');
      expect(hasAntiPattern).toBe(true);
    });

    it('should include educational fixes in insights', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const cartesianInsight = result.insights.find(i => i.issueType === 'PERFORMANCE_BOTTLENECK');
      expect(cartesianInsight?.educationalFix).toBeDefined();
      expect(cartesianInsight?.educationalFix.length).toBeGreaterThan(0);
    });

    it('should include affected segment in insights', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const insight = result.insights[0];
      expect(insight?.affectedSegment).toBeDefined();
    });

    it('should include severity score in insights', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const insight = result.insights[0];
      expect(insight?.severityScore).toBeGreaterThan(0);
      expect(insight?.severityScore).toBeLessThanOrEqual(1);
    });

    it('should include line number in insights', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const insight = result.insights[0];
      expect(insight?.lineNumber).toBeDefined();
      expect(typeof insight?.lineNumber).toBe('number');
    });

    it('should return multiple insights when multiple issues detected', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0.5, 1, 0]
      };

      const result = await predictor.explainPrediction(vector);
      expect(result.insights.length).toBeGreaterThan(1);
    });

    it('should return empty insights for good query', async () => {
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0.1, 0, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      const hasNoInsights = result.insights.length === 0;
      expect(hasNoInsights).toBe(true);
    });

    it('should adjust severity based on score', async () => {
      const vectorLowScore: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 1, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vectorLowScore);
      const insight = result.insights.find(i => i.issueType === 'PERFORMANCE_BOTTLENECK');
      expect(insight?.severityScore).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very short token sequences', async () => {
      predictor.buildModel();
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: [0, 0, 0, 0, 0, 0, 0, 0]
      };

      const result = await predictor.explainPrediction(vector);
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle all zeros in features', async () => {
      predictor.buildModel();
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(0),
        structuralFeatures: Array(8).fill(0)
      };

      const result = await predictor.explainPrediction(vector);
      expect(result).toBeDefined();
    });

    it('should handle all ones in features', async () => {
      predictor.buildModel();
      const vector: IVectorizedQuery = {
        tokenSequence: Array(100).fill(1),
        structuralFeatures: Array(8).fill(1)
      };

      const result = await predictor.explainPrediction(vector);
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
    });
  });
});
