// Minimal, dependency-free CSV/TSV parser with delimiter auto-detection.
// Supports quoted fields, escaped quotes ("") and CRLF line endings.

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  delimiter: string;
};

const CANDIDATES = [';', ',', '\t', '|'];

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  let best = ';';
  let bestCount = -1;
  for (const d of CANDIDATES) {
    // Count occurrences outside quotes
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && ch === d) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

export function parseCsv(rawText: string, delimiter?: string): ParsedCsv {
  // Strip BOM
  const text = rawText.replace(/^\uFEFF/, '');
  const d = delimiter || detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === d) {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      // handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const headers = (rows.shift() ?? []).map((h, idx) => h || `col_${idx + 1}`);
  return { headers, rows, delimiter: d };
}

/** Normalizes a header for fuzzy auto-mapping (accent and case insensitive). */
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Parses common date formats (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd) into ISO yyyy-mm-dd. */
export function parseFlexibleDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** Parses numbers written with dots/commas/spaces as separators. */
export function parseFlexibleNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
