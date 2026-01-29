import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Info, Search } from 'lucide-react';
import type { ParsedDataPoint } from '@/types/vehicleData';
import { format, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFieldDescription, getFieldDescriptionByKey } from '@/lib/dataDictionary';
import { TableSkeleton } from './TableSkeleton';
import { TableSearch } from './TableSearch';
import { Button } from '@/components/ui/button';

interface DataTableProps {
  data: ParsedDataPoint[];
}

type SortField = 'rowNumber' | 'dataFieldName' | 'value' | 'timestampUtc' | 'category';
type SortDirection = 'asc' | 'desc';

interface SearchMatch {
  dataIndex: number;
  field: string;
}

function sortData(data: ParsedDataPoint[], sortField: SortField, sortDirection: SortDirection): ParsedDataPoint[] {
  return [...data].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'rowNumber':
        comparison = a.rowNumber - b.rowNumber;
        break;
      case 'dataFieldName':
        comparison = a.dataFieldName.localeCompare(b.dataFieldName);
        break;
      case 'value':
        // 1. Null-Werte ans Ende
        if (a.value === null && b.value === null) {
          comparison = 0;
        } else if (a.value === null) {
          comparison = 1;
        } else if (b.value === null) {
          comparison = -1;
        }
        // 2. Gleiche Typen: typspezifisch sortieren
        else if (typeof a.value === 'number' && typeof b.value === 'number') {
          comparison = a.value - b.value;
        } else if (typeof a.value === 'boolean' && typeof b.value === 'boolean') {
          comparison = (a.value === b.value) ? 0 : (a.value ? -1 : 1);
        }
        // 3. Unterschiedliche Typen: nach Typ gruppieren, dann String-Vergleich
        else {
          const typeOrder = { number: 1, boolean: 2, string: 3 };
          const aType = typeof a.value as keyof typeof typeOrder;
          const bType = typeof b.value as keyof typeof typeOrder;
          if (aType !== bType) {
            comparison = typeOrder[aType] - typeOrder[bType];
          } else {
            comparison = String(a.value).localeCompare(String(b.value));
          }
        }
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
}

function getRowSearchableText(row: ParsedDataPoint): string {
  const timestamp = row.timestampUtc && isValid(row.timestampUtc)
    ? format(row.timestampUtc, 'dd.MM.yyyy HH:mm:ss', { locale: de })
    : '';
    
  // Vollständigen Feldnamen aus Data Dictionary holen
  const dictEntry = getFieldDescriptionByKey(row.key);
  const fullFieldName = dictEntry?.dataPointName || '';
  
  return [
    String(row.rowNumber),
    row.category,
    fullFieldName,           // Vollständiger Pfad (chargingStatus.profileChargeReason)
    row.dataFieldName,       // Kurzname (profileChargeReason)
    row.value === null ? 'null' : String(row.value),
    timestamp
  ].join(' ').toLowerCase();
}

