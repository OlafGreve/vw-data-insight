import { useState, useCallback } from 'react';
import { Upload, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import type { VehicleDataFile } from '@/types/vehicleData';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onDataLoaded: (data: VehicleDataFile) => void;
}

type UploadState = 'idle' | 'loading' | 'success' | 'error';

export function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processZipFile = async (file: File) => {
    setUploadState('loading');
    setError(null);

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      // Find JSON file in ZIP
      const jsonFile = Object.keys(content.files).find(name => name.endsWith('.json'));
      
      if (!jsonFile) {
        throw new Error('Keine JSON-Datei im ZIP-Archiv gefunden');
      }

      const jsonContent = await content.files[jsonFile].async('string');
      const data: VehicleDataFile = JSON.parse(jsonContent);

      if (!data.Data || !Array.isArray(data.Data)) {
        throw new Error('Ungültiges Datenformat: Data-Array fehlt');
      }

      setUploadState('success');
      onDataLoaded(data);
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei');
    }
  };

  const processJsonFile = async (file: File) => {
    setUploadState('loading');
    setError(null);

    try {
      const text = await file.text();
      const data: VehicleDataFile = JSON.parse(text);

      if (!data.Data || !Array.isArray(data.Data)) {
        throw new Error('Ungültiges Datenformat: Data-Array fehlt');
      }

      setUploadState('success');
      onDataLoaded(data);
    } catch (err) {
      setUploadState('error');
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei');
    }
  };

  const handleFile = async (file: File) => {
    if (file.name.endsWith('.zip')) {
      await processZipFile(file);
    } else if (file.name.endsWith('.json')) {
      await processJsonFile(file);
    } else {
      setError('Bitte laden Sie eine ZIP- oder JSON-Datei hoch');
      setUploadState('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-300',
        'p-8 md:p-12 text-center cursor-pointer',
        isDragOver 
          ? 'border-primary bg-primary/10 electric-glow' 
          : 'border-border hover:border-primary/50 hover:bg-secondary/30',
        uploadState === 'success' && 'border-success bg-success/10',
        uploadState === 'error' && 'border-destructive bg-destructive/10'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".zip,.json"
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center gap-4">
        {uploadState === 'idle' && (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow" />
              <div className="relative p-4 rounded-full bg-secondary">
                <FileArchive className="w-10 h-10 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                VW Fahrzeugdaten hochladen
              </h3>
              <p className="text-muted-foreground text-sm">
                ZIP-Archiv oder JSON-Datei hierher ziehen oder klicken
              </p>
            </div>
          </>
        )}

        {uploadState === 'loading' && (
          <>
            <div className="p-4 rounded-full bg-secondary animate-pulse">
              <Upload className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <p className="text-muted-foreground">Datei wird verarbeitet...</p>
          </>
        )}

        {uploadState === 'success' && (
          <>
            <div className="p-4 rounded-full bg-success/20">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <p className="text-success font-medium">Daten erfolgreich geladen!</p>
          </>
        )}

        {uploadState === 'error' && (
          <>
            <div className="p-4 rounded-full bg-destructive/20">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-destructive font-medium">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadState('idle');
                setError(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Erneut versuchen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
