import { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TableSearchProps {
  onSearch: (term: string) => void;
  matchCount: number;
  currentMatch: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onClose: () => void;
}

export function TableSearch({ 
  onSearch, 
  matchCount, 
  currentMatch, 
  onNavigate, 
  onClose 
}: TableSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setSearchTerm(value);
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce search - wait 300ms after last keystroke
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onNavigate('prev');
      } else {
        onNavigate('next');
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onSearch(''); // Sofort leeren, kein Debounce nötig
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-secondary/50 border-b border-border">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="In Tabelle suchen..."
          value={searchTerm}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 bg-background border-border/50 focus:border-primary"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {searchTerm && (
        <>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {matchCount > 0 ? (
              <>
                <span className="font-medium text-foreground">{currentMatch}</span>
                {' von '}
                <span className="font-medium text-foreground">{matchCount.toLocaleString('de-DE')}</span>
              </>
            ) : (
              'Keine Treffer'
            )}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigate('prev')}
              disabled={matchCount === 0}
              title="Vorheriger Treffer (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigate('next')}
              disabled={matchCount === 0}
              title="Nächster Treffer (Enter)"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onClose}
        title="Suche schließen (Esc)"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
