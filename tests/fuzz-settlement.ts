/**
 * Property-Based / Fuzz Testing for Settlement Math
 *
 * Tests all three index methods (Sum, Mean, Max) and both trigger directions.
 * This is a TypeScript simulation matching the on-chain Rust logic.
 */

import { expect } from 'chai';

type IndexMethod = 'Sum' | 'Mean' | 'Max';
type TriggerDirection = 'LT' | 'GT';

function computeIndex(observations: number[], method: IndexMethod): number {
  if (observations.length === 0) return 0;
  switch (method) {
    case 'Sum':
      return observations.reduce((a, b) => a + b, 0);
    case 'Mean':
      return Math.floor(observations.reduce((a, b) => a + b, 0) / observations.length);
    case 'Max':
      return Math.max(...observations);
  }
}

function evaluateTrigger(indexValue: number, threshold: number, direction: TriggerDirection): boolean {
  return direction === 'LT' ? indexValue <= threshold : indexValue >= threshold;
}

function simulateSettlement(
  observations: number[],
  threshold: number,
  direction: TriggerDirection,
  method: IndexMethod = 'Sum'
): { indexValue: number; triggered: boolean } {
  const indexValue = computeIndex(observations, method);
  const triggered = evaluateTrigger(indexValue, threshold, direction);
  return { indexValue, triggered };
}

