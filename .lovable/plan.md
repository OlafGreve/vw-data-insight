

## SOC-Linien auf 20%-Schritte reduzieren mit Gruen-Rot-Farbverlauf

### Aenderungen

**1. `src/components/DataCharts.tsx` -- SOC_LINE_CONFIG reduzieren**

Statt 10 Linien (100%, 90%, 80%, ..., 10%) nur noch 5 Linien in 20%-Schritten mit Farbverlauf von Gruen (100%) bis Rot (20%):

```typescript
const SOC_LINE_CONFIG = [
  { key: 'soc100', label: '100%', color: 'hsl(120, 70%, 40%)' },  // Gruen
  { key: 'soc80',  label: '80%',  color: 'hsl(90, 65%, 45%)' },   // Gelbgruen
  { key: 'soc60',  label: '60%',  color: 'hsl(60, 70%, 45%)' },   // Gelb
  { key: 'soc40',  label: '40%',  color: 'hsl(30, 75%, 50%)' },   // Orange
  { key: 'soc20',  label: '20%',  color: 'hsl(0, 70%, 50%)' },    // Rot
];
```

**2. `src/lib/dataParser.ts` -- SOC_LEVELS und RangeBySOCPoint anpassen**

- `SOC_LEVELS` von `[100, 90, 80, ..., 10]` auf `[100, 80, 60, 40, 20]` reduzieren
- Nicht mehr benoetigte Felder (`soc90`, `soc70`, `soc50`, `soc30`, `soc10`) aus dem `RangeBySOCPoint`-Interface entfernen
- Die Filterlogik im Algorithmus aendert sich automatisch mit, da `SOC_LEVELS` die Grundlage ist

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/DataCharts.tsx` | SOC_LINE_CONFIG auf 5 Linien (20%-Schritte), Gruen-Rot-Farbverlauf |
| `src/lib/dataParser.ts` | SOC_LEVELS, SOC_KEYS und RangeBySOCPoint auf 20%-Schritte reduzieren |

