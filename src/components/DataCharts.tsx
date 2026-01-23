import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ReferenceArea } from 'recharts';
import type { ParsedDataPoint } from '@/types/vehicleData';
import { getTimeSeriesData, getFieldFrequency } from '@/lib/dataParser';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Battery, Gauge, Zap, Route, Clock, MousePointer2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DataChartsProps {
  data: ParsedDataPoint[];
  selectedFields?: string[];
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
}

// Vordefinierte Felder, die immer angezeigt werden
const CORE_FIELDS = ['currentSOCInPct', 'cruisingRangeElectricInKm', 'chargePowerInKW', 'mileage'];

// Farben für zusätzliche Charts
const CHART_COLORS = [
  'hsl(280, 70%, 55%)',
  'hsl(200, 70%, 55%)',
  'hsl(120, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(60, 70%, 50%)',
];

export function DataCharts({ data, selectedFields = [], onDateRangeSelect }: DataChartsProps) {
  const [useLinearTimeScale, setUseLinearTimeScale] = useState(false);
  
  // Zoom selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // Mouse event handlers for zoom selection
  const handleMouseDown = (e: any) => {
    if (!e?.activeLabel || !e.shiftKey) return;
    
    const timestamp = typeof e.activeLabel === 'number' 
      ? e.activeLabel 
      : new Date(e.activeLabel).getTime();
    
    setIsSelecting(true);
    setSelectionStart(timestamp);
    setSelectionEnd(timestamp);
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting || !e?.activeLabel) return;
    
    const timestamp = typeof e.activeLabel === 'number' 
      ? e.activeLabel 
      : new Date(e.activeLabel).getTime();
    
    setSelectionEnd(timestamp);
  };

  const handleMouseUp = () => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) {
      setIsSelecting(false);
      return;
    }
    
    // Sort timestamps (start < end)
    const [start, end] = [selectionStart, selectionEnd].sort((a, b) => a - b);
    
    // Call parent callback with Date objects
    onDateRangeSelect?.(new Date(start), new Date(end));
    
    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
      handleMouseUp();
    }
  };

  // Helper function to convert Date objects to numeric timestamps for linear scale
  const toNumericTimestamps = (chartData: { timestamp: Date; value: number }[]) => {
    return chartData.map(d => ({
      ...d,
      timestamp: d.timestamp.getTime(),
    }));
  };
  
  const socDataRaw = useMemo(() => getTimeSeriesData(data, 'currentSOCInPct'), [data]);
  const rangeDataRaw = useMemo(() => getTimeSeriesData(data, 'cruisingRangeElectricInKm'), [data]);
  const powerDataRaw = useMemo(() => getTimeSeriesData(data, 'chargePowerInKW'), [data]);
  const mileageData = useMemo(() => getTimeSeriesData(data, 'mileage'), [data]);

  // Convert to numeric timestamps when linear scale is enabled
  const socData = useMemo(() => 
    useLinearTimeScale ? toNumericTimestamps(socDataRaw) : socDataRaw, 
    [socDataRaw, useLinearTimeScale]
  );
  const rangeData = useMemo(() => 
    useLinearTimeScale ? toNumericTimestamps(rangeDataRaw) : rangeDataRaw, 
    [rangeDataRaw, useLinearTimeScale]
  );
  const powerData = useMemo(() => 
    useLinearTimeScale ? toNumericTimestamps(powerDataRaw) : powerDataRaw, 
    [powerDataRaw, useLinearTimeScale]
  );

  // Berechne Kilometer pro Tag
  const dailyMileageData = useMemo(() => {
    if (mileageData.length === 0) return [];
    
    // Gruppiere nach Tag und finde min/max Kilometerstand pro Tag
    const dailyStats: Record<string, { min: number; max: number; date: Date }> = {};
    
    mileageData.forEach(({ timestamp, value }) => {
      const dateKey = format(timestamp, 'yyyy-MM-dd');
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { min: value, max: value, date: timestamp };
      } else {
        dailyStats[dateKey].min = Math.min(dailyStats[dateKey].min, value);
        dailyStats[dateKey].max = Math.max(dailyStats[dateKey].max, value);
      }
    });
    
    // Sortiere nach Datum und berechne km pro Tag
    const sortedDays = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, stats]) => ({
        date: stats.date,
        dateKey,
        kmDriven: stats.max - stats.min, // Innerhalb des Tages gefahrene km
        maxMileage: stats.max,
      }));
    
    // Berechne auch km zwischen Tagen (falls Auto über Nacht gefahren wurde)
    return sortedDays.map((day, index) => {
      if (index === 0) {
        return { date: day.date, dateKey: day.dateKey, km: day.kmDriven };
      }
      const prevDay = sortedDays[index - 1];
      const kmBetweenDays = day.maxMileage - prevDay.maxMileage;
      return { date: day.date, dateKey: day.dateKey, km: Math.max(0, kmBetweenDays) };
    });
  }, [mileageData]);

  // Zusätzliche numerische Felder aus der Auswahl (ohne Kernfelder)
  const additionalNumericFields = useMemo(() => {
    return selectedFields.filter(field => {
      if (CORE_FIELDS.includes(field)) return false;
      // Prüfen ob das Feld numerische Daten hat
      const fieldData = data.filter(d => d.dataFieldName === field && typeof d.value === 'number');
      return fieldData.length > 0;
    });
  }, [selectedFields, data]);

  // Daten für zusätzliche Charts (with numeric timestamps when linear scale is enabled)
  const additionalChartsData = useMemo(() => {
    return additionalNumericFields.map((field, index) => {
      const rawData = getTimeSeriesData(data, field);
      return {
        field,
        data: useLinearTimeScale ? toNumericTimestamps(rawData) : rawData,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [additionalNumericFields, data, useLinearTimeScale]);

  const fieldFrequency = useMemo(() => {
    const freq = getFieldFrequency(data);
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [data]);

  const latestValues = useMemo(() => {
    const latest: Record<string, { value: number; timestamp: Date }> = {};
    
    data.forEach(d => {
      if (typeof d.value === 'number' && d.timestampUtc) {
        const existing = latest[d.dataFieldName];
        if (!existing || d.timestampUtc > existing.timestamp) {
          latest[d.dataFieldName] = { value: d.value, timestamp: d.timestampUtc };
        }
      }
    });
    
    return latest;
  }, [data]);

  const formatTimestamp = (timestamp: Date | number) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return format(date, 'dd.MM. HH:mm', { locale: de });
  };

  // Common XAxis props for time-series charts
  const getTimeAxisProps = () => {
    if (useLinearTimeScale) {
      return {
        dataKey: "timestamp",
        type: "number" as const,
        scale: "time" as const,
        domain: ['dataMin', 'dataMax'] as [string, string],
        tickFormatter: (value: number) => formatTimestamp(value),
        stroke: "hsl(220, 10%, 55%)",
        fontSize: 11,
      };
    }
    return {
      dataKey: "timestamp",
      tickFormatter: formatTimestamp,
      stroke: "hsl(220, 10%, 55%)",
      fontSize: 11,
    };
  };

  const chartConfig = {
    soc: { color: 'hsl(185, 70%, 50%)', label: 'Ladezustand' },
    range: { color: 'hsl(160, 60%, 45%)', label: 'Reichweite' },
    power: { color: 'hsl(45, 90%, 55%)', label: 'Ladeleistung' },
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Battery}
          label="Ladezustand"
          value={latestValues['currentSOCInPct']?.value}
          unit="%"
          color="primary"
        />
        <StatCard
          icon={Route}
          label="Reichweite"
          value={latestValues['cruisingRangeElectricInKm']?.value}
          unit="km"
          color="success"
        />
        <StatCard
          icon={Zap}
          label="Ladeleistung"
          value={latestValues['chargePowerInKW']?.value}
          unit="kW"
          color="warning"
        />
        <StatCard
          icon={Gauge}
          label="Kilometerstand"
          value={latestValues['mileage']?.value}
          unit="km"
          color="accent"
        />
      </div>

      {/* Linear Time Scale Toggle & Zoom Hint */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div className="flex items-center gap-3">
            <Switch
              id="linear-time-scale"
              checked={useLinearTimeScale}
              onCheckedChange={setUseLinearTimeScale}
            />
            <Label htmlFor="linear-time-scale" className="cursor-pointer">
              <span className="font-medium">Lineare Zeitachse</span>
              <span className="text-xs text-muted-foreground ml-2">
                (Abstände proportional zur Zeit)
              </span>
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-8">
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Tipp: <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">Shift</kbd> + Mausziehen in einem Diagramm setzt den Zeitbereich-Filter</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* SOC Chart */}
        {socData.length > 0 && (
          <ChartCard title="Ladezustand über Zeit" subtitle="Batterieladezustand in %">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart 
                data={socData}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.soc.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartConfig.soc.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis {...getTimeAxisProps()} />
                <YAxis 
                  domain={[0, 100]}
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                  formatter={(value: number) => [`${value}%`, 'Ladezustand']}
                />
                {isSelecting && selectionStart !== null && selectionEnd !== null && (
                  <ReferenceArea
                    x1={selectionStart}
                    x2={selectionEnd}
                    fill="hsl(185, 70%, 50%)"
                    fillOpacity={0.3}
                    stroke="hsl(185, 70%, 50%)"
                    strokeOpacity={0.8}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartConfig.soc.color} 
                  fill="url(#socGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Range Chart */}
        {rangeData.length > 0 && (
          <ChartCard title="Reichweite über Zeit" subtitle="Elektrische Reichweite in km">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart 
                data={rangeData}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartConfig.range.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartConfig.range.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis {...getTimeAxisProps()} />
                <YAxis 
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                  formatter={(value: number) => [`${value} km`, 'Reichweite']}
                />
                {isSelecting && selectionStart !== null && selectionEnd !== null && (
                  <ReferenceArea
                    x1={selectionStart}
                    x2={selectionEnd}
                    fill="hsl(185, 70%, 50%)"
                    fillOpacity={0.3}
                    stroke="hsl(185, 70%, 50%)"
                    strokeOpacity={0.8}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartConfig.range.color} 
                  fill="url(#rangeGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Power Chart */}
        {powerData.length > 0 && (
          <ChartCard title="Ladeleistung" subtitle="Aktuelle Ladeleistung in kW">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart 
                data={powerData}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis {...getTimeAxisProps()} />
                <YAxis 
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                  formatter={(value: number) => [`${value} kW`, 'Ladeleistung']}
                />
                {isSelecting && selectionStart !== null && selectionEnd !== null && (
                  <ReferenceArea
                    x1={selectionStart}
                    x2={selectionEnd}
                    fill="hsl(185, 70%, 50%)"
                    fillOpacity={0.3}
                    stroke="hsl(185, 70%, 50%)"
                    strokeOpacity={0.8}
                  />
                )}
                <Line 
                  type="stepAfter" 
                  dataKey="value" 
                  stroke={chartConfig.power.color} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Daily Mileage Chart */}
        {dailyMileageData.length > 0 && (
          <ChartCard title="Kilometer pro Tag" subtitle="Täglich gefahrene Kilometer">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyMileageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'dd.MM.', { locale: de })}
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                />
                <YAxis 
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                  tickFormatter={(value) => value.toLocaleString('de-DE')}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy', { locale: de })}
                  formatter={(value: number) => [`${value.toLocaleString('de-DE')} km`, 'Gefahren']}
                />
                <Bar 
                  dataKey="km" 
                  fill="hsl(270, 60%, 55%)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Dynamic Charts for Additional Selected Fields */}
        {additionalChartsData.map(({ field, data: chartData, color }, index) => (
          <ChartCard 
            key={field} 
            title={field} 
            subtitle={`${chartData.length} Datenpunkte`}
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart 
                data={chartData}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis {...getTimeAxisProps()} />
                <YAxis 
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                  formatter={(value: number) => [value.toLocaleString('de-DE'), field]}
                />
                {isSelecting && selectionStart !== null && selectionEnd !== null && (
                  <ReferenceArea
                    x1={selectionStart}
                    x2={selectionEnd}
                    fill="hsl(185, 70%, 50%)"
                    fillOpacity={0.3}
                    stroke="hsl(185, 70%, 50%)"
                    strokeOpacity={0.8}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color} 
                  fill={`url(#gradient-${index})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ))}

        {/* Field Frequency - Always Last */}
        <ChartCard title="Häufigste Datenpunkte" subtitle="Top 10 Datenfelder nach Häufigkeit">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fieldFrequency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
              <XAxis type="number" stroke="hsl(220, 10%, 55%)" fontSize={11} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={140}
                stroke="hsl(220, 10%, 55%)"
                fontSize={10}
                tick={{ fill: 'hsl(220, 10%, 75%)' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(220, 15%, 16%)', 
                  border: '1px solid hsl(220, 12%, 25%)',
                  borderRadius: '8px',
                  color: 'hsl(220, 10%, 92%)'
                }}
                formatter={(value: number) => [value.toLocaleString('de-DE'), 'Anzahl']}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(185, 70%, 50%)" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value?: number;
  unit: string;
  color: 'primary' | 'success' | 'warning' | 'accent';
}

function StatCard({ icon: Icon, label, value, unit, color }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <div className="glass-card rounded-xl p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-display font-semibold mt-1">
            {value !== undefined ? (
              <>
                {value.toLocaleString('de-DE')}
                <span className="text-sm text-muted-foreground ml-1">{unit}</span>
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="glass-card rounded-xl p-5 animate-slide-up">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
