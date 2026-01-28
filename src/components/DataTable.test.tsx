import { describe, it, expect } from 'vitest';
import type { ParsedDataPoint } from '@/types/vehicleData';

// Extract the sortData logic for testing
function sortData(
  data: ParsedDataPoint[],
  sortField: 'rowNumber' | 'dataFieldName' | 'value' | 'timestampUtc' | 'category',
  sortDirection: 'asc' | 'desc'
): ParsedDataPoint[] {
  return [...data].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'rowNumber':
        comparison = a.rowNumber - b.rowNumber;
        break;
      case 'dataFieldName':
        comparison = a.dataFieldName.localeCompare(b.dataFieldName);
        break;
      case 'value':
        // 1. Null-Werte ans Ende
        if (a.value === null && b.value === null) {
          comparison = 0;
        } else if (a.value === null) {
          comparison = 1;
        } else if (b.value === null) {
          comparison = -1;
        }
        // 2. Gleiche Typen: typspezifisch sortieren
        else if (typeof a.value === 'number' && typeof b.value === 'number') {
          comparison = a.value - b.value;
        } else if (typeof a.value === 'boolean' && typeof b.value === 'boolean') {
          comparison = (a.value === b.value) ? 0 : (a.value ? -1 : 1);
        }
        // 3. Unterschiedliche Typen: nach Typ gruppieren, dann String-Vergleich
        else {
          const typeOrder = { number: 1, boolean: 2, string: 3 };
          const aType = typeof a.value as keyof typeof typeOrder;
          const bType = typeof b.value as keyof typeof typeOrder;
          if (aType !== bType) {
            comparison = typeOrder[aType] - typeOrder[bType];
          } else {
            comparison = String(a.value).localeCompare(String(b.value));
          }
        }
        break;
      case 'timestampUtc':
        const aTime = a.timestampUtc ? a.timestampUtc.getTime() : 0;
        const bTime = b.timestampUtc ? b.timestampUtc.getTime() : 0;
        comparison = aTime - bTime;
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

// Helper to create test data points
function createDataPoint(value: string | number | boolean | null, rowNumber: number): ParsedDataPoint {
  return {
    key: `key-${rowNumber}`,
    dataFieldName: 'testField',
    value,
    rawValue: String(value),
    timestampUtc: new Date(),
    category: 'Test',
    rowNumber,
  };
}

describe('DataTable sortData - Value column sorting', () => {
  describe('Numeric sorting', () => {
    it('sorts numbers numerically ascending (not alphabetically)', () => {
      const data = [
        createDataPoint(10, 1),
        createDataPoint(3, 2),
        createDataPoint(100, 3),
        createDataPoint(5, 4),
        createDataPoint(6, 5),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([3, 5, 6, 10, 100]);
    });

    it('sorts numbers numerically descending', () => {
      const data = [
        createDataPoint(10, 1),
        createDataPoint(3, 2),
        createDataPoint(100, 3),
      ];

      const sorted = sortData(data, 'value', 'desc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([100, 10, 3]);
    });

    it('handles negative numbers correctly', () => {
      const data = [
        createDataPoint(-5, 1),
        createDataPoint(10, 2),
        createDataPoint(-100, 3),
        createDataPoint(0, 4),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([-100, -5, 0, 10]);
    });

    it('handles decimal numbers correctly', () => {
      const data = [
        createDataPoint(1.5, 1),
        createDataPoint(1.25, 2),
        createDataPoint(2.0, 3),
        createDataPoint(1.75, 4),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([1.25, 1.5, 1.75, 2.0]);
    });
  });

  describe('Boolean sorting', () => {
    it('sorts booleans with true before false (ascending)', () => {
      const data = [
        createDataPoint(false, 1),
        createDataPoint(true, 2),
        createDataPoint(false, 3),
        createDataPoint(true, 4),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([true, true, false, false]);
    });

    it('sorts booleans with false before true (descending)', () => {
      const data = [
        createDataPoint(false, 1),
        createDataPoint(true, 2),
      ];

      const sorted = sortData(data, 'value', 'desc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([false, true]);
    });
  });

  describe('String sorting', () => {
    it('sorts strings alphabetically', () => {
      const data = [
        createDataPoint('charging', 1),
        createDataPoint('idle', 2),
        createDataPoint('ready', 3),
        createDataPoint('active', 4),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual(['active', 'charging', 'idle', 'ready']);
    });
  });

  describe('Null handling', () => {
    it('places null values at the end (ascending)', () => {
      const data = [
        createDataPoint(null, 1),
        createDataPoint(5, 2),
        createDataPoint(null, 3),
        createDataPoint(3, 4),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([3, 5, null, null]);
    });

    it('places null values at the beginning (descending)', () => {
      const data = [
        createDataPoint(null, 1),
        createDataPoint(5, 2),
        createDataPoint(3, 3),
      ];

      const sorted = sortData(data, 'value', 'desc');
      const values = sorted.map(d => d.value);

      expect(values).toEqual([null, 5, 3]);
    });
  });

  describe('Mixed type sorting', () => {
    it('groups by type: numbers → booleans → strings → null', () => {
      const data = [
        createDataPoint('text', 1),
        createDataPoint(null, 2),
        createDataPoint(true, 3),
        createDataPoint(42, 4),
        createDataPoint(false, 5),
        createDataPoint(10, 6),
        createDataPoint('abc', 7),
      ];

      const sorted = sortData(data, 'value', 'asc');
      const values = sorted.map(d => d.value);

      // Numbers first (sorted), then booleans (true before false), then strings (sorted), then null
      expect(values).toEqual([10, 42, true, false, 'abc', 'text', null]);
    });
  });
});
