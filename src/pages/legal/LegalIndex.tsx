import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  Cookie, 
  FileCheck, 
  ClipboardList,
  Copy,
  Scale,
  ChevronRight
} from 'lucide-react';

const legalDocuments = [
  {
    title: 'Aviso Legal',
    description: 'Información identificativa del titular, condiciones de uso y normativa aplicable',
    href: '/aviso-legal',
    icon: Scale,
  },
  {
    title: 'Política de Privacidad',
    description: 'Tratamiento de datos personales según RGPD y LOPDGDD',
    href: '/politica-privacidad',
    icon: Shield,
  },
  {
    title: 'Política de Cookies',
    description: 'Información sobre el uso de cookies y tecnologías similares',
    href: '/politica-cookies',
    icon: Cookie,
  },
  {
    title: 'Términos y Condiciones',
    description: 'Condiciones del servicio SaaS, suscripciones y uso de la plataforma',
    href: '/terminos-condiciones',
    icon: FileCheck,
  },
  {
    title: 'Contrato de Encargado de Tratamiento',
    description: 'Acuerdo para clientes que tratan datos de terceros a través de la plataforma',
    href: '/contrato-encargado',
    icon: ClipboardList,
  },
  {
    title: 'Textos Legales para Implementación',
    description: 'Cláusulas, checkboxes y textos para formularios y comunicaciones',
    href: '/textos-legales',
    icon: Copy,
  },
];

export default function LegalIndex() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Documentación Legal</h1>
                <p className="text-muted-foreground">
                  Toda la documentación legal de la plataforma en un solo lugar
                </p>
              </div>
            </div>
          </div>

          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Importante:</strong> Esta documentación es una plantilla profesional. 
                Debes personalizar las variables entre corchetes [NOMBRE_EMPRESA], [CIF], etc. 
                Se recomienda revisión por un profesional legal antes de su publicación.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {legalDocuments.map((doc) => (
              <Link key={doc.href} to={doc.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                          <doc.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {doc.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {doc.description}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Variables a Personalizar</CardTitle>
              <CardDescription>
                Sustituye estas variables en todos los documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[NOMBRE_EMPRESA]</code>
                  <span className="text-muted-foreground">Razón social</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[CIF]</code>
                  <span className="text-muted-foreground">NIF/CIF de la empresa</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[DIRECCIÓN]</code>
                  <span className="text-muted-foreground">Domicilio social</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[CÓDIGO_POSTAL]</code>
                  <span className="text-muted-foreground">Código postal</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[CIUDAD]</code>
                  <span className="text-muted-foreground">Ciudad</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[PAÍS]</code>
                  <span className="text-muted-foreground">País</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[EMAIL]</code>
                  <span className="text-muted-foreground">Email de contacto</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[DOMINIO]</code>
                  <span className="text-muted-foreground">Dominio web</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">[FECHA_ACTUALIZACIÓN]</code>
                  <span className="text-muted-foreground">Fecha de última actualización</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
