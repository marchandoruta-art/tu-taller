import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Car,
  History,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseCsv, normalizeHeader, parseFlexibleDate, parseFlexibleNumber } from '@/lib/parseCsv';
import { puedeGestionar } from '@/lib/permisos';

type ImportMode = 'vehicles' | 'history';

type FieldDef = {
  id: string;
  label: string;
  required?: boolean;
  aliases: string[];
};

const VEHICLE_FIELDS: FieldDef[] = [
  { id: 'plate', label: 'Matrícula', required: true, aliases: ['matricula', 'plate', 'placa', 'kennzeichen', 'immatriculation'] },
  { id: 'brand', label: 'Marca', aliases: ['marca', 'brand', 'make', 'fabricante', 'marque'] },
  { id: 'model', label: 'Modelo', aliases: ['modelo', 'model', 'modele'] },
  { id: 'year', label: 'Año', aliases: ['ano', 'anio', 'year', 'annee', 'jahr'] },
  { id: 'color', label: 'Color', aliases: ['color', 'colour', 'farbe', 'couleur'] },
  { id: 'vin', label: 'Bastidor / VIN', aliases: ['vin', 'bastidor', 'chasis', 'numerobastidor'] },
  { id: 'mileage', label: 'Kilómetros', aliases: ['km', 'kilometros', 'mileage', 'kilometraje', 'odometro'] },
  { id: 'client_description', label: 'Observaciones', aliases: ['observaciones', 'notas', 'notes', 'descripcion', 'comentarios'] },
  { id: 'client_name', label: 'Cliente (nombre)', aliases: ['cliente', 'nombre', 'name', 'clientname', 'propietario', 'titular'] },
  { id: 'client_phone', label: 'Teléfono', aliases: ['telefono', 'phone', 'movil', 'tel', 'telephone'] },
  { id: 'client_email', label: 'Email', aliases: ['email', 'correo', 'mail'] },
  { id: 'client_dni', label: 'DNI / NIF', aliases: ['dni', 'nif', 'cif', 'documento'] },
  { id: 'client_address', label: 'Dirección', aliases: ['direccion', 'address', 'domicilio', 'adresse'] },
];

const HISTORY_FIELDS: FieldDef[] = [
  { id: 'plate', label: 'Matrícula', required: true, aliases: ['matricula', 'plate', 'placa'] },
  { id: 'date', label: 'Fecha del trabajo', required: true, aliases: ['fecha', 'date', 'fechatrabajo', 'fechasalida', 'datum'] },
  { id: 'work_summary', label: 'Trabajo realizado', required: true, aliases: ['trabajo', 'reparacion', 'descripcion', 'work', 'concepto', 'detalle'] },
  { id: 'brand', label: 'Marca', aliases: ['marca', 'brand', 'make'] },
  { id: 'model', label: 'Modelo', aliases: ['modelo', 'model'] },
  { id: 'mileage', label: 'Kilómetros', aliases: ['km', 'kilometros', 'mileage', 'kilometraje'] },
  { id: 'client_name', label: 'Cliente (nombre)', aliases: ['cliente', 'nombre', 'propietario', 'titular'] },
  { id: 'client_phone', label: 'Teléfono', aliases: ['telefono', 'phone', 'movil'] },
  { id: 'client_description', label: 'Observaciones', aliases: ['observaciones', 'notas', 'notes'] },
];

const NONE = '__none__';

type ImportResult = { created: number; skipped: number; errors: string[] };

