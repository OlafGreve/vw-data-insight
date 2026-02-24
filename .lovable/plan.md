

## Y-Achse: Maximum auf 450 km festlegen

### Problem

Recharts ignoriert `domain={[0, 'auto']}` bei `LineChart` -- die Y-Achse bleibt bei 600 km. Das hoechste Datenwert liegt bei ca. 400 km, daher waere 450 km ein sinnvolles Maximum.

### Loesung

In `src/components/DataCharts.tsx` die `domain`-Prop der YAxis im Reichweite-nach-Ladestand-Chart auf einen festen Wert setzen:

```typescript
domain={[0, 450]}
```

### Aenderung

**Datei: `src/components/DataCharts.tsx`**

```typescript
// Vorher:
domain={[0, 'auto']}

// Nachher:
domain={[0, 450]}
```

| Datei | Aenderung |
|-------|-----------|
| `src/components/DataCharts.tsx` | `domain` von `[0, 'auto']` auf `[0, 450]` aendern |

