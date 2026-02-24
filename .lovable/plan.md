## Fix: SOC-Reichweite-Paare zuverlaessig finden

### Problem

Der Algorithmus in `getRangeBySOCOverTime` findet nicht alle gueltigen Datenpaare. Es gibt genuegend Paare mit exakten SOC-Werten (80%, 70%, 60% usw.) und Zeitabstaenden unter 10 Sekunden, die aber nicht gefunden werden.

### Ursache

Der Two-Pointer-Ansatz (`rangeIdx`) laeuft nur vorwaerts und wird nie zurueckgesetzt. Wenn zwischen zwei gueltigen SOC-Punkten viele ungueltige SOC-Punkte liegen, kann der Pointer fuer den naechsten gueltigen Punkt am besten passenden Range-Punkt vorbeigelaufen sein. Zusaetzlich koennte der Modulo-Check (`value % 10 !== 0`) bei Fliesskommazahlen fehlschlagen.

### Loesung

1. **Two-Pointer durch unabhaengige Binary Search pro SOC-Punkt ersetzen** -- jeder gueltige SOC-Punkt sucht seinen naechsten Range-Punkt per Binary Search, ohne einen gemeinsamen Index
  &nbsp;
2. **MAX_GAP_MS bleibt bei 1 Minute** -- die Daten haben Paare mit unter 10 Sekunden Abstand, 1 Minute ist mehr als ausreichend

### Aenderungen

**Datei: `src/lib/dataParser.ts**`

Neue Hilfsfunktion `findClosestPoint` einfuegen (Binary Search in sortiertem Array):

```typescript
function findClosestPoint(
  sorted: { timestamp: Date; value: number }[],
  targetTime: number
): { timestamp: Date; value: number } | null {
  if (sorted.length === 0) return null;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].timestamp.getTime() < targetTime) lo = mid + 1;
    else hi = mid;
  }
  // Vergleiche lo und lo-1, gib den naechsten zurueck
  const candidates = [sorted[lo], sorted[lo - 1]].filter(Boolean);
  return candidates.reduce((best, c) =>
    !best || Math.abs(c!.timestamp.getTime() - targetTime) < Math.abs(best.timestamp.getTime() - targetTime)
      ? c! : best
  , null as typeof sorted[0] | null);
}
```

Hauptschleife in `getRangeBySOCOverTime` ersetzen -- statt Two-Pointer:

```typescript
const MAX_GAP_MS = 60 * 1000; // 1 Minute
const pairs: { timestamp: Date; soc: number; range: number }[] = [];

for (const sp of socPoints) {
  // Exakte 10er-Stufen mit Fliesskomma-Toleranz
  const rounded = Math.round(sp.value);
  if (rounded % 10 !== 0 || rounded < 10 || rounded > 100) continue;

  const spTime = sp.timestamp.getTime();
  const closest = findClosestPoint(rangePoints, spTime);

  if (closest && Math.abs(closest.timestamp.getTime() - spTime) <= MAX_GAP_MS) {
    pairs.push({ timestamp: sp.timestamp, soc: rounded, range: closest.value });
  }
}
```

### Was sich aendert


| Aspekt        | Vorher                                   | Nachher                                 |
| ------------- | ---------------------------------------- | --------------------------------------- |
| Suchverfahren | Gemeinsamer Two-Pointer (nur vorwaerts)  | Unabhaengige Binary Search pro Punkt    |
| SOC-Filter    | `value % 10 !== 0` (Fliesskomma-Problem) | `Math.round(value) % 10 !== 0` (robust) |
| Zeitfenster   | 1 Minute                                 | 1 Minute (unveraendert)                 |
| Kein Runden   | Korrekt -- nur exakte 10er-Werte         | Korrekt -- nur exakte 10er-Werte        |


### Dateien


| Datei                   | Aenderung                                                              |
| ----------------------- | ---------------------------------------------------------------------- |
| `src/lib/dataParser.ts` | Two-Pointer durch Binary Search ersetzen, Modulo-Check robuster machen |
