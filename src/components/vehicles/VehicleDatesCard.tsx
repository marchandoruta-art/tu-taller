import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Props {
  vehicleId: string;
}

export function VehicleDatesCard({ vehicleId }: Props) {
  const { t } = useTranslation();
  const [itv, setItv] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('itv_date, next_maintenance_date')
        .eq('id', vehicleId)
        .maybeSingle();
      if (cancelled || !data) return;
      setItv(data.itv_date ?? '');
      setMaintenance(data.next_maintenance_date ?? '');
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .update({
        itv_date: itv || null,
        next_maintenance_date: maintenance || null,
      })
      .eq('id', vehicleId);
    setSaving(false);
    if (error) return toast.error(t('reminders.toast.saveError'));
    toast.success(t('reminders.vehicle.saved'));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-primary" />
          {t('reminders.vehicle.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="itv-date">{t('reminders.vehicle.itvDate')}</Label>
            <Input id="itv-date" type="date" value={itv} onChange={(e) => setItv(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maintenance-date">{t('reminders.vehicle.maintenanceDate')}</Label>
            <Input
              id="maintenance-date"
              type="date"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t('reminders.vehicle.hint')}</p>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('reminders.vehicle.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
