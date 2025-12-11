export interface VehicleDataEntry {
  key: string;
  dataFieldName: string;
  value: string;
  timestampUtc: string;
}

export interface VehicleDataFile {
  vin: string;
  userId: string;
  Data: VehicleDataEntry[];
}

export interface ParsedDataPoint {
  key: string;
  dataFieldName: string;
  value: string | number | boolean | null;
  rawValue: string;
  timestampUtc: Date | null;
  category: string;
}

export interface DataFilter {
  dataFieldNames: string[];
  startDate: Date | null;
  endDate: Date | null;
  searchTerm: string;
}

export const IMPORTANT_FIELDS = [
  'currentSOCInPct',
  'cruisingRangeElectricInKm',
  'chargePowerInKW',
  'chargingState',
  'chargeType',
  'remainingChargingTimeToCompleteInMin',
  'chargeRateInInKMPH',
  'mileage',
  'plugLockState',
  'plugConnectionState',
  'externalPower',
  'climatisationState',
  'batteryCareMode',
] as const;

export type ImportantField = typeof IMPORTANT_FIELDS[number];
