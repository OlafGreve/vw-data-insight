

## Plan: Kalender auf gewähltes Datum fokussieren

### Problem

Wie im Screenshot zu sehen: Das Enddatum ist auf **08.10.2025** gesetzt, aber der Kalender öffnet sich auf **Januar 2026** (dem aktuellen Monat). Das ist verwirrend für Benutzer.

### Ursache

Die `Calendar`-Komponente (`react-day-picker`) erhält keine `defaultMonth`-Prop. Standardmäßig zeigt sie immer den aktuellen Monat an.

### Lösung

Die `defaultMonth`-Prop an beide Kalender übergeben:
- Wenn ein Datum gewählt ist → dieses Datum als `defaultMonth` verwenden
- Wenn kein Datum gewählt ist → `undefined` (zeigt aktuellen Monat)

### Code-Änderung

```typescript
{/* Start Date */}
<Calendar
  mode="single"
  selected={filter.startDate || undefined}
  onSelect={(date) => onFilterChange({ ...filter, startDate: date || null })}
  defaultMonth={filter.startDate || undefined}  // NEU
  initialFocus
  className="pointer-events-auto"
  locale={de}
/>

{/* End Date */}
<Calendar
  mode="single"
  selected={filter.endDate || undefined}
  onSelect={(date) => onFilterChange({ ...filter, endDate: date || null })}
  defaultMonth={filter.endDate || undefined}  // NEU
  initialFocus
  className="pointer-events-auto"
  locale={de}
/>
```

### Verhalten nach der Änderung

| Zustand | Kalender zeigt |
|---------|----------------|
| Startdatum: 13.02.2025 | Februar 2025 |
| Enddatum: 08.10.2025 | Oktober 2025 |
| Kein Datum gewählt | Aktueller Monat (Januar 2026) |

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/DataFilters.tsx` | `defaultMonth` Prop zu beiden Calendar-Komponenten hinzufügen (Zeilen 169-176 und 195-202) |

