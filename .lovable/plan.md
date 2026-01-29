

## Plan: Suche über vollständigen Datenfeldnamen

### Problem

Wie im Screenshot zu sehen: Das Feld heißt vollständig `chargingStatus.profileChargeReason`, aber in der Tabelle und im Filter wird nur der Kurzname `profileChargeReason` angezeigt und durchsucht.

Wenn der Benutzer nach "chargingStatus" sucht, findet er keine Ergebnisse, obwohl das Feld diesen Präfix hat.

### Ursache

Der vollständige Feldname ist im Data Dictionary unter `dataPointName` gespeichert, aber:
1. **Filter-Suche** (`filterData` in `dataParser.ts`): Durchsucht nur `d.dataFieldName` (Kurzname)
2. **Tabellen-Suche** (`getRowSearchableText` in `DataTable.tsx`): Durchsucht nur `row.dataFieldName` (Kurzname)

### Lösung

Den vollständigen `dataPointName` aus dem Data Dictionary holen und in den durchsuchbaren Text einbeziehen.

### Änderungen

#### 1. dataParser.ts - Filter-Suche erweitern

```typescript
import { getFieldDescriptionByKey } from '@/lib/dataDictionary';

export function filterData(
  data: ParsedDataPoint[],
  fieldNames: string[],
  startDate: Date | null,
  endDate: Date | null,
  searchTerm: string
): ParsedDataPoint[] {
  const adjustedEndDate = endDate ? endOfDay(endDate) : null;
  
  return data.filter(d => {
    if (fieldNames.length > 0 && !fieldNames.includes(d.dataFieldName)) return false;
    if (startDate && d.timestampUtc && d.timestampUtc < startDate) return false;
    if (adjustedEndDate && d.timestampUtc && d.timestampUtc > adjustedEndDate) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      
      // Vollständigen Feldnamen aus Data Dictionary holen
      const dictEntry = getFieldDescriptionByKey(d.key);
      const fullFieldName = dictEntry?.dataPointName || d.dataFieldName;
      
      if (!fullFieldName.toLowerCase().includes(term) && 
          !d.dataFieldName.toLowerCase().includes(term) && 
          !d.rawValue.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });
}
```

#### 2. DataTable.tsx - Tabellen-Suche erweitern

```typescript
import { getFieldDescriptionByKey } from '@/lib/dataDictionary';

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
```

### Verhalten nach der Änderung

| Suchbegriff | Vorher | Nachher |
|-------------|--------|---------|
| `profileChargeReason` | ✅ Findet | ✅ Findet |
| `chargingStatus` | ❌ Keine Treffer | ✅ Findet alle chargingStatus.* Felder |
| `chargingStatus.profile` | ❌ Keine Treffer | ✅ Findet |
| `status.plugLock` | ❌ Keine Treffer | ✅ Findet plugConnectionStatus.plugLockState |

### Performance

Die Performance soll auch bei großen Datenmengen nicht leiden.

### Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/dataParser.ts` | Import hinzufügen, `filterData` um vollständigen Feldnamen erweitern |
| `src/components/DataTable.tsx` | Import hinzufügen, `getRowSearchableText` um vollständigen Feldnamen erweitern |

