import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, CalendarCheck, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface Data {
  appointment: {
    date: string;
    time: string | null;
    client_name: string;
    plate: string | null;
    brand: string | null;
    model: string | null;
    status: 'pendiente' | 'confirmada' | 'cancelada';
    confirmed_at: string | null;
  };
  workshop: { name: string };
}

export default function AppointmentConfirm() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async (action?: 'confirm' | 'cancel') => {
    setLoading(!action);
    setSubmitting(!!action);
    try {
      const params = new URLSearchParams({ token: token || '' });
      if (action) params.set('action', action);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/respond-appointment?${params}`,
        { method: action ? 'POST' : 'GET', headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || t('appointmentConfirm.appointmentNotFound'));
      setData(j);
    } catch (e: any) {
      setError(e?.message || t('appointmentConfirm.genericError'));
    } finally {
      setLoading(false); setSubmitting(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full"><CardContent className="py-10 text-center space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive"/>
          <h2 className="text-lg font-semibold">{t('appointmentConfirm.linkInvalid')}</h2>
          <p className="text-sm text-muted-foreground">{error || t('appointmentConfirm.linkInvalidDescription')}</p>
        </CardContent></Card>
      </div>
    );
  }

  const apt = data.appointment;
  const dateLabel = format(parseISO(apt.date), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-5">
        <header className="text-center space-y-1">
          <h1 className="text-xl font-bold">{data.workshop.name}</h1>
          <p className="text-xs text-muted-foreground">{t('appointmentConfirm.subtitle')}</p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-5 w-5 text-primary"/>{t('appointmentConfirm.scheduledAppointment')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>{apt.client_name}</strong></p>
            <p className="text-muted-foreground capitalize">
              {dateLabel}{apt.time ? ` · ${apt.time.slice(0,5)} h` : ''}
            </p>
            {apt.plate && (
              <p className="text-muted-foreground">
                {t('appointmentConfirm.vehicleLabel')}: <span className="font-mono">{apt.plate}</span>
                {apt.brand ? ` — ${apt.brand} ${apt.model || ''}` : ''}
              </p>
            )}
          </CardContent>
        </Card>

        {apt.status === 'pendiente' ? (
          <div className="grid grid-cols-2 gap-3">
            <Button disabled={submitting} className="bg-green-600 hover:bg-green-700 h-12"
              onClick={() => load('confirm')}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <><CheckCircle2 className="h-5 w-5 mr-1"/>{t('appointmentConfirm.confirm')}</>}
            </Button>
            <Button disabled={submitting} variant="destructive" className="h-12" onClick={() => load('cancel')}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <><XCircle className="h-5 w-5 mr-1"/>{t('appointmentConfirm.cancel')}</>}
            </Button>
          </div>
        ) : apt.status === 'confirmada' ? (
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600"/>
              <p className="font-semibold">{t('appointmentConfirm.confirmedTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('appointmentConfirm.confirmedDescription')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-6 text-center space-y-2">
              <XCircle className="h-10 w-10 mx-auto text-destructive"/>
              <p className="font-semibold">{t('appointmentConfirm.cancelledTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('appointmentConfirm.cancelledDescription')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
