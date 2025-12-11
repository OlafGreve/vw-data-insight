import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import type { ParsedDataPoint } from '@/types/vehicleData';
import { getStatistics, getTimeSeriesData, getMileageCorrelatedData, calculateDeltas } from '@/lib/dataParser';
import { getFieldDescription } from '@/lib/dataDictionary';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2, Route } from 'lucide-react';

interface SelectedFieldStatsProps {
  data: ParsedDataPoint[];
  selectedFields: string[];
}

export function SelectedFieldStats({ data, selectedFields }: SelectedFieldStatsProps) {
  const numericFields = useMemo(() => {
    return selectedFields.filter(field => {
      const timeSeriesData = getTimeSeriesData(data, field);
      return timeSeriesData.length > 0;
    });
  }, [data, selectedFields]);

  if (numericFields.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-muted-foreground">
          Wählen Sie numerische Datenfelder im Filter aus, um detaillierte Statistiken zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Detaillierte Feldanalyse</h2>
      </div>
      
      {numericFields.map(field => (
        <FieldAnalysis key={field} data={data} fieldName={field} />
      ))}
    </div>
  );
}

interface FieldAnalysisProps {
  data: ParsedDataPoint[];
  fieldName: string;
}

function FieldAnalysis({ data, fieldName }: FieldAnalysisProps) {
  const stats = useMemo(() => getStatistics(data, fieldName), [data, fieldName]);
  const timeSeriesData = useMemo(() => getTimeSeriesData(data, fieldName), [data, fieldName]);
  const mileageData = useMemo(() => getMileageCorrelatedData(data, fieldName), [data, fieldName]);
  const deltaData = useMemo(() => calculateDeltas(data, fieldName), [data, fieldName]);
  
  const description = getFieldDescription(fieldName);

  if (!stats) return null;

  const formatTimestamp = (timestamp: Date) => format(timestamp, 'dd.MM. HH:mm', { locale: de });
  const formatFullTimestamp = (timestamp: Date) => format(timestamp, 'dd.MM.yyyy HH:mm:ss', { locale: de });

  const getTrendIcon = () => {
    if (stats.totalDelta > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (stats.totalDelta < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const chartColor = 'hsl(185, 70%, 50%)';
  const deltaColor = 'hsl(160, 60%, 45%)';

  return (
    <div className="glass-card rounded-xl p-5 animate-slide-up">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-foreground text-lg">{fieldName}</h3>
        {description?.description && (
          <p className="text-xs text-muted-foreground mt-1">{description.description}</p>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <MiniStatCard label="Minimum" value={stats.min} />
        <MiniStatCard label="Maximum" value={stats.max} />
        <MiniStatCard label="Durchschnitt" value={stats.average} decimals={2} />
        <MiniStatCard label="Std. Abw." value={stats.stdDev} decimals={2} />
        <MiniStatCard label="Anzahl" value={stats.count} />
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
          {getTrendIcon()}
          <div>
            <p className="text-xs text-muted-foreground">Gesamt Δ</p>
            <p className="font-mono text-sm font-medium">
              {stats.totalDelta >= 0 ? '+' : ''}{stats.totalDelta.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* First/Last Values */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Erster Messwert</p>
          <p className="font-mono font-medium">{stats.firstValue.value.toLocaleString('de-DE')}</p>
          <p className="text-xs text-muted-foreground">
            {formatFullTimestamp(stats.firstValue.timestamp)}
            {stats.firstValue.mileage !== undefined && (
              <span className="ml-2">• {stats.firstValue.mileage.toLocaleString('de-DE')} km</span>
            )}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Letzter Messwert</p>
          <p className="font-mono font-medium">{stats.lastValue.value.toLocaleString('de-DE')}</p>
          <p className="text-xs text-muted-foreground">
            {formatFullTimestamp(stats.lastValue.timestamp)}
            {stats.lastValue.mileage !== undefined && (
              <span className="ml-2">• {stats.lastValue.mileage.toLocaleString('de-DE')} km</span>
            )}
          </p>
        </div>
      </div>

      {/* Delta per km if available */}
      {stats.deltaPerKm !== undefined && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-6">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            <span className="text-sm">
              Änderung pro km: <span className="font-mono font-medium">
                {stats.deltaPerKm >= 0 ? '+' : ''}{stats.deltaPerKm.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Verlauf über Zeit</h4>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id={`gradient-${fieldName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimestamp}
                stroke="hsl(220, 10%, 55%)"
                fontSize={10}
              />
              <YAxis stroke="hsl(220, 10%, 55%)" fontSize={10} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(220, 15%, 16%)', 
                  border: '1px solid hsl(220, 12%, 25%)',
                  borderRadius: '8px',
                  color: 'hsl(220, 10%, 92%)'
                }}
                labelFormatter={(label) => formatFullTimestamp(new Date(label))}
                formatter={(value: number) => [value.toLocaleString('de-DE'), fieldName]}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                fill={`url(#gradient-${fieldName})`}
                strokeWidth={2}
              />
              <ReferenceLine y={stats.average} stroke="hsl(45, 90%, 55%)" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mileage Correlation Chart */}
        {mileageData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Verlauf über Kilometer</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis 
                  dataKey="mileage" 
                  name="Kilometer"
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={10}
                  tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                />
                <YAxis 
                  dataKey="value" 
                  name={fieldName}
                  stroke="hsl(220, 10%, 55%)" 
                  fontSize={10} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('de-DE') + (name === 'Kilometer' ? ' km' : ''),
                    name
                  ]}
                />
                <Scatter 
                  data={mileageData} 
                  fill={chartColor}
                  line={{ stroke: chartColor, strokeWidth: 1 }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Delta Chart */}
        {deltaData.length > 0 && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Änderungsrate (Delta)</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={deltaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 25%)" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  stroke="hsl(220, 10%, 55%)"
                  fontSize={10}
                />
                <YAxis stroke="hsl(220, 10%, 55%)" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(220, 15%, 16%)', 
                    border: '1px solid hsl(220, 12%, 25%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)'
                  }}
                  labelFormatter={(label) => formatFullTimestamp(new Date(label))}
                  formatter={(value: number, name: string) => {
                    if (name === 'delta') return [`Δ ${value >= 0 ? '+' : ''}${value.toLocaleString('de-DE')}`, 'Delta'];
                    if (name === 'deltaPerKm') return [`${value?.toLocaleString('de-DE', { maximumFractionDigits: 4 })} /km`, 'Δ/km'];
                    return [value.toLocaleString('de-DE'), name];
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(220, 10%, 55%)" />
                <Line 
                  type="monotone" 
                  dataKey="delta" 
                  stroke={deltaColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

interface MiniStatCardProps {
  label: string;
  value: number;
  decimals?: number;
}

function MiniStatCard({ label, value, decimals = 0 }: MiniStatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">
        {value.toLocaleString('de-DE', { maximumFractionDigits: decimals })}
      </p>
    </div>
  );
}
