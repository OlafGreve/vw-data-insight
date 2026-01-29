import type { VehicleDataFile, ParsedDataPoint } from '@/types/vehicleData';

/**
 * Filters the original raw data based on the filtered ParsedDataPoints.
 * Uses key + rowNumber for exact mapping back to original entries.
 */
export function exportFilteredData(
  rawData: VehicleDataFile,
  filteredData: ParsedDataPoint[]
): VehicleDataFile {
  // Create Set of filtered keys for fast lookup
  const filteredKeys = new Set(
    filteredData.map(d => `${d.key}-${d.rowNumber}`)
  );
  
  // Filter original data based on filtered ParsedDataPoints
  const filteredOriginalData = rawData.Data.filter((entry, index) => 
    filteredKeys.has(`${entry.key}-${index + 1}`)
  );
  
  return {
    vin: rawData.vin,
    userId: rawData.userId,
    Data: filteredOriginalData
  };
}

/**
 * Downloads data as a JSON file with proper formatting.
 */
export function downloadAsJson(data: VehicleDataFile, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
