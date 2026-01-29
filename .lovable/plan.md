

## Plan: Debounced Suche für bessere Performance

### Problem

Bei jedem Tastendruck wird sofort `onSearch(value)` aufgerufen (Zeile 30 in `TableSearch.tsx`), was das teure `searchMatches`-useMemo in `DataTable.tsx` triggert. Bei 200.000+ Datenpunkten führt das zu spürbaren Verzögerungen.

### Lösung

**Debouncing** implementieren: Die Suche wird erst ausgelöst, nachdem der Benutzer 300ms nicht mehr getippt hat.

### Implementierung

#### TableSearch.tsx - Debounced Callback hinzufügen

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
// ... andere imports

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

  const handleClear = () => {
    setSearchTerm('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onSearch(''); // Sofort leeren, kein Debounce nötig
    inputRef.current?.focus();
  };

  // ... rest bleibt gleich
}
```

### Verhalten nach der Änderung

| Aktion | Vorher | Nachher |
|--------|--------|---------|
| Tippen von "Batterie" | 8 Suchvorgänge (B-a-t-t-e-r-i-e) | 1 Suchvorgang (nach 300ms Pause) |
| Schnelles Tippen | UI friert bei jedem Buchstaben ein | Flüssige Eingabe, Suche am Ende |
| Löschen der Suche | Sofort | Sofort (kein Debounce) |
| Enter drücken | Navigation sofort | Navigation sofort |

### Visuelles Feedback (optional)

Zusätzlich könnte ein Lade-Indikator während des Wartens angezeigt werden:

```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 Batter...  ⏳                   [↑] [↓]    [✕]          │
│     (Suche läuft...)                                        │
└─────────────────────────────────────────────────────────────┘

Nach 300ms:

┌─────────────────────────────────────────────────────────────┐
│  🔍 Batterie   ✕        1 von 42    [↑] [↓]    [✕]          │
└─────────────────────────────────────────────────────────────┘
```

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/TableSearch.tsx` | Debounce-Logik mit `setTimeout` und Cleanup hinzufügen |

### Technische Details

- **Debounce-Delay**: 300ms (guter Kompromiss zwischen Reaktionszeit und Performance)
- **Cleanup**: `clearTimeout` beim Unmount verhindert Memory Leaks
- **Sofortiges Löschen**: Bei "X"-Button oder leerem Input kein Debounce nötig
- **Keine zusätzlichen Dependencies**: Verwendet nur native `setTimeout`/`clearTimeout`

