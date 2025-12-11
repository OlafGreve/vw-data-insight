import { Car, Zap } from 'lucide-react';

interface HeaderProps {
  vin?: string;
  dataCount?: number;
}

export function Header({ vin, dataCount }: HeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md" />
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                <Car className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg md:text-xl tracking-tight">
                <span className="text-gradient">VW</span>
                <span className="text-moonstone-light"> Daten</span>
                <span className="text-primary">Analyse</span>
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Fahrzeugdaten visualisieren & auswerten
              </p>
            </div>
          </div>

          {vin && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
                <Zap className="w-4 h-4 text-primary animate-pulse-glow" />
                <span className="text-xs text-muted-foreground">
                  {dataCount?.toLocaleString('de-DE')} Datenpunkte
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">VIN</p>
                <p className="font-mono text-sm text-moonstone-light">{vin}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
