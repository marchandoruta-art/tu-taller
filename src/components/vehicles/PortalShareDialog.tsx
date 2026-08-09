import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Copy, MessageCircle, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface PortalShareDialogProps {
  vehicleId: string;
  vehiclePlate: string;
  ownerPhone?: string | null;
}

interface PortalToken {
  id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export function PortalShareDialog({ vehicleId, vehiclePlate, ownerPhone }: PortalShareDialogProps) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const canShare = role === 'admin' || role === 'oficina';

  const fetchTokens = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_portal_tokens')
      .select('id, token, expires_at, revoked, created_at')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    setTokens((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchTokens();
  }, [open]);

  const portalUrl = (token: string) => `${window.location.origin}/c/${token}`;

  const createToken = async () => {
    if (!user || !organizationId) return;
    setCreating(true);
    const { error } = await supabase
      .from('client_portal_tokens')
      .insert([{ vehicle_id: vehicleId, organization_id: organizationId, created_by: user.id }]);
    setCreating(false);
    if (error) {
      toast.error(t('portalShareDialog.linkCreationError'));
    } else {
      toast.success(t('portalShareDialog.linkGenerated'));
      fetchTokens();
    }
  };

  const revokeToken = async (id: string) => {
    const { error } = await supabase
      .from('client_portal_tokens')
      .update({ revoked: true })
      .eq('id', id);
    if (error) {
      toast.error(t('portalShareDialog.revokeError'));
    } else {
      toast.success(t('portalShareDialog.linkRevoked'));
      fetchTokens();
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(portalUrl(token));
      toast.success(t('portalShareDialog.linkCopied'));
    } catch {
      toast.error(t('portalShareDialog.copyError'));
    }
  };

  const sendWhatsApp = (token: string) => {
    if (!ownerPhone) {
      toast.error(t('portalShareDialog.noClientPhone'));
      return;
    }
    const phone = ownerPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    const intl = phone.startsWith('34') ? phone : `34${phone}`;
    const msg = t('portalShareDialog.whatsappMessage', { plate: vehiclePlate, portalUrl: portalUrl(token) });
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!canShare) return null;

  const activeTokens = tokens.filter((tk) => !tk.revoked && new Date(tk.expires_at) > new Date());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t('portalShareDialog.shareWithClient')}</span>
          <span className="sm:hidden">{t('portalShareDialog.share')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> {t('portalShareDialog.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('portalShareDialog.dialogDescription', { plate: vehiclePlate })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button onClick={createToken} disabled={creating} className="w-full gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('portalShareDialog.generateNewLink')}
          </Button>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('portalShareDialog.noLinksYet')}
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {tokens.map((tk) => {
                const expired = new Date(tk.expires_at) < new Date();
                const inactive = tk.revoked || expired;
                return (
                  <div key={tk.id} className={`p-3 border rounded-lg space-y-2 ${inactive ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-muted-foreground">
                        {t('portalShareDialog.expires', { date: format(new Date(tk.expires_at), 'dd/MM/yy', { locale: es }) })}
                        {tk.revoked && ` · ${t('portalShareDialog.revoked')}`}
                        {expired && !tk.revoked && ` · ${t('portalShareDialog.expired')}`}
                      </div>
                      {!inactive && (
                        <Button variant="ghost" size="sm" onClick={() => revokeToken(tk.id)} className="h-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input readOnly value={portalUrl(tk.token)} className="text-xs font-mono" onFocus={(e) => e.target.select()} />
                    {!inactive && (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => copyLink(tk.token)} className="gap-1.5 h-8">
                          <Copy className="h-3.5 w-3.5" /> {t('portalShareDialog.copy')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(portalUrl(tk.token), '_blank')} className="gap-1.5 h-8">
                          <ExternalLink className="h-3.5 w-3.5" /> {t('portalShareDialog.open')}
                        </Button>
                        {ownerPhone && (
                          <Button size="sm" onClick={() => sendWhatsApp(tk.token)} className="gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white">
                            <MessageCircle className="h-3.5 w-3.5" /> {t('portalShareDialog.whatsapp')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTokens.length === 0 && tokens.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {t('portalShareDialog.noActiveLinks')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
