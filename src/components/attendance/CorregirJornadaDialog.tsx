import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { RegistroJornada, formatearDuracion } from '@/lib/jornada';

interface Props {
  registro: RegistroJornada | null;
  nombreTrabajador: string;
  onClose: () => void;
  onCorregido: () => void;
}

/** El motivo lo exige tambien la funcion en base de datos. Se avisa antes de llamar. */
const MOTIVO_MINIMO = 5;

/**
 * Correccion de una jornada mal fichada.
 *
 * No escribe en la tabla: llama a `corregir_jornada`, que es quien comprueba el
 * rol, recalcula el total, marca la fila como corregida y deja la huella de
 * quien y por que. Escribir aqui directamente esta bloqueado por un disparador.
 */
export function CorregirJornadaDialog({ registro, nombreTrabajador, onClose, onCorregido }: Props) {
  const { t } = useTranslation();
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  // `datetime-local` quiere hora local sin zona, no ISO.
  const paraCampo = (iso: string | null) =>
    iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '';

  useEffect(() => {
    if (!registro) return;
    setEntrada(paraCampo(registro.clock_in));
    setSalida(paraCampo(registro.clock_out));
    setMotivo('');
  }, [registro]);

  if (!registro) return null;

  const minutos = entrada && salida
    ? Math.round((new Date(salida).getTime() - new Date(entrada).getTime()) / 60000)
    : 0;

  const motivoCorto = motivo.trim().length < MOTIVO_MINIMO;
  const horasInvertidas = Boolean(entrada && salida && minutos <= 0);
  const noSePuede = guardando || !entrada || !salida || motivoCorto || horasInvertidas;

  const guardar = async () => {
    setGuardando(true);
    const { error } = await supabase.rpc('corregir_jornada' as never, {
      _id: registro.id,
      _clock_in: new Date(entrada).toISOString(),
      _clock_out: new Date(salida).toISOString(),
      _motivo: motivo.trim(),
    } as never);
    setGuardando(false);

    if (error) {
      toast.error(t('jornadaUI.corregir.errorTitulo'), { description: error.message });
      return;
    }

    toast.success(t('jornadaUI.corregir.hecho'));
    onCorregido();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('jornadaUI.corregir.titulo')}</DialogTitle>
          <DialogDescription>
            {t('jornadaUI.corregir.subtitulo', {
              nombre: nombreTrabajador,
              dia: format(new Date(registro.clock_in), 'dd/MM/yyyy'),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jornada-entrada">{t('jornadaUI.tabla.entrada')}</Label>
              <Input
                id="jornada-entrada"
                type="datetime-local"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jornada-salida">{t('jornadaUI.tabla.salida')}</Label>
              <Input
                id="jornada-salida"
                type="datetime-local"
                value={salida}
                onChange={(e) => setSalida(e.target.value)}
              />
            </div>
          </div>

          {horasInvertidas ? (
            <p className="text-sm text-destructive">{t('jornadaUI.corregir.horasInvertidas')}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('jornadaUI.corregir.totalResultante')}{' '}
              <strong className="tabular-nums">{formatearDuracion(minutos)}</strong>
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="jornada-motivo">{t('jornadaUI.corregir.motivo')}</Label>
            <Textarea
              id="jornada-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t('jornadaUI.corregir.motivoEjemplo')}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t('jornadaUI.corregir.motivoAyuda')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            {t('jornadaUI.corregir.cancelar')}
          </Button>
          <Button onClick={guardar} disabled={noSePuede}>
            {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('jornadaUI.corregir.guardar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
