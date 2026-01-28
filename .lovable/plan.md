
## Plan: Intelligente Wert-Sortierung

### Problem-Analyse
Die aktuelle Sortierung in Zeile 29-30 verwendet immer `String(a.rawValue).localeCompare()`, was zu alphabetischer Sortierung führt:
- "10" < "3" (weil "1" < "3")
- Ergebnis: 10, 3, 5, 6 statt 3, 5, 6, 10

### Vorgeschlagene Lösung: Typbasierte Sortierung

Nutze das bereits geparsede `value`-Feld, das den korrekten Datentyp enthält (`number | boolean | string | null`):

```typescript
case 'value':
  // 1. Null-Werte ans Ende
  if (a.value === null && b.value === null) {
    comparison = 0;
  } else if (a.value === null) {
    comparison = 1;  // null nach hinten
  } else if (b.value === null) {
    comparison = -1;
  }
  // 2. Gleiche Typen: typspezifisch sortieren
  else if (typeof a.value === 'number' && typeof b.value === 'number') {
    comparison = a.value - b.value;  // Numerisch
  } else if (typeof a.value === 'boolean' && typeof b.value === 'boolean') {
    comparison = (a.value === b.value) ? 0 : (a.value ? -1 : 1);  // true vor false
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
```

### Sortierverhalten nach Implementierung

| Werttyp | Sortierung | Beispiel |
|---------|------------|----------|
| Zahlen | Numerisch | 3, 5, 6, 10, 100 |
| Booleans | true vor false | true, true, false, false |
| Strings | Alphabetisch | "charging", "idle", "ready" |
| null | Immer am Ende | ..., null, null |
| Gemischt | Nach Typ gruppiert | Zahlen → Booleans → Strings → null |

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/DataTable.tsx` | `sortData`-Funktion: `value`-Case durch typbasierte Logik ersetzen |

### Vorteile
- Nutzt bereits vorhandene Typinformation aus `ParsedDataPoint.value`
- Keine zusätzlichen Abhängigkeiten
- Konsistentes Verhalten bei gemischten Datentypen
- Null-Werte werden vorhersehbar behandelt
