import type { VehicleDataFile, VehicleDataEntry, ParsedDataPoint } from '@/types/vehicleData';
import { endOfDay, format } from 'date-fns';
import { getFieldDescriptionByKey } from '@/lib/dataDictionary';

export function parseVehicleData(data: VehicleDataFile): ParsedDataPoint[] {
  return data.Data.map((entry, index) => ({
    key: entry.key,
    dataFieldName: extractFieldName(entry.dataFieldName),
    value: parseValue(entry.value),
    rawValue: entry.value,
    timestampUtc: entry.timestampUtc ? new Date(entry.timestampUtc) : null,
    category: extractCategory(entry.dataFieldName),
    rowNumber: index + 1,
  }));
}

function extractFieldName(fullPath: string): string {
  const parts = fullPath.split('.');
  return parts[parts.length - 1] || fullPath;
}

function extractCategory(fullPath: string): string {
  const lowerPath = fullPath.toLowerCase();
  if (lowerPath.includes('charge') || lowerPath.includes('soc') || lowerPath.includes('battery')) {
    return 'Batterie & Laden';
  }
  if (lowerPath.includes('clima') || lowerPath.includes('temperature') || lowerPath.includes('heating')) {
    return 'Klimatisierung';
  }
  if (lowerPath.includes('mileage') || lowerPath.includes('range') || lowerPath.includes('km')) {
    return 'Reichweite & Kilometer';
  }
  if (lowerPath.includes('plug') || lowerPath.includes('connection')) {
    return 'Anschluss';
  }
  if (lowerPath.includes('window') || lowerPath.includes('door') || lowerPath.includes('lock')) {
    return 'Fahrzeugstatus';
  }
  if (lowerPath.includes('service') || lowerPath.includes('maintenance') || lowerPath.includes('inspection')) {
    return 'Service';
  }
  return 'Sonstige';
}

function parseValue(value: string): string | number | boolean | null {
  if (value === 'null' || value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  
  return value;
}

export function getFieldNamesByFrequency(data: ParsedDataPoint[]): { name: string; count: number }[] {
  const frequency = getFieldFrequency(data);
  return Array.from(frequency.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getFieldFrequency(data: ParsedDataPoint[]): Map<string, number> {
  const frequency = new Map<string, number>();
  data.forEach(d => {
    frequency.set(d.dataFieldName, (frequency.get(d.dataFieldName) || 0) + 1);
  });
  return frequency;
}

export function filterData(
  data: ParsedDataPoint[],
  fieldNames: string[],
  startDate: Date | null,
  endDate: Date | null,
  searchTerm: string
): ParsedDataPoint[] {
  // Enddatum auf Ende des Tages setzen (23:59:59.999)
  const adjustedEndDate = endDate ? endOfDay(endDate) : null;
  
  return data.filter(d => {
    if (fieldNames.length > 0 && !fieldNames.includes(d.dataFieldName)) return false;
    if (startDate && d.timestampUtc && d.timestampUtc < startDate) return false;
    if (adjustedEndDate && d.timestampUtc && d.timestampUtc > adjustedEndDate) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      
      // Vollständigen Feldnamen aus Data Dictionary holen
      const dictEntry = getFieldDescriptionByKey(d.key);
      const fullFieldName = dictEntry?.dataPointName || d.dataFieldName;
      
      if (!fullFieldName.toLowerCase().includes(term) && 
          !d.dataFieldName.toLowerCase().includes(term) && 
          !d.rawValue.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });
}

export function getTimeSeriesData(
  data: ParsedDataPoint[],
  fieldName: string
): { timestamp: Date; value: number }[] {
  return data
    .filter(d => d.dataFieldName === fieldName && d.timestampUtc && typeof d.value === 'number')
    .map(d => ({
      timestamp: d.timestampUtc!,
      value: d.value as number,
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export interface RangeBySOCPoint {
  timestamp: number;
  date: Date;
  soc100?: number;
  soc80?: number;
  soc60?: number;
  soc40?: number;
  soc20?: number;
}

const SOC_LEVELS = [100, 80, 60, 40, 20] as const;
const SOC_KEYS = SOC_LEVELS.map(l => `soc${l}` as keyof RangeBySOCPoint);

/**
 * Pairs SOC and range data points within a 1-minute window,
 * filters for exact SOC levels (100, 90, 80, ...),
 * and aggregates daily averages.
 */
function findClosestPoint(
  sorted: { timestamp: Date; value: number }[],
  targetTime: number
): { timestamp: Date; value: number } | null {
  if (sorted.length === 0) return null;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].timestamp.getTime() < targetTime) lo = mid + 1;
    else hi = mid;
  }
  const candidates = [sorted[lo], sorted[lo - 1]].filter(Boolean);
  return candidates.reduce((best, c) =>
    !best || Math.abs(c!.timestamp.getTime() - targetTime) < Math.abs(best.timestamp.getTime() - targetTime)
      ? c! : best
  , null as typeof sorted[0] | null);
}

export function getRangeBySOCOverTime(data: ParsedDataPoint[]): RangeBySOCPoint[] {
  // Extract SOC and range time series
  const socPoints = getTimeSeriesData(data, 'currentSOCInPct');
  const rangePoints = getTimeSeriesData(data, 'cruisingRangeElectricInKm');

  if (socPoints.length === 0 || rangePoints.length === 0) return [];

  // For each SOC point at an exact level, find the closest range point within 1 min
  const MAX_GAP_MS = 60 * 1000; // 1 minute
  const pairs: { timestamp: Date; soc: number; range: number }[] = [];

  for (const sp of socPoints) {
    // Exakte 10er-Stufen mit Fliesskomma-Toleranz
    const rounded = Math.round(sp.value);
    if (rounded % 10 !== 0 || rounded < 10 || rounded > 100) continue;

    const spTime = sp.timestamp.getTime();
    const closest = findClosestPoint(rangePoints, spTime);

    if (closest && Math.abs(closest.timestamp.getTime() - spTime) <= MAX_GAP_MS) {
      pairs.push({ timestamp: sp.timestamp, soc: rounded, range: closest.value });
    }
  }

  if (pairs.length === 0) return [];

  // Aggregate by day and SOC level
  const dailyMap = new Map<string, { date: Date; sums: Record<string, number>; counts: Record<string, number> }>();

  for (const p of pairs) {
    const dayKey = format(p.timestamp, 'yyyy-MM-dd');
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, { date: p.timestamp, sums: {}, counts: {} });
    }
    const entry = dailyMap.get(dayKey)!;
    const socKey = `soc${p.soc}`;
    entry.sums[socKey] = (entry.sums[socKey] || 0) + p.range;
    entry.counts[socKey] = (entry.counts[socKey] || 0) + 1;
  }

  // Build result sorted by date
  return Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { date, sums, counts }]) => {
      const point: RangeBySOCPoint = { timestamp: date.getTime(), date };
      for (const key of SOC_KEYS) {
        const k = key as string;
        if (counts[k] && counts[k] >= 1) {
          (point as any)[k] = Math.round(sums[k] / counts[k]);
        }
      }
      return point;
    });
}
