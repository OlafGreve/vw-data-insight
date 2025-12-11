export interface DataDictionaryEntry {
  key: string;
  dataPointName: string;
  description: string;
  unit: string;
  dataType: string;
}

let dataDictionary: Map<string, DataDictionaryEntry> | null = null;
let dataDictionaryByName: Map<string, DataDictionaryEntry> | null = null;

export async function loadDataDictionary(): Promise<void> {
  if (dataDictionary) return;

  try {
    const response = await fetch('/data/DataDictionary.csv');
    const text = await response.text();
    const lines = text.split('\n');
    
    dataDictionary = new Map();
    dataDictionaryByName = new Map();
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted fields with commas)
      const fields = parseCSVLine(line);
      if (fields.length >= 4) {
        const entry: DataDictionaryEntry = {
          key: fields[0],
          dataPointName: fields[1],
          description: fields[2] || '',
          unit: fields[3] || '',
          dataType: fields[4] || '',
        };
        dataDictionary.set(entry.key, entry);
        
        // Also index by the short field name (last part after .)
        const shortName = extractShortName(entry.dataPointName);
        if (!dataDictionaryByName.has(shortName)) {
          dataDictionaryByName.set(shortName, entry);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load data dictionary:', error);
    dataDictionary = new Map();
    dataDictionaryByName = new Map();
  }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  
  return fields;
}

function extractShortName(fullPath: string): string {
  const parts = fullPath.split('.');
  return parts[parts.length - 1] || fullPath;
}

export function getFieldDescription(fieldName: string): DataDictionaryEntry | undefined {
  if (!dataDictionaryByName) return undefined;
  return dataDictionaryByName.get(fieldName);
}

export function getFieldDescriptionByKey(key: string): DataDictionaryEntry | undefined {
  if (!dataDictionary) return undefined;
  return dataDictionary.get(key);
}
