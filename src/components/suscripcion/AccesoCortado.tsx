import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import type { Suscripcion } from '@/hooks/useSuscripcion';
import { AlertTriangle, LogOut, Mail } from 'lucide-react';

/**
 * Lo que ve un taller al que se le ha cortado el acceso.
 *
 * El corte es real y ocurre en la base de datos: desde aqui no se ve ni un
 * dato del taller. Esta pantalla solo explica por que y como arreglarlo, que
 * es lo minimo que se le debe a alguien que ha sido cliente.
 */
export function AccesoCortado({ suscripcion }: { suscripcion: Suscripcion }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const motivo =
    suscripcion.dado_de_baja_en || suscripcion.estado === 'cancelada' ? 'baja'
    : suscripcion.estado === 'prueba' ? 'pruebaAcabada'
    : 'impago';

  const fecha = (iso: string | null) =>
    iso ? format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: es }) : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 space-y-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold">{t(`suscripcionUI.cortado.${motivo}.titulo`)}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`suscripcionUI.cortado.${motivo}.texto`, {
                taller: suscripcion.taller ?? '',
                fecha: fecha(motivo === 'pruebaAcabada'
                  ? suscripcion.prueba_termina_en
                  : suscripcion.suscripcion_termina_en),
              })}
            </p>
          </div>

          <p className="text-xs text-muted-foreground border-t pt-4">
            {t('suscripcionUI.cortado.datosASalvo')}
          </p>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href={`mailto:${t('suscripcionUI.cortado.correoContacto')}`}>
                <Mail className="w-4 h-4 mr-2" />
                {t('suscripcionUI.cortado.contactar')}
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('suscripcionUI.cortado.salir')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
