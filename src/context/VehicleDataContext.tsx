import { createContext, useContext, useState, ReactNode } from 'react';
import type { VehicleDataFile, ParsedDataPoint } from '@/types/vehicleData';
import { parseVehicleData } from '@/lib/dataParser';

interface VehicleDataContextType {
  rawData: VehicleDataFile | null;
  parsedData: ParsedDataPoint[];
  setRawData: (data: VehicleDataFile | null) => void;
}

const VehicleDataContext = createContext<VehicleDataContextType | undefined>(undefined);

export function VehicleDataProvider({ children }: { children: ReactNode }) {
  const [rawData, setRawDataState] = useState<VehicleDataFile | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDataPoint[]>([]);

  const setRawData = (data: VehicleDataFile | null) => {
    setRawDataState(data);
    setParsedData(data ? parseVehicleData(data) : []);
  };

  return (
    <VehicleDataContext.Provider value={{ rawData, parsedData, setRawData }}>
      {children}
    </VehicleDataContext.Provider>
  );
}

export function useVehicleData() {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleData must be used within a VehicleDataProvider');
  }
  return context;
}
