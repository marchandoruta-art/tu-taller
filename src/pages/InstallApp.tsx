import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  PlusSquare,
  Chrome,
  CheckCircle2,
  ArrowRight,
  Apple,
  Globe
} from 'lucide-react';

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const appUrl = window.location.origin;

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Instalar Aplicación</h1>
          <p className="text-muted-foreground">
            Añade la app a tu dispositivo para acceso rápido
          </p>
        </div>

        {/* App URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" />
              URL de la Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg text-sm break-all">
                {appUrl}
              </code>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                }}
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-6 flex items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h3 className="font-bold text-lg">¡App Instalada!</h3>
                <p className="text-muted-foreground">
                  Ya tienes la aplicación instalada en tu dispositivo
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Install Button */}
            {deferredPrompt && (
              <Button onClick={handleInstall} size="lg" className="w-full gap-2 h-14 text-lg">
                <Download className="h-5 w-5" />
                Instalar Ahora
              </Button>
            )}

            {/* Platform-specific instructions */}
            <div className="space-y-4">
              {/* iOS */}
              {(platform === 'ios' || platform === 'desktop') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Apple className="h-5 w-5" />
                      iPhone / iPad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Abre en Safari</p>
                        <p className="text-sm text-muted-foreground">
                          Asegúrate de usar el navegador Safari
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Toca el botón Compartir</p>
                        <Share className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Añadir a pantalla de inicio</p>
                        <PlusSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Android */}
              {(platform === 'android' || platform === 'desktop') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Android
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Abre en Chrome</p>
                        <Chrome className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Menú ⋮ → Instalar app</p>
                        <p className="text-sm text-muted-foreground">
                          O aparecerá un banner automático
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Desktop */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Ordenador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Abre en Chrome o Edge</p>
                      <Chrome className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Busca el icono de instalación</p>
                      <p className="text-sm text-muted-foreground">
                        En la barra de direcciones aparecerá un icono de + o descarga
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
