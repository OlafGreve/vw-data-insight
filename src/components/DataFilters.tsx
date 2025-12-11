import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DataFilter } from '@/types/vehicleData';

interface DataFiltersProps {
  filter: DataFilter;
  onFilterChange: (filter: DataFilter) => void;
  availableFields: string[];
}

export function DataFilters({ filter, onFilterChange, availableFields }: DataFiltersProps) {
  const hasActiveFilters = filter.dataFieldName || filter.searchTerm || filter.startDate || filter.endDate;

  const clearFilters = () => {
    onFilterChange({
      dataFieldName: null,
      startDate: null,
      endDate: null,
      searchTerm: '',
    });
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-display font-medium text-sm">Filter</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Suchen..."
            value={filter.searchTerm}
            onChange={(e) => onFilterChange({ ...filter, searchTerm: e.target.value })}
            className="pl-9 bg-secondary/50 border-border/50 focus:border-primary"
          />
        </div>

        {/* Field Select */}
        <Select
          value={filter.dataFieldName || 'all'}
          onValueChange={(value) => onFilterChange({ 
            ...filter, 
            dataFieldName: value === 'all' ? null : value 
          })}
        >
          <SelectTrigger className="bg-secondary/50 border-border/50">
            <SelectValue placeholder="Datenfeld wählen" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border max-h-64">
            <SelectItem value="all">Alle Datenfelder</SelectItem>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Start Date */}
        <Input
          type="datetime-local"
          value={filter.startDate?.toISOString().slice(0, 16) || ''}
          onChange={(e) => onFilterChange({ 
            ...filter, 
            startDate: e.target.value ? new Date(e.target.value) : null 
          })}
          className="bg-secondary/50 border-border/50 focus:border-primary"
          placeholder="Von"
        />

        {/* End Date */}
        <Input
          type="datetime-local"
          value={filter.endDate?.toISOString().slice(0, 16) || ''}
          onChange={(e) => onFilterChange({ 
            ...filter, 
            endDate: e.target.value ? new Date(e.target.value) : null 
          })}
          className="bg-secondary/50 border-border/50 focus:border-primary"
          placeholder="Bis"
        />
      </div>
    </div>
  );
}