export default function DataImport() {
  const { t } = useTranslation();
  const { role, user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>('vehicles');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!puedeGestionar(role)) {
    navigate('/');
    return null;
  }

  const fields = mode === 'vehicles' ? VEHICLE_FIELDS : HISTORY_FIELDS;

  const autoMap = (csvHeaders: string[], activeFields: FieldDef[]) => {
    const next: Record<string, string> = {};
    const normalized = csvHeaders.map((h) => normalizeHeader(h));
    for (const field of activeFields) {
      const idx = normalized.findIndex(
        (h) => h === normalizeHeader(field.label) || field.aliases.includes(h)
      );
      if (idx >= 0) next[field.id] = csvHeaders[idx];
    }
    return next;
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.headers.length || !parsed.rows.length) {
        toast.error(t('adminUI.importPage.toast.emptyFile'));
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMap(parsed.headers, fields));
      setResult(null);
      setProgress(0);
    } catch (error) {
      console.error('Error reading CSV:', error);
      toast.error(t('adminUI.importPage.toast.readError'));
    }
  };

  const changeMode = (next: ImportMode) => {
    setMode(next);
    setResult(null);
    if (headers.length) {
      setMapping(autoMap(headers, next === 'vehicles' ? VEHICLE_FIELDS : HISTORY_FIELDS));
    }
  };

  const cell = (row: string[], fieldId: string): string => {
    const header = mapping[fieldId];
    if (!header || header === NONE) return '';
    const idx = headers.indexOf(header);
    return idx >= 0 ? (row[idx] ?? '') : '';
  };

  const missingRequired = fields.filter((f) => f.required && !mapping[f.id]);
  const canImport = rows.length > 0 && missingRequired.length === 0 && !importing;

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const downloadTemplate = () => {
    const cols = fields.map((f) => f.label);
    const example =
      mode === 'vehicles'
        ? ['1234ABC', 'Seat', 'Ibiza', '2018', 'Blanco', 'VSSZZZ...', '125000', 'Ruido delantero', 'Juan Pérez', '600111222', 'juan@mail.com', '12345678A', 'C/ Mayor 1']
        : ['1234ABC', '12/03/2024', 'Cambio de embrague y distribución', 'Seat', 'Ibiza', '118000', 'Juan Pérez', '600111222', 'Garantía 1 año'];
    const csv = '\uFEFF' + cols.join(';') + '\n' + example.slice(0, cols.length).join(';');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-${mode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const normalizePlate = (value: string) => value.toUpperCase().replace(/[\s-]/g, '');

  const runImport = async () => {
    if (!organization || !user) return;
    setImporting(true);
    setProgress(0);
    const summary: ImportResult = { created: 0, skipped: 0, errors: [] };

    try {
      // Existing plates for duplicate handling / history matching
      const { data: existing } = await supabase
        .from('vehicles')
        .select('id, plate')
        .eq('organization_id', organization.id);
      const existingPlates = new Map(
        (existing ?? []).map((v) => [normalizePlate(v.plate), v.id])
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawPlate = cell(row, 'plate');
        const plate = normalizePlate(rawPlate);
        const lineNumber = i + 2;

        if (!plate) {
          summary.errors.push(`${t('adminUI.importPage.line')} ${lineNumber}: ${t('adminUI.importPage.toast.missingPlate')}`);
          setProgress(Math.round(((i + 1) / rows.length) * 100));
          continue;
        }

        try {
          if (mode === 'vehicles') {
            if (skipDuplicates && existingPlates.has(plate)) {
              summary.skipped++;
            } else {
              let ownerId: string | null = null;
              const clientName = cell(row, 'client_name');
              if (clientName) {
                const { data: owner, error: ownerError } = await supabase
                  .from('owners')
                  .insert({
                    organization_id: organization.id,
                    name: clientName,
                    phone: cell(row, 'client_phone') || null,
                    email: cell(row, 'client_email') || null,
                    dni: cell(row, 'client_dni') || null,
                    address: cell(row, 'client_address') || null,
                  })
                  .select('id')
                  .single();
                if (ownerError) throw ownerError;
                ownerId = owner?.id ?? null;
              }

              const { data: created, error: vehicleError } = await supabase
                .from('vehicles')
                .insert({
                  organization_id: organization.id,
                  created_by: user.id,
                  owner_id: ownerId,
                  plate,
                  brand: cell(row, 'brand') || 'Sin especificar',
                  model: cell(row, 'model') || 'Sin especificar',
                  year: parseFlexibleNumber(cell(row, 'year')) ?? null,
                  color: cell(row, 'color') || null,
                  vin: cell(row, 'vin') || null,
                  mileage: parseFlexibleNumber(cell(row, 'mileage')) ?? null,
                  client_description: cell(row, 'client_description') || null,
                  status: 'recibido' as const,
                })
                .select('id')
                .single();
              if (vehicleError) throw vehicleError;
              if (created) existingPlates.set(plate, created.id);
              summary.created++;
            }
          } else {
            const workSummary = cell(row, 'work_summary');
            const dateIso = parseFlexibleDate(cell(row, 'date'));
            if (!workSummary || !dateIso) {
              summary.errors.push(
                `${t('adminUI.importPage.line')} ${lineNumber}: ${t('adminUI.importPage.toast.missingHistoryData')}`
              );
              setProgress(Math.round(((i + 1) / rows.length) * 100));
              continue;
            }

            let ownerId: string | null = null;
            const clientName = cell(row, 'client_name');
            if (clientName) {
              const { data: owner } = await supabase
                .from('owners')
                .insert({
                  organization_id: organization.id,
                  name: clientName,
                  phone: cell(row, 'client_phone') || null,
                })
                .select('id')
                .single();
              ownerId = owner?.id ?? null;
            }

            const { error: historyError } = await supabase.from('vehicles').insert({
              organization_id: organization.id,
              created_by: user.id,
              owner_id: ownerId,
              plate,
              brand: cell(row, 'brand') || 'Sin especificar',
              model: cell(row, 'model') || 'Sin especificar',
              mileage: parseFlexibleNumber(cell(row, 'mileage')) ?? null,
              work_summary: workSummary,
              client_description: cell(row, 'client_description') || null,
              status: 'entregado' as const,
              archived: true,
              delivered_at: `${dateIso}T12:00:00Z`,
              finished_at: `${dateIso}T12:00:00Z`,
            });
            if (historyError) throw historyError;
            summary.created++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          summary.errors.push(`${t('adminUI.importPage.line')} ${lineNumber}: ${message}`);
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResult(summary);
      if (summary.created > 0) {
        toast.success(`${t('adminUI.importPage.toast.imported')} ${summary.created}`);
      } else {
        toast.error(t('adminUI.importPage.toast.nothingImported'));
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('adminUI.importPage.toast.importError'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('adminUI.importPage.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminUI.importPage.subtitle')}</p>
          </div>
        </div>

        {/* Step 1: what to import */}
        <Card>
          <CardHeader>
            <CardTitle>1. {t('adminUI.importPage.step1Title')}</CardTitle>
            <CardDescription>{t('adminUI.importPage.step1Description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changeMode('vehicles')}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  mode === 'vehicles' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <Car className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{t('adminUI.importPage.modeVehicles')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('adminUI.importPage.modeVehiclesHelp')}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => changeMode('history')}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  mode === 'history' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <History className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{t('adminUI.importPage.modeHistory')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('adminUI.importPage.modeHistoryHelp')}
                  </p>
                </div>
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              {t('adminUI.importPage.downloadTemplate')}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: file */}
        <Card>
          <CardHeader>
            <CardTitle>2. {t('adminUI.importPage.step2Title')}</CardTitle>
            <CardDescription>{t('adminUI.importPage.step2Description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {t('adminUI.importPage.selectFile')}
            </Button>
            {fileName && (
              <p className="text-sm text-muted-foreground">
                {fileName} · {rows.length} {t('adminUI.importPage.rows')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: mapping */}
        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>3. {t('adminUI.importPage.step3Title')}</CardTitle>
              <CardDescription>{t('adminUI.importPage.step3Description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                  <Label className="flex items-center gap-2">
                    {field.label}
                    {field.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {t('adminUI.importPage.required')}
                      </Badge>
                    )}
                  </Label>
                  <Select
                    value={mapping[field.id] ?? NONE}
                    onValueChange={(value) =>
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (value === NONE) delete next[field.id];
                        else next[field.id] = value;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('adminUI.importPage.selectColumn')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('adminUI.importPage.ignore')}</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {mode === 'vehicles' && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>{t('adminUI.importPage.skipDuplicates')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('adminUI.importPage.skipDuplicatesHelp')}
                      </p>
                    </div>
                    <Switch checked={skipDuplicates} onCheckedChange={setSkipDuplicates} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: preview + import */}
        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>4. {t('adminUI.importPage.step4Title')}</CardTitle>
              <CardDescription>{t('adminUI.importPage.step4Description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {fields
                        .filter((f) => mapping[f.id])
                        .map((f) => (
                          <th key={f.id} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {fields
                          .filter((f) => mapping[f.id])
                          .map((f) => (
                            <td key={f.id} className="px-2 py-2 whitespace-nowrap">
                              {cell(row, f.id) || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {missingRequired.length > 0 && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {t('adminUI.importPage.missingRequired')}:{' '}
                  {missingRequired.map((f) => f.label).join(', ')}
                </p>
              )}

              {importing && <Progress value={progress} />}

              <Button onClick={runImport} disabled={!canImport} className="w-full">
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {t('adminUI.importPage.startImport')} ({rows.length})
              </Button>

              {result && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('adminUI.importPage.resultCreated')}: {result.created} ·{' '}
                    {t('adminUI.importPage.resultSkipped')}: {result.skipped} ·{' '}
                    {t('adminUI.importPage.resultErrors')}: {result.errors.length}
                  </p>
                  {result.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.slice(0, 50).map((err, idx) => (
                        <p key={idx} className="text-xs text-destructive">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
