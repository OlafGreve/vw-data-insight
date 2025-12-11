import { Search, Filter, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { DataFilter } from '@/types/vehicleData';
import { cn } from '@/lib/utils';

interface DataFiltersProps {
  filter: DataFilter;
  onFilterChange: (filter: DataFilter) => void;
  fieldsWithFrequency: { name: string; count: number }[];
}

export function DataFilters({ filter, onFilterChange, fieldsWithFrequency }: DataFiltersProps) {
  const hasActiveFilters = filter.dataFieldNames.length > 0 || filter.searchTerm || filter.startDate || filter.endDate;

  const clearFilters = () => {
    onFilterChange({
      dataFieldNames: [],
      startDate: null,
      endDate: null,
      searchTerm: '',
    });
  };

  const toggleField = (fieldName: string) => {
    const current = filter.dataFieldNames;
    const updated = current.includes(fieldName)
      ? current.filter(f => f !== fieldName)
      : [...current, fieldName];
    onFilterChange({ ...filter, dataFieldNames: updated });
  };

  const removeField = (fieldName: string) => {
    onFilterChange({
      ...filter,
      dataFieldNames: filter.dataFieldNames.filter(f => f !== fieldName),
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

        {/* Multi-Select Field Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="justify-between bg-secondary/50 border-border/50 hover:bg-secondary/70"
            >
              {filter.dataFieldNames.length > 0 ? (
                <span className="truncate">
                  {filter.dataFieldNames.length} ausgewählt
                </span>
              ) : (
                <span className="text-muted-foreground">Datenfelder wählen</span>
              )}
              <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-popover border-border" align="start">
            <Command>
              <CommandInput placeholder="Datenfeld suchen..." />
              <CommandList>
                <CommandEmpty>Kein Datenfeld gefunden.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {fieldsWithFrequency.map(({ name, count }) => (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => toggleField(name)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filter.dataFieldNames.includes(name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1 truncate">{name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {count}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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

      {/* Selected Fields Badges */}
      {filter.dataFieldNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filter.dataFieldNames.map(field => (
            <Badge
              key={field}
              variant="secondary"
              className="pl-2 pr-1 py-1 bg-primary/10 text-primary border-primary/20"
            >
              {field}
              <button
                onClick={() => removeField(field)}
                className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
