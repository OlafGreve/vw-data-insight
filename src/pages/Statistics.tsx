import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Zap, Car, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicleData } from '@/context/VehicleDataContext';
import { calculatePeriodStatistics, getTotalStats, PeriodType, PeriodStats } from '@/lib/statisticsCalculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Statistics = () => {
  const { rawData, parsedData } = useVehicleData();
  const [periodType, setPeriodType] = useState<PeriodType>('day');

  const stats = useMemo(() => 
    calculatePeriodStatistics(parsedData, periodType),
    [parsedData, periodType]
  );

  const totals = useMemo(() => getTotalStats(stats), [stats]);

  if (!rawData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Keine Daten geladen</h2>
            <p className="text-muted-foreground mb-4">
              Bitte laden Sie zuerst Ihre Fahrzeugdaten auf der Startseite hoch.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zur Startseite
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data (reverse to show chronologically)
  const chartData = [...stats].reverse().slice(-14); // Last 14 periods

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="font-display font-bold text-lg md:text-xl tracking-tight">
                  <span className="text-gradient">Fahrstatistik</span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  VIN: {rawData.vin}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={Car}
            title="Gefahrene Kilometer"
            value={`${totals.totalKm.toLocaleString('de-DE')} km`}
            subtitle="Gesamt"
          />
          <SummaryCard
            icon={TrendingUp}
            title="Ø Verbrauch"
            value={totals.avgConsumption !== null ? `${totals.avgConsumption} kWh/100km` : '—'}
            subtitle="Durchschnitt"
          />
          <SummaryCard
            icon={Zap}
            title="Geladene Energie"
            value={`${totals.totalCharged.toLocaleString('de-DE')} kWh`}
            subtitle="Gesamt"
          />
        </div>

        {/* Period Tabs */}
        <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger 
              value="day" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Tag
            </TabsTrigger>
            <TabsTrigger 
              value="week"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Woche
            </TabsTrigger>
            <TabsTrigger 
              value="month"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Monat
            </TabsTrigger>
          </TabsList>

          {['day', 'week', 'month'].map((period) => (
            <TabsContent key={period} value={period} className="mt-6 space-y-6">
              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" />
                      Gefahrene Kilometer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value} km`, 'Kilometer']}
                          />
                          <Bar 
                            dataKey="drivenKm" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-electric" />
                      Geladene Energie
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            className="fill-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value} kWh`, 'Energie']}
                          />
                          <Bar 
                            dataKey="chargedKwh" 
                            fill="hsl(var(--electric))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detaillierte Statistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Zeitraum</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Kilometer</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Verbrauch</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Geladen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((stat, idx) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="py-3 px-2 font-medium">{stat.period}</td>
                            <td className="py-3 px-2 text-right">{stat.drivenKm.toLocaleString('de-DE')} km</td>
                            <td className="py-3 px-2 text-right">
                              {stat.consumptionKwhPer100km !== null 
                                ? `${stat.consumptionKwhPer100km} kWh/100km`
                                : '—'}
                            </td>
                            <td className="py-3 px-2 text-right text-electric">
                              {stat.chargedKwh.toLocaleString('de-DE')} kWh
                            </td>
                          </tr>
                        ))}
                        {stats.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-muted-foreground">
                              Keine Daten für diesen Zeitraum verfügbar
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
}

function SummaryCard({ icon: Icon, title, value, subtitle }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-display font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Statistics;