export function DataTable({ data }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestampUtc');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [isSorting, setIsSorting] = useState(true);
  const [sortedData, setSortedData] = useState<ParsedDataPoint[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const pageSize = 50;

  // Deferred sorting - runs after UI can show loading state
  useEffect(() => {
    setIsSorting(true);
    
    const frame = requestAnimationFrame(() => {
      const sorted = sortData(data, sortField, sortDirection);
      setSortedData(sorted);
      setIsSorting(false);
    });
    
    return () => cancelAnimationFrame(frame);
  }, [data, sortField, sortDirection]);

  // Reset page when data changes (e.g., after filtering)
  useEffect(() => {
    setPage(0);
  }, [data]);

  // Find all matches in sorted data
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const matches: number[] = [];
    
    sortedData.forEach((row, index) => {
      const searchableText = getRowSearchableText(row);
      if (searchableText.includes(term)) {
        matches.push(index);
      }
    });
    
    return matches;
  }, [sortedData, searchTerm]);

  // Reset current match when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm]);

  // Navigate to current match's page
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex < searchMatches.length) {
      const matchDataIndex = searchMatches[currentMatchIndex];
      const targetPage = Math.floor(matchDataIndex / pageSize);
      setPage(targetPage);
    }
  }, [searchMatches, currentMatchIndex, pageSize]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (searchMatches.length === 0) return;
    
    setCurrentMatchIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % searchMatches.length;
      } else {
        return (prev - 1 + searchMatches.length) % searchMatches.length;
      }
    });
  }, [searchMatches.length]);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setSearchTerm('');
    setCurrentMatchIndex(0);
  }, []);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && tableRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Calculate which rows on current page are matches
  const currentPageMatchIndices = useMemo(() => {
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    
    return searchMatches
      .filter(idx => idx >= startIndex && idx < endIndex)
      .map(idx => idx - startIndex);
  }, [searchMatches, page, pageSize]);

  // Current highlighted row on page
  const highlightedRowOnPage = useMemo(() => {
    if (searchMatches.length === 0 || currentMatchIndex >= searchMatches.length) return -1;
    
    const matchDataIndex = searchMatches[currentMatchIndex];
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    
    if (matchDataIndex >= startIndex && matchDataIndex < endIndex) {
      return matchDataIndex - startIndex;
    }
    return -1;
  }, [searchMatches, currentMatchIndex, page, pageSize]);

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

  // Highlight matching text in a cell
  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;
    
    const term = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(term);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-primary/30 text-inherit rounded px-0.5">{text.slice(index, index + searchTerm.length)}</mark>
        {text.slice(index + searchTerm.length)}
      </>
    );
  };

  if (isSorting) {
    return <TableSkeleton />;
  }

  return (
    <div ref={tableRef} className="glass-card rounded-xl overflow-hidden" tabIndex={-1}>
      {showSearch ? (
        <TableSearch
          onSearch={handleSearch}
          matchCount={searchMatches.length}
          currentMatch={searchMatches.length > 0 ? currentMatchIndex + 1 : 0}
          onNavigate={handleNavigate}
          onClose={handleCloseSearch}
        />
      ) : (
        <div className="flex items-center justify-end p-2 bg-secondary/30 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs">Suchen</span>
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleSort('rowNumber')}
              >
                <div className="flex items-center gap-2 font-display font-medium text-sm">
                  Nr. <SortIcon field="rowNumber" />
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
            {paginatedData.map((row, idx) => {
              const isMatch = currentPageMatchIndices.includes(idx);
              const isCurrentMatch = highlightedRowOnPage === idx;
              
              return (
                <tr 
                  key={`${row.key}-${idx}`}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    isCurrentMatch && "bg-primary/20 ring-1 ring-primary/50",
                    isMatch && !isCurrentMatch && "bg-primary/10",
                    !isMatch && "hover:bg-secondary/30"
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {highlightText(String(row.rowNumber))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 rounded-md text-xs font-medium', getCategoryColor(row.category))}>
                      {highlightText(row.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-moonstone-light">
                    {(() => {
                      const description = getFieldDescriptionByKey(row.key) || getFieldDescription(row.dataFieldName);
                      if (description) {
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors text-left">
                                {highlightText(row.dataFieldName)}
                                <Info className="w-3 h-3 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" sideOffset={5} className="w-80 md:w-96 z-50 bg-popover border-border">
                              <p className="font-medium">{description.dataPointName}</p>
                              {description.description && (
                                <p className="text-xs text-muted-foreground mt-1">{description.description}</p>
                              )}
                              {description.unit && (
                                <p className="text-xs mt-1">Einheit: {description.unit}</p>
                              )}
                            </PopoverContent>
                          </Popover>
                        );
                      }
                      return highlightText(row.dataFieldName);
                    })()}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    <span className={cn(
                      typeof row.value === 'number' && 'text-primary',
                      typeof row.value === 'boolean' && (row.value ? 'text-success' : 'text-destructive'),
                      row.value === null && 'text-muted-foreground italic'
                    )}>
                      {highlightText(row.value === null ? 'null' : String(row.value))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.timestampUtc && isValid(row.timestampUtc)
                      ? highlightText(format(row.timestampUtc, 'dd.MM.yyyy HH:mm:ss', { locale: de }))
                      : '-'
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
        <span className="text-sm text-muted-foreground">
          {sortedData.length.toLocaleString('de-DE')} Einträge
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
  );
}
