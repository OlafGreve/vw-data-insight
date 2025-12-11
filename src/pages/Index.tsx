import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Table2, Upload, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { FileUpload } from '@/components/FileUpload';
import { DataTable } from '@/components/DataTable';
import { DataCharts } from '@/components/DataCharts';
import { DataFilters } from '@/components/DataFilters';
import { parseVehicleData, getFieldNamesByFrequency, filterData } from '@/lib/dataParser';
import { loadDataDictionary } from '@/lib/dataDictionary';
import type { VehicleDataFile, ParsedDataPoint, DataFilter } from '@/types/vehicleData';
import forestRoad from '@/assets/forest-road.jpg';

const Index = () => {
  const [rawData, setRawData] = useState<VehicleDataFile | null>(null);
  const [filter, setFilter] = useState<DataFilter>({
    dataFieldNames: [],
    startDate: null,
    endDate: null,
    searchTerm: '',
  });

  useEffect(() => {
    loadDataDictionary();
  }, []);

  const parsedData = useMemo(() => {
    if (!rawData) return [];
    return parseVehicleData(rawData);
  }, [rawData]);

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

      <main>
        {!rawData ? (
          <>
            {/* Hero Section with Background Image */}
            <section 
              className="relative min-h-[70vh] flex items-center justify-start bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${forestRoad})` }}
            >
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
              
              <div className="relative z-10 container mx-auto px-4 py-16">
                <div className="max-w-2xl">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-primary leading-tight">
                    VW Fahrzeugdaten Analyse
                  </h1>
                  <p className="text-lg md:text-xl text-foreground/90 mb-4 leading-relaxed">
                    Analysiere und visualisiere deine Volkswagen Fahrzeugdaten nach dem EU Data Act.
                  </p>
                  <p className="text-muted-foreground mb-8">
                    Lade deine VW Fahrzeugdaten hoch, um detaillierte Analysen und Visualisierungen zu erhalten.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href="https://eu-data-act.drivesomethinggreater.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Daten anfordern
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Upload Section */}
            <section className="container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto">
                <FileUpload onDataLoaded={handleDataLoaded} />
                
                <div className="mt-12 grid sm:grid-cols-3 gap-6">
                  <FeatureCard 
                    icon={Upload} 
                    title="ZIP Upload" 
                    description="Einfaches Hochladen deiner Daten"
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
            </section>
          </>
        ) : (
          <div className="container mx-auto px-4 py-6 space-y-6 animate-slide-up">
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
                <DataCharts data={filteredData} selectedFields={filter.dataFieldNames} />
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                <DataTable data={filteredData} />
              </TabsContent>
            </Tabs>

            {/* Reset Button */}
            <div className="text-center pt-4">
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
    <div className="p-6 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors">
      <Icon className="w-8 h-8 text-primary mb-3" />
      <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
