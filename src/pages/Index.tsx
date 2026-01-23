import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Table2, ExternalLink, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { DataTable } from "@/components/DataTable";
import { DataCharts } from "@/components/DataCharts";
import { DataFilters } from "@/components/DataFilters";
import { ChartsSkeleton } from "@/components/ChartsSkeleton";
import { parseVehicleData, getFieldNamesByFrequency, filterData } from "@/lib/dataParser";
import { loadDataDictionary } from "@/lib/dataDictionary";
import type { VehicleDataFile, ParsedDataPoint, DataFilter } from "@/types/vehicleData";
import forestRoadBeetle from "@/assets/forest-road-beetle.jpg";
const Index = () => {
  const [rawData, setRawData] = useState<VehicleDataFile | null>(null);
  const [activeTab, setActiveTab] = useState("charts");
  const [useLinearTimeScale, setUseLinearTimeScale] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<DataFilter>({
    dataFieldNames: [],
    startDate: null,
    endDate: null,
    searchTerm: ""
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
  // Show skeleton briefly then reveal charts
  useEffect(() => {
    if (rawData && isProcessing) {
      const timer = setTimeout(() => setIsProcessing(false), 100);
      return () => clearTimeout(timer);
    }
  }, [rawData, parsedData, isProcessing]);

  const handleDataLoaded = (data: VehicleDataFile) => {
    setIsProcessing(true);
    setRawData(data);
    setFilter({
      dataFieldNames: [],
      startDate: null,
      endDate: null,
      searchTerm: ""
    });
  };
  return <div className="min-h-screen bg-background">
      <Header vin={rawData?.vin} dataCount={parsedData.length} />

      <main>
        {!rawData ? <section className="relative min-h-[calc(100vh-4rem)] flex items-center bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${forestRoadBeetle})`
      }}>
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />

            <div className="relative z-10 container mx-auto px-4 py-8">
              <div className="max-w-xl">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 text-primary leading-tight">
                  VW Fahrzeugdaten Analyse
                </h1>
                <p className="text-base md:text-lg text-foreground/90 mb-6 leading-relaxed">
                  Analysiere und visualisiere deine Volkswagen Fahrzeugdaten nach dem EU Data Act.
                </p>

                {/* Combined Action Box */}
                <div className="bg-card/20 backdrop-blur-md border border-border/50 rounded-lg p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">
                        Fordere deine Daten beim VW EU Data Act Portal an:
                      </p>
                      <a href="https://eu-data-act.drivesomethinggreater.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors">
                        eu-data-act.drivesomethinggreater.com
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-border/50" />

                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-3">Lade die erhaltene ZIP-Datei hier zur Analyse:</p>
                      <FileUpload onDataLoaded={handleDataLoaded} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section> : <div className="container mx-auto px-4 py-6 space-y-6 animate-slide-up">
            <DataFilters filter={filter} onFilterChange={setFilter} fieldsWithFrequency={fieldsWithFrequency} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <TabsList className="bg-secondary/50 p-1">
                  <TabsTrigger value="charts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Diagramme
                  </TabsTrigger>
                  <TabsTrigger value="table" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Table2 className="w-4 h-4 mr-2" />
                    Tabelle
                  </TabsTrigger>
                </TabsList>

                {activeTab === "charts" && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-secondary/50 transition-colors">
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>Rechtsklick (oder langes Tippen) auf einen Datenpunkt, um Start- oder Enddatum für den Filter zu setzen</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        id="linear-time-scale"
                        checked={useLinearTimeScale}
                        onCheckedChange={setUseLinearTimeScale}
                      />
                      <Label htmlFor="linear-time-scale" className="text-sm whitespace-nowrap cursor-pointer">
                        Lineare Zeitachse
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <TabsContent value="charts" className="mt-6">
                {isProcessing ? (
                  <ChartsSkeleton />
                ) : (
                  <DataCharts 
                    data={filteredData} 
                    selectedFields={filter.dataFieldNames}
                    useLinearTimeScale={useLinearTimeScale}
                    onDateRangeSelect={(startDate, endDate, mode) => {
                      setFilter(prev => ({
                        ...prev,
                        startDate: mode === 'start' ? startDate : prev.startDate,
                        endDate: mode === 'end' ? endDate : prev.endDate,
                      }));
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                <DataTable data={filteredData} />
              </TabsContent>
            </Tabs>

            {/* Reset Button */}
            <div className="text-center pt-4">
              <button onClick={() => setRawData(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline">
                Andere Datei laden
              </button>
            </div>
          </div>}
      </main>
    </div>;
};
export default Index;