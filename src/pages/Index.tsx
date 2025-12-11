import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Table2, Upload, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { FileUpload } from '@/components/FileUpload';
import { DataTable } from '@/components/DataTable';
import { DataCharts } from '@/components/DataCharts';
import { DataFilters } from '@/components/DataFilters';
import { getFieldNamesByFrequency, filterData } from '@/lib/dataParser';
import { loadDataDictionary } from '@/lib/dataDictionary';
import { useVehicleData } from '@/context/VehicleDataContext';
import type { VehicleDataFile, DataFilter } from '@/types/vehicleData';

const Index = () => {
  const { rawData, parsedData, setRawData } = useVehicleData();
  const [filter, setFilter] = useState<DataFilter>({
    dataFieldNames: [],
    startDate: null,
    endDate: null,
    searchTerm: '',
  });

  useEffect(() => {
    loadDataDictionary();
  }, []);

  const filteredData = useMemo(() => {
    return filterData(parsedData, filter.dataFieldNames, filter.startDate, filter.endDate, filter.searchTerm);
  }, [parsedData, filter]);

  const fieldsWithFrequency = useMemo(() => getFieldNamesByFrequency(parsedData), [parsedData]);

  const handleDataLoaded = (data: VehicleDataFile) => {
    setRawData(data);
    setFilter({
      dataFieldNames: [],
      startDate: null,
      endDate: null,
      searchTerm: '',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header vin={rawData?.vin} dataCount={parsedData.length} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {!rawData ? (
          <div className="max-w-2xl mx-auto py-12 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
                <span className="text-gradient">Willkommen</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Laden Sie Ihre VW Fahrzeugdaten hoch, um detaillierte Analysen und Visualisierungen zu erhalten.
              </p>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} />
            
            <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center">
              <FeatureCard 
                icon={Upload} 
                title="ZIP Upload" 
                description="Einfaches Hochladen Ihrer Daten"
              />
              <FeatureCard 
                icon={Table2} 
                title="Tabellen" 
                description="Sortierbare Datenansicht"
              />
              <FeatureCard 
                icon={BarChart3} 
                title="Charts" 
                description="Interaktive Visualisierungen"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <DataFilters 
              filter={filter}
              onFilterChange={setFilter}
              fieldsWithFrequency={fieldsWithFrequency}
            />

            <Tabs defaultValue="charts" className="w-full">
              <TabsList className="bg-secondary/50 p-1">
                <TabsTrigger 
                  value="charts" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Diagramme
                </TabsTrigger>
                <TabsTrigger 
                  value="table"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Table2 className="w-4 h-4 mr-2" />
                  Tabelle
                </TabsTrigger>
              </TabsList>

              <TabsContent value="charts" className="mt-6">
                <DataCharts data={filteredData} />
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                <DataTable data={filteredData} />
              </TabsContent>
            </Tabs>

            {/* Navigation & Reset */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <Link
                to="/statistics"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Fahrstatistik anzeigen
              </Link>
              <button
                onClick={() => setRawData(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Andere Datei laden
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/30">
      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
      <h3 className="font-display font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
