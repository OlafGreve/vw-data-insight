

## Plan: Datenexport-Funktion

### Ziel
Export der gefilterten Daten im Original-Eingabeformat, sodass die exportierte JSON-Datei direkt wieder importiert werden kann.

---

### Herausforderung: Datenmapping

Die App verarbeitet Daten in zwei Stufen:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  IMPORT                                                             │
│  rawData.Data[i] = {                                                │
│    key: "abc123",                                                   │
│    dataFieldName: "vehicle.charging.currentSOCInPct",  ← Vollpfad  │
│    value: "85",                                                     │
│    timestampUtc: "2024-01-15T10:30:00Z"                            │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ parseVehicleData()
┌─────────────────────────────────────────────────────────────────────┐
│  GEPARST (filteredData)                                             │
│  parsedData[i] = {                                                  │
│    key: "abc123",                                                   │
│    dataFieldName: "currentSOCInPct",  ← Nur letztes Segment        │
│    value: 85,  ← Typisiert                                         │
│    rawValue: "85",  ← Original-String                              │
│    timestampUtc: Date object,                                       │
│    category: "Batterie & Laden",                                    │
│    rowNumber: 42                                                    │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Lösung**: Nutze den eindeutigen `key` + `rowNumber` um gefilterte Daten auf die Originaleinträge zu mappen.

---

### Komponenten-Übersicht

#### 1. Neue Utility-Funktion: `src/lib/dataExporter.ts`

```typescript
export function exportFilteredData(
  rawData: VehicleDataFile,
  filteredData: ParsedDataPoint[]
): VehicleDataFile {
  // Erstelle Set der gefilterten Keys für schnellen Lookup
  const filteredKeys = new Set(
    filteredData.map(d => `${d.key}-${d.rowNumber}`)
  );
  
  // Filtere Originaldaten basierend auf gefilterten ParsedDataPoints
  const filteredOriginalData = rawData.Data.filter((entry, index) => 
    filteredKeys.has(`${entry.key}-${index + 1}`)
  );
  
  return {
    vin: rawData.vin,
    userId: rawData.userId,
    Data: filteredOriginalData
  };
}

export function downloadAsJson(data: VehicleDataFile, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

#### 2. Export-Button in `DataFilters.tsx`

Platzierung neben dem "Zurücksetzen"-Button:

```typescript
// Neue Props
interface DataFiltersProps {
  // ... bestehende Props
  onExport?: () => void;
  filteredCount?: number;
  totalCount?: number;
}

// Im Header-Bereich der Filter-Komponente
<div className="flex items-center gap-3">
  {hasActiveFilters && (
    <button onClick={clearFilters}>
      <X /> Zurücksetzen
    </button>
  )}
  {onExport && (
    <Button 
      variant="outline" 
      size="sm"
      onClick={onExport}
      className="..."
    >
      <Download className="w-4 h-4 mr-2" />
      Export ({filteredCount?.toLocaleString('de-DE')})
    </Button>
  )}
</div>
```

#### 3. Integration in `Index.tsx`

```typescript
import { exportFilteredData, downloadAsJson } from '@/lib/dataExporter';
import { format } from 'date-fns';

const handleExport = () => {
  if (!rawData) return;
  
  const exportData = exportFilteredData(rawData, filteredData);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `vw-daten-export_${rawData.vin}_${timestamp}.json`;
  
  downloadAsJson(exportData, filename);
};

// In DataFilters:
<DataFilters 
  filter={filter} 
  onFilterChange={setFilter} 
  fieldsWithFrequency={fieldsWithFrequency}
  onExport={handleExport}
  filteredCount={filteredData.length}
  totalCount={parsedData.length}
/>
```

---

### UI-Mockup

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Filter                              [✕ Zurücksetzen] [↓ Export] │
├─────────────────────────────────────────────────────────────────────┤
│  [Suchen...]  [Datenfelder ▾]  [Von 📅]  [Bis 📅]                  │
└─────────────────────────────────────────────────────────────────────┘
                                               ↑
                                    Zeigt Anzahl: "Export (12.345)"
```

---

### Dateiname-Konvention

Format: `vw-daten-export_{VIN}_{YYYY-MM-DD_HH-mm}.json`

Beispiel: `vw-daten-export_WVWZZZ3CZYE123456_2026-01-29_14-30.json`

---

### Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/lib/dataExporter.ts` | **Neu**: Export-Logik und Download-Funktion |
| `src/components/DataFilters.tsx` | Export-Button mit Datenpunkt-Anzahl |
| `src/pages/Index.tsx` | `handleExport`-Funktion und Props-Weitergabe |

---

### Technische Details

- **Keine neuen Abhängigkeiten**: Nutzt native Browser-APIs (Blob, URL.createObjectURL)
- **Speichereffizient**: Kein Kopieren großer Datenmengen, nur Filterung
- **Rundtrip-fähig**: Exportierte Datei hat exakt das Format der Eingabe
- **JSON-Formatierung**: `JSON.stringify(data, null, 2)` für Lesbarkeit

