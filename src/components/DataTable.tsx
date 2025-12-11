import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import type { ParsedDataPoint } from '@/types/vehicleData';
import { format, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getFieldDescription } from '@/lib/dataDictionary';

interface DataTableProps {
  data: ParsedDataPoint[];
}

type SortField = 'key' | 'dataFieldName' | 'value' | 'timestampUtc' | 'category';
type SortDirection = 'asc' | 'desc';

export function DataTable({ data }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestampUtc');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'key':
          comparison = a.key.localeCompare(b.key);
          break;
        case 'dataFieldName':
          comparison = a.dataFieldName.localeCompare(b.dataFieldName);
          break;
        case 'value':
          comparison = String(a.rawValue).localeCompare(String(b.rawValue));
          break;
        case 'timestampUtc':
          const aTime = a.timestampUtc && isValid(a.timestampUtc) ? a.timestampUtc.getTime() : 0;
          const bTime = b.timestampUtc && isValid(b.timestampUtc) ? b.timestampUtc.getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary" /> 
      : <ArrowDown className="w-4 h-4 text-primary" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Batterie & Laden': return 'bg-chart-1/20 text-chart-1';
      case 'Klimatisierung': return 'bg-chart-2/20 text-chart-2';
      case 'Reichweite & Kilometer': return 'bg-chart-3/20 text-chart-3';
      case 'Anschluss': return 'bg-chart-4/20 text-chart-4';
      case 'Fahrzeugstatus': return 'bg-chart-5/20 text-chart-5';
      case 'Service': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('key')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Nr. <SortIcon field="key" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Kategorie <SortIcon field="category" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('dataFieldName')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Datenfeld <SortIcon field="dataFieldName" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Wert <SortIcon field="value" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('timestampUtc')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Zeitstempel <SortIcon field="timestampUtc" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr 
                key={`${row.key}-${idx}`}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors animate-fade-in"
                style={{ animationDelay: `${idx * 10}ms` }}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.key}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-1 rounded-md text-xs font-medium', getCategoryColor(row.category))}>
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-moonstone-light">
                  {(() => {
                    const description = getFieldDescription(row.dataFieldName);
                    if (description) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              {row.dataFieldName}
                              <Info className="w-3 h-3 opacity-50" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" sideOffset={8} className="max-w-sm">
                            <p className="font-medium">{description.dataPointName}</p>
                            {description.description && (
                              <p className="text-xs text-muted-foreground mt-1">{description.description}</p>
                            )}
                            {description.unit && (
                              <p className="text-xs mt-1">Einheit: {description.unit}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    return row.dataFieldName;
                  })()}
                </td>
                <td className="px-4 py-3 font-mono text-sm">
                  <span className={cn(
                    typeof row.value === 'number' && 'text-primary',
                    typeof row.value === 'boolean' && (row.value ? 'text-success' : 'text-destructive'),
                    row.value === null && 'text-muted-foreground italic'
                  )}>
                    {row.value === null ? 'null' : String(row.value)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {row.timestampUtc && isValid(row.timestampUtc)
                    ? format(row.timestampUtc, 'dd.MM.yyyy HH:mm:ss', { locale: de })
                    : '-'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
        <span className="text-sm text-muted-foreground">
          {data.length.toLocaleString('de-DE')} Einträge
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Zurück
          </button>
          <span className="text-sm text-muted-foreground">
            Seite {page + 1} von {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
