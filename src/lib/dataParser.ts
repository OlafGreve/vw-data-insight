import type { VehicleDataFile, VehicleDataEntry, ParsedDataPoint } from '@/types/vehicleData';

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
  return data.filter(d => {
    if (fieldNames.length > 0 && !fieldNames.includes(d.dataFieldName)) return false;
    if (startDate && d.timestampUtc && d.timestampUtc < startDate) return false;
    if (endDate && d.timestampUtc && d.timestampUtc > endDate) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!d.dataFieldName.toLowerCase().includes(term) && 
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

export function getStatistics(
  data: ParsedDataPoint[],
  fieldName: string
): import('@/types/vehicleData').FieldStatistics | null {
  const timeSeriesData = getTimeSeriesData(data, fieldName);
  if (timeSeriesData.length === 0) return null;

  const values = timeSeriesData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  
  const squaredDiffs = values.map(v => Math.pow(v - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const first = timeSeriesData[0];
  const last = timeSeriesData[timeSeriesData.length - 1];
  const totalDelta = last.value - first.value;

  // Get mileage data for correlation
  const mileageData = getTimeSeriesData(data, 'mileage');
  const findNearestMileage = (timestamp: Date): number | undefined => {
    if (mileageData.length === 0) return undefined;
    let nearest = mileageData[0];
    let minDiff = Math.abs(timestamp.getTime() - nearest.timestamp.getTime());
    for (const m of mileageData) {
      const diff = Math.abs(timestamp.getTime() - m.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearest = m;
      }
    }
    return nearest.value;
  };

  const firstMileage = findNearestMileage(first.timestamp);
  const lastMileage = findNearestMileage(last.timestamp);
  const deltaPerKm = firstMileage !== undefined && lastMileage !== undefined && lastMileage !== firstMileage
    ? totalDelta / (lastMileage - firstMileage)
    : undefined;

  return {
    fieldName,
    min,
    max,
    average,
    count: values.length,
    stdDev,
    firstValue: { value: first.value, timestamp: first.timestamp, mileage: firstMileage },
    lastValue: { value: last.value, timestamp: last.timestamp, mileage: lastMileage },
    totalDelta,
    deltaPerKm,
  };
}

export function getMileageCorrelatedData(
  data: ParsedDataPoint[],
  fieldName: string
): import('@/types/vehicleData').MileageCorrelatedPoint[] {
  const timeSeriesData = getTimeSeriesData(data, fieldName);
  const mileageData = getTimeSeriesData(data, 'mileage');
  
  if (timeSeriesData.length === 0 || mileageData.length === 0) return [];

  return timeSeriesData.map(point => {
    let nearestMileage = mileageData[0];
    let minDiff = Math.abs(point.timestamp.getTime() - nearestMileage.timestamp.getTime());
    
    for (const m of mileageData) {
      const diff = Math.abs(point.timestamp.getTime() - m.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestMileage = m;
      }
    }

    return {
      timestamp: point.timestamp,
      value: point.value,
      mileage: nearestMileage.value,
    };
  }).sort((a, b) => a.mileage - b.mileage);
}

export function calculateDeltas(
  data: ParsedDataPoint[],
  fieldName: string
): import('@/types/vehicleData').DeltaDataPoint[] {
  const timeSeriesData = getTimeSeriesData(data, fieldName);
  const mileageData = getTimeSeriesData(data, 'mileage');
  
  if (timeSeriesData.length < 2) return [];

  const findNearestMileage = (timestamp: Date): number | undefined => {
    if (mileageData.length === 0) return undefined;
    let nearest = mileageData[0];
    let minDiff = Math.abs(timestamp.getTime() - nearest.timestamp.getTime());
    for (const m of mileageData) {
      const diff = Math.abs(timestamp.getTime() - m.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearest = m;
      }
    }
    return nearest.value;
  };

  const result: import('@/types/vehicleData').DeltaDataPoint[] = [];
  
  for (let i = 1; i < timeSeriesData.length; i++) {
    const prev = timeSeriesData[i - 1];
    const curr = timeSeriesData[i];
    const delta = curr.value - prev.value;
    
    const prevMileage = findNearestMileage(prev.timestamp);
    const currMileage = findNearestMileage(curr.timestamp);
    
    const deltaPerKm = prevMileage !== undefined && currMileage !== undefined && currMileage !== prevMileage
      ? delta / (currMileage - prevMileage)
      : undefined;

    result.push({
      timestamp: curr.timestamp,
      value: curr.value,
      delta,
      mileage: currMileage,
      deltaPerKm,
    });
  }

  return result;
}
