import type { ParsedDataPoint } from '@/types/vehicleData';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface PeriodStats {
  period: string;
  periodStart: Date;
  drivenKm: number;
  consumptionKwhPer100km: number | null;
  chargedKwh: number;
}

export type PeriodType = 'day' | 'week' | 'month';

interface MileageEntry {
  timestamp: Date;
  value: number;
}

interface ChargeEntry {
  timestamp: Date;
  soc: number;
}

// Get all mileage entries sorted by timestamp
function getMileageEntries(data: ParsedDataPoint[]): MileageEntry[] {
  return data
    .filter(d => d.dataFieldName === 'mileage' && d.timestampUtc && typeof d.value === 'number')
    .map(d => ({ timestamp: d.timestampUtc!, value: d.value as number }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Get all SOC entries sorted by timestamp
function getSocEntries(data: ParsedDataPoint[]): ChargeEntry[] {
  return data
    .filter(d => d.dataFieldName === 'currentSOCInPct' && d.timestampUtc && typeof d.value === 'number')
    .map(d => ({ timestamp: d.timestampUtc!, soc: d.value as number }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// Get period start function based on type
function getPeriodStart(date: Date, periodType: PeriodType): Date {
  switch (periodType) {
    case 'day': return startOfDay(date);
    case 'week': return startOfWeek(date, { locale: de, weekStartsOn: 1 });
    case 'month': return startOfMonth(date);
  }
}

// Format period label
function formatPeriod(date: Date, periodType: PeriodType): string {
  switch (periodType) {
    case 'day': return format(date, 'dd.MM.yyyy', { locale: de });
    case 'week': return `KW ${format(date, 'w yyyy', { locale: de })}`;
    case 'month': return format(date, 'MMMM yyyy', { locale: de });
  }
}

// Estimate battery capacity (typical ID.3 has 58 or 77 kWh usable)
const BATTERY_CAPACITY_KWH = 58; // Standard ID.3 Pro battery

export function calculatePeriodStatistics(
  data: ParsedDataPoint[],
  periodType: PeriodType
): PeriodStats[] {
  const mileageEntries = getMileageEntries(data);
  const socEntries = getSocEntries(data);

  if (mileageEntries.length < 2) return [];

  // Group entries by period
  const periodMap = new Map<string, {
    periodStart: Date;
    mileageStart: number | null;
    mileageEnd: number | null;
    socChanges: { from: number; to: number }[];
  }>();

  // Process mileage entries
  mileageEntries.forEach((entry, index) => {
    const periodStart = getPeriodStart(entry.timestamp, periodType);
    const periodKey = periodStart.toISOString();

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        periodStart,
        mileageStart: null,
        mileageEnd: null,
        socChanges: [],
      });
    }

    const period = periodMap.get(periodKey)!;
    if (period.mileageStart === null || entry.value < period.mileageStart) {
      period.mileageStart = entry.value;
    }
    if (period.mileageEnd === null || entry.value > period.mileageEnd) {
      period.mileageEnd = entry.value;
    }
  });

  // Process SOC entries to detect charging (when SOC increases)
  for (let i = 1; i < socEntries.length; i++) {
    const prev = socEntries[i - 1];
    const curr = socEntries[i];
    
    // If SOC increased, we charged
    if (curr.soc > prev.soc) {
      const periodStart = getPeriodStart(curr.timestamp, periodType);
      const periodKey = periodStart.toISOString();

      if (periodMap.has(periodKey)) {
        periodMap.get(periodKey)!.socChanges.push({
          from: prev.soc,
          to: curr.soc,
        });
      }
    }
  }

  // Calculate statistics for each period
  const stats: PeriodStats[] = [];

  periodMap.forEach((period, key) => {
    const drivenKm = period.mileageEnd !== null && period.mileageStart !== null
      ? period.mileageEnd - period.mileageStart
      : 0;

    // Calculate charged energy from SOC changes
    const chargedKwh = period.socChanges.reduce((total, change) => {
      const socDelta = change.to - change.from;
      return total + (socDelta / 100) * BATTERY_CAPACITY_KWH;
    }, 0);

    // Calculate consumption (kWh/100km)
    // This is an estimate based on charged energy and driven km
    // More accurate would require actual energy consumption data
    const consumptionKwhPer100km = drivenKm > 10 && chargedKwh > 0
      ? (chargedKwh / drivenKm) * 100
      : null;

    stats.push({
      period: formatPeriod(period.periodStart, periodType),
      periodStart: period.periodStart,
      drivenKm: Math.round(drivenKm * 10) / 10,
      consumptionKwhPer100km: consumptionKwhPer100km !== null 
        ? Math.round(consumptionKwhPer100km * 10) / 10 
        : null,
      chargedKwh: Math.round(chargedKwh * 10) / 10,
    });
  });

  return stats.sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
}

export function getTotalStats(stats: PeriodStats[]) {
  const totalKm = stats.reduce((sum, s) => sum + s.drivenKm, 0);
  const totalCharged = stats.reduce((sum, s) => sum + s.chargedKwh, 0);
  const avgConsumption = totalKm > 0 ? (totalCharged / totalKm) * 100 : null;

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalCharged: Math.round(totalCharged * 10) / 10,
    avgConsumption: avgConsumption !== null ? Math.round(avgConsumption * 10) / 10 : null,
  };
}
