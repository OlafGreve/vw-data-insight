import { Search, Filter, X, Check, Info, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import type { DataFilter } from '@/types/vehicleData';
import { cn } from '@/lib/utils';
import { getFieldDescription } from '@/lib/dataDictionary';

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
                  {fieldsWithFrequency.map(({ name, count }) => {
                    const description = getFieldDescription(name);
                    return (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => toggleField(name)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            filter.dataFieldNames.includes(name) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{name}</span>
                          {description && (
                            <span className="block text-xs text-muted-foreground truncate">
                              {description.description || description.unit}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0">
                          {count}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Start Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal bg-secondary/50 border-border/50 hover:bg-secondary/70",
                !filter.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filter.startDate ? format(filter.startDate, "dd.MM.yyyy", { locale: de }) : "Von"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
            <Calendar
              mode="single"
              selected={filter.startDate || undefined}
              onSelect={(date) => onFilterChange({ ...filter, startDate: date || null })}
              initialFocus
              className="pointer-events-auto"
              locale={de}
            />
          </PopoverContent>
        </Popover>

        {/* End Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal bg-secondary/50 border-border/50 hover:bg-secondary/70",
                !filter.endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filter.endDate ? format(filter.endDate, "dd.MM.yyyy", { locale: de }) : "Bis"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
            <Calendar
              mode="single"
              selected={filter.endDate || undefined}
              onSelect={(date) => onFilterChange({ ...filter, endDate: date || null })}
              initialFocus
              className="pointer-events-auto"
              locale={de}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Fields Badges */}
      {filter.dataFieldNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filter.dataFieldNames.map(field => {
            const description = getFieldDescription(field);
            return (
              <Popover key={field}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="pl-2 pr-1 py-1 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {field}
                    {description && <Info className="w-3 h-3 ml-1 opacity-50" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(field);
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-primary/30 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </PopoverTrigger>
                {description && (
                  <PopoverContent side="bottom" className="max-w-xs bg-popover border-border">
                    <p className="font-medium">{description.dataPointName}</p>
                    {description.description && (
                      <p className="text-xs text-muted-foreground mt-1">{description.description}</p>
                    )}
                    {description.unit && (
                      <p className="text-xs mt-1">Einheit: {description.unit}</p>
                    )}
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      )}
    </div>
  );
}
