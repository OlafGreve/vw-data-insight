## Reichweite pro Ladestand uber die Zeit 

### Idee

Ein neues Diagramm, das zeigt, wie viel Reichweite das Fahrzeug bei bestimmten Ladestanden (100%, 90%, 80%, ...) uber die Zeit liefert. Sinkt z.B. die Reichweite bei 100% von 390 km auf 370 km, deutet das auf veränderte Umgebungsparameter wie z.B. Wetter  hin.

### Algorithmus

Die Daten enthalten `currentSOCInPct` und `cruisingRangeElectricInKm` als separate Datenpunkte mit Zeitstempeln. Um die Reichweite bei einem bestimmten Ladestand zu ermitteln:

1. **SOC- und Reichweite-Datenpunkte zeitlich zuordnen**: Fuer jeden SOC-Datenpunkt den naechsten Reichweite-Datenpunkt suchen (innerhalb eines Zeitfensters von z.B. 1 Minuten)
2. **Paare bilden**: Ergibt Datenpunkte mit `{ timestamp, soc, range }`
3. **Interpolieren**: Fuer jedes Zeitfenster (z.B. taeglich) eine lineare Regression/Interpolation durchfuehren, um die Reichweite bei exakt 100%, 90%, 80% usw. zu schaetzen
4. **Linien zeichnen**: Je eine Linie pro SOC-Stufe

### Vereinfachter Ansatz

Da eine vollstaendige Interpolation komplex ist, verwende ich einen pragmatischen Ansatz:

- SOC-Reichweite-Paare bilden (zeitlich nahe Datenpunkte)
- Nur SOC-Werte mit exakt 100%, 90%, ..., 10% verwenden
- Als Liniendiagramm darstellen

### Umsetzung

#### 1. Neue Hilfsfunktion in `dataParser.ts`

```typescript
function getRangeBySOCOverTime(data: ParsedDataPoint[]): {
  timestamp: Date;
  soc100?: number;
  soc90?: number;
  soc80?: number;
  soc70?: number;
  soc60?: number;
  soc50?: number;
}[]
```

- SOC- und Range-Datenpunkte nach Zeitstempel sortieren
- Fuer jeden SOC-Wert den zeitlich naechsten Range-Wert suchen (max. 1 Min Abstand)
- Pro Tag gruppieren und Durchschnittswerte bilden
- Ergebnis: Ein Datenpunkt pro Tag mit Reichweite fuer jede SOC-Stufe

#### 2. Neues Diagramm in `DataCharts.tsx`

- Neues `useMemo` fuer die aufbereiteten Daten
- Ein `LineChart` mit mehreren `Line`-Elementen (eine pro SOC-Stufe)
- Farbcodierung: Dunkelgruen (100%) bis Rot (10%)
- Platzierung nach dem "Kilometer pro Tag"-Chart
- Titel: "Reichweite nach Ladestand"
- Untertitel: "Geschaetzte Reichweite (km) bei verschiedenen Ladestanden"
- Legende mit den SOC-Stufen
- Tooltip zeigt Datum und alle Reichweiten-Werte

### Diagramm-Design

```text
Reichweite nach Ladestand
Geschaetzte Reichweite (km) bei verschiedenen Ladestanden

km
400 |  ___100%___________
350 |  ___90%____________
300 |  ___80%____________
250 |  ___70%____________
200 |  ___60%____________
150 |  ___50%____________
    +----+----+----+----+----> Zeit
    Jan  Feb  Mär  Apr
```

### Farben pro SOC-Stufe


| Stufe | Farbe                            |
| ----- | -------------------------------- |
| 100%  | hsl(160, 70%, 45%) - Gruen       |
| 90%   | hsl(140, 60%, 50%) - Hellgruen   |
| 80%   | hsl(45, 80%, 55%) - Gelb         |
| 70%   | hsl(30, 80%, 55%) - Orange       |
| 60%   | hsl(15, 75%, 55%) - Dunkelorange |
| 50%   | hsl(0, 70%, 55%) - Rot           |


### Dateien


| Datei                           | Aenderung                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/dataParser.ts`         | Neue Funktion `getRangeBySOCOverTime`                                              |
| `src/components/DataCharts.tsx` | Neues Diagramm mit `LineChart` und mehreren Linien, `visibleCharts`-Limit erhoehen |


### Technische Details

- **Zeitfenster fuer Paarung**: 5 Minuten max. Abstand zwischen SOC und Range
- **Aggregation**: Woechentlich, um Rauschen zu glaetten
- **SOC-Baender**: 5% Breite (z.B. 95-100% wird als "100%" dargestellt)
- **Mindestanzahl**: Ein SOC-Band wird nur angezeigt, wenn mindestens 3 Datenpunkte vorhanden sind
- **Progressive Loading**: Chart wird in den bestehenden `visibleCharts`-Mechanismus integriert