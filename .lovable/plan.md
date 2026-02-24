

## Flackern beim Neuaufbau der Diagramme beheben

### Problem

In `DataCharts.tsx` (Zeilen 47-59) gibt es einen "Progressive Loading"-Effekt: Beim Aendern von `data` wird `visibleCharts` auf 0 zurueckgesetzt und dann alle 60ms um 1 erhoeht. Das sorgt dafuer, dass **alle Charts kurz verschwinden und nacheinander wieder eingeblendet werden** -- auch bei Filteraenderungen, wo das gar nicht noetig ist.

### Ursache

```typescript
useEffect(() => {
  setVisibleCharts(0);  // <-- Setzt ALLE Charts auf unsichtbar
  const timer = setInterval(() => { ... }, 60);
  return () => clearInterval(timer);
}, [data]);  // <-- Wird bei JEDER Datenanederung ausgeloest
```

### Loesung

Den progressiven Ladeeffekt nur beim **ersten Laden** der Daten anwenden. Bei nachfolgenden Aenderungen (Filteranpassungen) sollen alle Charts sofort sichtbar bleiben.

### Aenderung

**Datei: `src/components/DataCharts.tsx`**

Einen `isInitialLoad`-Ref einfuehren und den `useEffect` anpassen:

```typescript
const isInitialLoad = useRef(true);

useEffect(() => {
  if (isInitialLoad.current) {
    // Progressives Laden nur beim ersten Mal
    setVisibleCharts(0);
    const timer = setInterval(() => {
      setVisibleCharts(prev => {
        if (prev >= 7) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 60);
    isInitialLoad.current = false;
    return () => clearInterval(timer);
  }
  // Bei Filteraenderungen: alle Charts sofort sichtbar
  setVisibleCharts(7);
}, [data]);
```

### Ergebnis

- **Erster Ladevorgang**: Charts werden weiterhin progressiv eingeblendet (schoener Effekt).
- **Filteraenderungen**: Kein Flackern mehr, alle Charts bleiben sichtbar und aktualisieren sich sofort.

| Datei | Aenderung |
|-------|-----------|
| `src/components/DataCharts.tsx` | Progressive-Loading-Logik nur beim initialen Laden ausfuehren |

