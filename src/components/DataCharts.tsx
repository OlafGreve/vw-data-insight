import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import type { ParsedDataPoint } from '@/types/vehicleData';
import { getTimeSeriesData, getFieldFrequency, getRangeBySOCOverTime } from '@/lib/dataParser';
import type { RangeBySOCPoint } from '@/lib/dataParser';
import { downsampleLTTB } from '@/lib/downsample';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Battery, Gauge, Zap, Route, CalendarRange, TrendingDown } from 'lucide-react';
import { Legend } from 'recharts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface DataChartsProps {
  data: ParsedDataPoint[];
  selectedFields?: string[];
  useLinearTimeScale?: boolean;
  onDateRangeSelect?: (startDate: Date | null, endDate: Date | null, mode: 'start' | 'end') => void;
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

// Max points per chart for performance
const MAX_CHART_POINTS = 500;

export function DataCharts({ data, selectedFields = [], useLinearTimeScale = false, onDateRangeSelect }: DataChartsProps) {
  const activeTimestampRef = useRef<Date | null>(null);
  const [visibleCharts, setVisibleCharts] = useState(0);

  // Progressive chart loading
  useEffect(() => {
    setVisibleCharts(0);
    const timer = setInterval(() => {
      setVisibleCharts(prev => {
        if (prev >= 7) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 60);
    return () => clearInterval(timer);
  }, [data]);

  // Track the currently hovered timestamp for context menu - uses ref to avoid re-renders
  const handleChartMouseMove = useCallback((e: any) => {
    if (e?.activePayload?.[0]?.payload?.timestamp) {
      const ts = e.activePayload[0].payload.timestamp;
      activeTimestampRef.current = typeof ts === 'number' ? new Date(ts) : ts;
    }
  }, []);

  const handleSetStartDate = useCallback(() => {
    if (activeTimestampRef.current && onDateRangeSelect) {
      onDateRangeSelect(activeTimestampRef.current, null, 'start');
    }
  }, [onDateRangeSelect]);

  const handleSetEndDate = useCallback(() => {
    if (activeTimestampRef.current && onDateRangeSelect) {
      onDateRangeSelect(null, activeTimestampRef.current, 'end');
    }
  }, [onDateRangeSelect]);

  // Helper function to convert Date objects to numeric timestamps for linear scale
  const toNumericTimestamps = (chartData: { timestamp: Date; value: number }[]) => {
    return chartData.map(d => ({
      ...d,
      timestamp: d.timestamp.getTime(),
    }));
  };
  
  // Get and downsample chart data
  const socData = useMemo(() => {
    const raw = getTimeSeriesData(data, 'currentSOCInPct');
    const downsampled = downsampleLTTB(raw, MAX_CHART_POINTS);
    return useLinearTimeScale ? toNumericTimestamps(downsampled) : downsampled;
  }, [data, useLinearTimeScale]);

  const rangeData = useMemo(() => {
    const raw = getTimeSeriesData(data, 'cruisingRangeElectricInKm');
    const downsampled = downsampleLTTB(raw, MAX_CHART_POINTS);
    return useLinearTimeScale ? toNumericTimestamps(downsampled) : downsampled;
  }, [data, useLinearTimeScale]);

  const powerData = useMemo(() => {
    const raw = getTimeSeriesData(data, 'chargePowerInKW');
    const downsampled = downsampleLTTB(raw, MAX_CHART_POINTS);
    return useLinearTimeScale ? toNumericTimestamps(downsampled) : downsampled;
  }, [data, useLinearTimeScale]);

  const mileageData = useMemo(() => getTimeSeriesData(data, 'mileage'), [data]);

  // Berechne Kilometer pro Tag
  const dailyMileageData = useMemo(() => {
    if (mileageData.length === 0) return [];
    
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
    
    const sortedDays = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, stats]) => ({
        date: stats.date,
        dateKey,
        kmDriven: stats.max - stats.min,
        maxMileage: stats.max,
      }));
    
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
      const fieldData = data.filter(d => d.dataFieldName === field && typeof d.value === 'number');
      return fieldData.length > 0;
    });
  }, [selectedFields, data]);

  // Daten für zusätzliche Charts mit Downsampling
  const additionalChartsData = useMemo(() => {
    return additionalNumericFields.map((field, index) => {
      const rawData = getTimeSeriesData(data, field);
      const downsampled = downsampleLTTB(rawData, MAX_CHART_POINTS);
      return {
        field,
        data: useLinearTimeScale ? toNumericTimestamps(downsampled) : downsampled,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [additionalNumericFields, data, useLinearTimeScale]);

  const rangeBySOCData = useMemo(() => {
    const raw = getRangeBySOCOverTime(data);
    if (!useLinearTimeScale) {
      // Use Date objects for categorical mode (same as other charts)
      return raw.map(d => ({ ...d, timestamp: d.date }));
    }
    return raw;
  }, [data, useLinearTimeScale]);

  const SOC_LINE_CONFIG = [
    { key: 'soc100', label: '100%', color: 'hsl(160, 70%, 45%)' },
    { key: 'soc90', label: '90%', color: 'hsl(140, 60%, 50%)' },
    { key: 'soc80', label: '80%', color: 'hsl(45, 80%, 55%)' },
    { key: 'soc70', label: '70%', color: 'hsl(30, 80%, 55%)' },
    { key: 'soc60', label: '60%', color: 'hsl(15, 75%, 55%)' },
    { key: 'soc50', label: '50%', color: 'hsl(0, 70%, 55%)' },
    { key: 'soc40', label: '40%', color: 'hsl(0, 50%, 45%)' },
    { key: 'soc30', label: '30%', color: 'hsl(280, 50%, 50%)' },
    { key: 'soc20', label: '20%', color: 'hsl(260, 50%, 50%)' },
    { key: 'soc10', label: '10%', color: 'hsl(240, 50%, 50%)' },
  ];

  // Filter to only lines that have data
  const activeSOCLines = useMemo(() => {
    return SOC_LINE_CONFIG.filter(cfg =>
      rangeBySOCData.some(d => (d as any)[cfg.key] !== undefined)
    );
  }, [rangeBySOCData]);

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

  // Wrapper component for charts with context menu
  const ChartWithContextMenu = ({ children }: { children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="cursor-crosshair">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {activeTimestampRef.current ? format(activeTimestampRef.current, 'dd.MM.yyyy HH:mm:ss', { locale: de }) : 'Kein Zeitpunkt ausgewählt'}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleSetStartDate}>
          <CalendarRange className="mr-2 h-4 w-4" />
          Als Startdatum setzen
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSetEndDate}>
          <CalendarRange className="mr-2 h-4 w-4" />
          Als Enddatum setzen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

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

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* SOC Chart */}
        {visibleCharts >= 1 && socData.length > 0 && (
          <ChartCard title="Ladezustand über Zeit" subtitle="Batterieladezustand in %">
            <ChartWithContextMenu>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={socData} onMouseMove={handleChartMouseMove}>
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
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={chartConfig.soc.color} 
                    fill="url(#socGradient)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWithContextMenu>
          </ChartCard>
        )}

        {/* Range Chart */}
        {visibleCharts >= 2 && rangeData.length > 0 && (
          <ChartCard title="Reichweite über Zeit" subtitle="Elektrische Reichweite in km">
            <ChartWithContextMenu>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={rangeData} onMouseMove={handleChartMouseMove}>
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
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={chartConfig.range.color} 
                    fill="url(#rangeGradient)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWithContextMenu>
          </ChartCard>
        )}

        {/* Power Chart */}
        {visibleCharts >= 3 && powerData.length > 0 && (
          <ChartCard title="Ladeleistung" subtitle="Aktuelle Ladeleistung in kW">
            <ChartWithContextMenu>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={powerData} onMouseMove={handleChartMouseMove}>
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
                  <Line 
                    type="stepAfter" 
                    dataKey="value" 
                    stroke={chartConfig.power.color} 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartWithContextMenu>
          </ChartCard>
        )}

        {/* Daily Mileage Chart */}
        {visibleCharts >= 4 && dailyMileageData.length > 0 && (
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
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Range by SOC Chart */}
        {visibleCharts >= 5 && rangeBySOCData.length > 0 && activeSOCLines.length > 0 && (
          <ChartCard title="Reichweite nach Ladestand" subtitle="Geschätzte Reichweite (km) bei verschiedenen Ladeständen">
            <ChartWithContextMenu>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rangeBySOCData} onMouseMove={handleChartMouseMove}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value: number) => format(new Date(value), 'dd.MM.', { locale: de })}
                    stroke="hsl(220, 10%, 55%)"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="hsl(220, 10%, 55%)"
                    fontSize={11}
                    tickFormatter={(value) => `${value} km`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 15%, 16%)',
                      border: '1px solid hsl(220, 12%, 25%)',
                      borderRadius: '8px',
                      color: 'hsl(220, 10%, 92%)'
                    }}
                    labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy', { locale: de })}
                    formatter={(value: number, name: string) => {
                      const cfg = SOC_LINE_CONFIG.find(c => c.key === name);
                      return [`${value} km`, cfg?.label || name];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const cfg = SOC_LINE_CONFIG.find(c => c.key === value);
                      return cfg?.label || value;
                    }}
                  />
                  {activeSOCLines.map(({ key, color }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartWithContextMenu>
          </ChartCard>
        )}

        {/* Dynamic Charts for Additional Selected Fields */}
        {visibleCharts >= 6 && additionalChartsData.map(({ field, data: chartData, color }, index) => (
          <ChartCard 
            key={field} 
            title={field} 
            subtitle={`${chartData.length} Datenpunkte`}
          >
            <ChartWithContextMenu>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData} onMouseMove={handleChartMouseMove}>
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
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={color} 
                    fill={`url(#gradient-${index})`}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWithContextMenu>
          </ChartCard>
        ))}

        {/* Field Frequency - Always Last */}
        {visibleCharts >= 7 && (
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
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
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
    <div className="glass-card rounded-xl p-4">
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
    <div className="glass-card rounded-xl p-5 animate-fade-in">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