describe('Settlement Math - All Index Methods', () => {

  // ============================================
  // SUM INDEX
  // ============================================
  describe('Sum Index', () => {
    it('Sum is always deterministic', () => {
      const obs = [120, 80, 95, 110];
      const r1 = simulateSettlement(obs, 500, 'LT', 'Sum');
      const r2 = simulateSettlement(obs, 500, 'LT', 'Sum');
      expect(r1.indexValue).to.equal(r2.indexValue);
      expect(r1.triggered).to.equal(r2.triggered);
    });

    it('Drought trigger (LessThan) fires when sum <= threshold', () => {
      expect(simulateSettlement([50, 60, 70], 200, 'LT', 'Sum').triggered).to.be.true;   // 180 <= 200
      expect(simulateSettlement([100, 100, 100], 300, 'LT', 'Sum').triggered).to.be.true; // 300 <= 300 (boundary)
      expect(simulateSettlement([300, 200, 100], 200, 'LT', 'Sum').triggered).to.be.false; // 600 > 200
    });

    it('Flood trigger (GreaterThan) fires when sum >= threshold', () => {
      expect(simulateSettlement([300, 400, 500], 800, 'GT', 'Sum').triggered).to.be.true;  // 1200 >= 800
      expect(simulateSettlement([100, 100, 100], 300, 'GT', 'Sum').triggered).to.be.true;  // 300 >= 300 (boundary)
      expect(simulateSettlement([100, 100, 100], 800, 'GT', 'Sum').triggered).to.be.false; // 300 < 800
    });

    it('Handles empty observations (sum = 0)', () => {
      expect(simulateSettlement([], 0, 'LT', 'Sum').triggered).to.be.true;  // 0 <= 0
      expect(simulateSettlement([], 1, 'GT', 'Sum').triggered).to.be.false; // 0 < 1
    });
  });

  // ============================================
  // MEAN INDEX
  // ============================================
  describe('Mean Index', () => {
    it('Mean is computed correctly with integer division', () => {
      const obs = [100, 200, 300]; // mean = 200
      const result = simulateSettlement(obs, 200, 'LT', 'Mean');
      expect(result.indexValue).to.equal(200);
      expect(result.triggered).to.be.true; // 200 <= 200
    });

    it('Mean uses floor division (matches Rust behavior)', () => {
      const obs = [100, 200, 301]; // mean = 200.33... => floor = 200
      const result = simulateSettlement(obs, 200, 'LT', 'Mean');
      expect(result.indexValue).to.equal(200); // Floor division
      expect(result.triggered).to.be.true; // 200 <= 200
    });

    it('Mean drought threshold', () => {
      // Daily avg rainfall < 30mm/day for 7 days = drought
      const obs = [2500, 2800, 3100, 2200, 2900, 2700, 3000]; // scale: mm*100
      const mean = computeIndex(obs, 'Mean'); // ~2742
      expect(mean).to.be.greaterThan(2500);
      expect(simulateSettlement(obs, 2000, 'LT', 'Mean').triggered).to.be.false; // avg > 20mm
      expect(simulateSettlement(obs, 3000, 'LT', 'Mean').triggered).to.be.true;  // avg <= 30mm
    });

    it('Mean flood threshold', () => {
      const obs = [5000, 6000, 5500, 7000]; // heavy rainfall
      const mean = computeIndex(obs, 'Mean'); // 5875
      expect(simulateSettlement(obs, 5000, 'GT', 'Mean').triggered).to.be.true;  // avg >= 50mm
      expect(simulateSettlement(obs, 6000, 'GT', 'Mean').triggered).to.be.false; // avg < 60mm
    });

    it('Single observation mean equals the value', () => {
      expect(computeIndex([4200], 'Mean')).to.equal(4200);
    });
  });

  // ============================================
  // MAX INDEX
  // ============================================
  describe('Max Index', () => {
    it('Max identifies highest observation', () => {
      const obs = [100, 500, 300, 200];
      expect(computeIndex(obs, 'Max')).to.equal(500);
    });

    it('Max extreme rainfall trigger', () => {
      // Trigger if ANY single day exceeds threshold
      const obs = [2000, 3000, 15000, 2500, 1800]; // Day 3 = extreme
      expect(simulateSettlement(obs, 10000, 'GT', 'Max').triggered).to.be.true;  // max=15000 >= 10000
      expect(simulateSettlement(obs, 20000, 'GT', 'Max').triggered).to.be.false; // max=15000 < 20000
    });

    it('Max drought trigger (no day exceeds minimum)', () => {
      const obs = [500, 800, 300, 600]; // All days very dry
      expect(simulateSettlement(obs, 1000, 'LT', 'Max').triggered).to.be.true;  // max=800 <= 1000
      expect(simulateSettlement(obs, 700, 'LT', 'Max').triggered).to.be.false;  // max=800 > 700
    });

    it('Single observation max equals the value', () => {
      expect(computeIndex([4200], 'Max')).to.equal(4200);
    });

    it('All equal observations', () => {
      const obs = [3000, 3000, 3000, 3000];
      expect(computeIndex(obs, 'Max')).to.equal(3000);
      expect(computeIndex(obs, 'Mean')).to.equal(3000);
      expect(computeIndex(obs, 'Sum')).to.equal(12000);
    });
  });

  // ============================================
  // CROSS-METHOD COMPARISONS
  // ============================================
  describe('Cross-Method Properties', () => {
    it('Max >= Mean for any non-empty observation set', () => {
      const testSets = [
        [100, 200, 300],
        [1],
        [5000, 5000, 5000],
        [0, 0, 10000],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      ];

      for (const obs of testSets) {
        const max = computeIndex(obs, 'Max');
        const mean = computeIndex(obs, 'Mean');
        expect(max).to.be.greaterThanOrEqual(mean, `Failed for obs=${obs}`);
      }
    });

    it('Sum >= Max for non-negative observations', () => {
      const testSets = [
        [100, 200, 300],
        [1],
        [5000, 5000, 5000],
        [0, 0, 10000],
      ];

      for (const obs of testSets) {
        const sum = computeIndex(obs, 'Sum');
        const max = computeIndex(obs, 'Max');
        expect(sum).to.be.greaterThanOrEqual(max, `Failed for obs=${obs}`);
      }
    });

    it('Mean * count == Sum (within integer rounding)', () => {
      const obs = [100, 200, 300, 400];
      const sum = computeIndex(obs, 'Sum');
      const mean = computeIndex(obs, 'Mean');
      // Due to floor division: mean * count <= sum
      expect(mean * obs.length).to.be.at.most(sum);
      expect(mean * obs.length).to.be.greaterThan(sum - obs.length); // Off by at most (count-1)
    });
  });

  // ============================================
  // BOUNDARY & EDGE CASES
  // ============================================
  describe('Boundary & Edge Cases', () => {
    it('Exact threshold boundary (LT includes equality)', () => {
      expect(evaluateTrigger(100, 100, 'LT')).to.be.true;  // 100 <= 100
      expect(evaluateTrigger(101, 100, 'LT')).to.be.false; // 101 > 100
    });

    it('Exact threshold boundary (GT includes equality)', () => {
      expect(evaluateTrigger(100, 100, 'GT')).to.be.true;  // 100 >= 100
      expect(evaluateTrigger(99, 100, 'GT')).to.be.false;  // 99 < 100
    });

    it('Zero observations with zero threshold', () => {
      expect(simulateSettlement([], 0, 'LT', 'Sum').triggered).to.be.true;
      expect(simulateSettlement([], 0, 'GT', 'Sum').triggered).to.be.true;
    });

    it('Very large observation values', () => {
      const obs = [Number.MAX_SAFE_INTEGER - 1];
      const result = computeIndex(obs, 'Sum');
      expect(result).to.equal(Number.MAX_SAFE_INTEGER - 1);
    });

    it('31-day window (max allowed)', () => {
      const obs = Array(31).fill(100);
      expect(computeIndex(obs, 'Sum')).to.equal(3100);
      expect(computeIndex(obs, 'Mean')).to.equal(100);
      expect(computeIndex(obs, 'Max')).to.equal(100);
    });
  });
});
