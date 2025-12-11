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
