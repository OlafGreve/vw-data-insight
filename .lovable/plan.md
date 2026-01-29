

## Plan: Einheitliches Button-Design für Filter-Aktionen

### Problem
Die beiden Aktions-Buttons verwenden unterschiedliche Implementierungen:

| Element | Komponente | Styling |
|---------|------------|---------|
| Zurücksetzen | `<button>` (native) | Custom Tailwind: `text-xs text-muted-foreground` |
| Export | `<Button>` (shadcn) | `variant="outline" size="sm"` |

Das führt zu:
- Unterschiedlicher Höhe
- Unterschiedlicher Schriftgröße
- Inkonsistentem Hover-Verhalten
- Ungleicher visueller Gewichtung

### Lösung

Beide Buttons auf die shadcn `<Button>`-Komponente umstellen mit konsistentem Styling:

```typescript
<div className="flex items-center gap-2">
  {hasActiveFilters && (
    <Button
      variant="ghost"
      size="sm"
      onClick={clearFilters}
      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <X className="w-3.5 h-3.5" />
      Zurücksetzen
    </Button>
  )}
  {hasActiveFilters && onExport && filteredCount !== undefined && (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      className="h-7 text-xs gap-1.5"
    >
      <Download className="w-3.5 h-3.5" />
      Export ({filteredCount.toLocaleString('de-DE')})
    </Button>
  )}
</div>
```

### Design-Entscheidung

| Button | Variant | Begründung |
|--------|---------|------------|
| Zurücksetzen | `ghost` | Sekundäre Aktion, dezenter, kein Rahmen |
| Export | `outline` | Primäre Aktion bei aktiven Filtern, hervorgehoben |

Beide haben identische Größe (`size="sm"`, `h-7`, `text-xs`, `gap-1.5`), sodass sie visuell harmonieren.

### Vorschau

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Filter                     [✕ Zurücksetzen]  [↓ Export (1.234)] │
│                                     ghost            outline        │
└─────────────────────────────────────────────────────────────────────┘
```

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/DataFilters.tsx` | "Zurücksetzen" von `<button>` auf `<Button variant="ghost">` umstellen |

