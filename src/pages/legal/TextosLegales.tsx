import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TextosLegales() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Texto copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Error al copiar");
    }
  };

  const textos = {
    formularioRegistro: `INFORMACIÓN BÁSICA SOBRE PROTECCIÓN DE DATOS

Responsable: [NOMBRE_EMPRESA]
Finalidad: Gestión de su cuenta de usuario y prestación del servicio SaaS de gestión de talleres.
Legitimación: Ejecución de contrato (Art. 6.1.b RGPD).
Destinatarios: Sus datos podrán ser comunicados a proveedores de servicios tecnológicos (hosting, pagos) para la prestación del servicio.
Derechos: Acceso, rectificación, supresión, portabilidad, limitación y oposición. Puede ejercerlos en [EMAIL].
Información adicional: Puede consultar la información adicional y detallada sobre Protección de Datos en nuestra Política de Privacidad: [DOMINIO]/politica-privacidad`,

    checkboxTerminos: `He leído y acepto los Términos y Condiciones de uso del servicio y la Política de Privacidad. Entiendo que mis datos serán tratados conforme a lo establecido en dichos documentos.`,

    checkboxComunicaciones: `Acepto recibir comunicaciones comerciales y promocionales de [NOMBRE_EMPRESA] sobre productos, servicios y novedades que puedan ser de mi interés. Puedo revocar este consentimiento en cualquier momento.`,

    checkboxMayorEdad: `Declaro ser mayor de edad y tener capacidad legal para contratar los servicios ofrecidos.`,

    consentimientoCookies: `Utilizamos cookies propias y de terceros para mejorar nuestros servicios, analizar el tráfico web y personalizar contenidos. Puede aceptar todas las cookies, configurar sus preferencias o rechazar las no esenciales. Para más información, consulte nuestra Política de Cookies.`,

    bannerCookiesCompleto: `AVISO DE COOKIES

Esta web utiliza cookies para ofrecerte una mejor experiencia de usuario.

🔹 Cookies necesarias: Imprescindibles para el funcionamiento de la web y la prestación del servicio.
🔹 Cookies de preferencias: Permiten recordar tus preferencias (idioma, tema, etc.).
🔹 Cookies analíticas: Nos ayudan a entender cómo usas la web para mejorarla.

Puedes aceptar todas las cookies, configurar tus preferencias o rechazar las no esenciales.

[Botón: Aceptar todas] [Botón: Configurar] [Botón: Solo necesarias]

Más información en nuestra Política de Cookies.`,

    emailBienvenida: `Asunto: Bienvenido/a a [NOMBRE_EMPRESA] - Tu cuenta ha sido creada

Estimado/a [NOMBRE_USUARIO],

¡Bienvenido/a a [NOMBRE_EMPRESA]!

Tu cuenta ha sido creada correctamente. Ya puedes acceder a nuestra plataforma de gestión de talleres y comenzar a organizar tu negocio de forma eficiente.

Para acceder a tu cuenta, haz clic en el siguiente enlace:
[ENLACE_ACCESO]

Si tienes cualquier pregunta, no dudes en contactar con nuestro equipo de soporte en [EMAIL_SOPORTE].

Gracias por confiar en nosotros.

Un saludo,
El equipo de [NOMBRE_EMPRESA]

---
Este email ha sido enviado a [EMAIL_DESTINATARIO] porque te has registrado en [DOMINIO].
Si no has sido tú, ignora este mensaje o contacta con nosotros.

[NOMBRE_EMPRESA] | [DIRECCIÓN] | [CIF]
Política de Privacidad: [DOMINIO]/politica-privacidad
Darte de baja de emails: [ENLACE_BAJA]`,

    emailFactura: `Asunto: Tu factura de [NOMBRE_EMPRESA] - [MES/AÑO]

Estimado/a [NOMBRE_USUARIO],

Te informamos de que se ha generado una nueva factura correspondiente a tu suscripción de [NOMBRE_EMPRESA].

Detalles de la factura:
- Número de factura: [NUMERO_FACTURA]
- Fecha: [FECHA_FACTURA]
- Concepto: Suscripción [PLAN] - [MES/AÑO]
- Importe: [IMPORTE] € (IVA incluido)

Puedes descargar tu factura desde tu panel de usuario en [DOMINIO]/facturacion.

El cargo se ha realizado en la tarjeta terminada en ****[ULTIMOS_4_DIGITOS].

Si tienes cualquier pregunta sobre esta factura, contacta con nosotros en [EMAIL].

Gracias por confiar en [NOMBRE_EMPRESA].

Un saludo,
El equipo de [NOMBRE_EMPRESA]

---
Este email ha sido enviado a [EMAIL_DESTINATARIO].

[NOMBRE_EMPRESA] | [DIRECCIÓN] | [CIF]
Política de Privacidad: [DOMINIO]/politica-privacidad`,

    emailCancelacion: `Asunto: Confirmación de cancelación - [NOMBRE_EMPRESA]

Estimado/a [NOMBRE_USUARIO],

Te confirmamos que tu suscripción a [NOMBRE_EMPRESA] ha sido cancelada correctamente.

Tu acceso al servicio continuará activo hasta el [FECHA_FIN_SUSCRIPCION], fecha en la que finaliza tu período de facturación actual.

Información importante:
- Tendrás acceso completo a la plataforma hasta el [FECHA_FIN_SUSCRIPCION].
- Podrás exportar tus datos desde el panel de configuración antes de esa fecha.
- Pasados 30 días desde la cancelación, tus datos serán eliminados de forma permanente.

Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento desde tu panel de usuario.

Lamentamos verte marchar. Si hay algo que podamos mejorar, nos encantaría conocer tu opinión respondiendo a este email.

Gracias por haber confiado en nosotros.

Un saludo,
El equipo de [NOMBRE_EMPRESA]

---
[NOMBRE_EMPRESA] | [DIRECCIÓN] | [CIF]
Política de Privacidad: [DOMINIO]/politica-privacidad`,

    emailRecuperacion: `Asunto: Recupera tu contraseña - [NOMBRE_EMPRESA]

Hola [NOMBRE_USUARIO],

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en [NOMBRE_EMPRESA].

Para crear una nueva contraseña, haz clic en el siguiente enlace:
[ENLACE_RECUPERACION]

Este enlace expirará en 1 hora por motivos de seguridad.

Si no has solicitado cambiar tu contraseña, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo válida.

Por seguridad, te recomendamos:
- No compartir este enlace con nadie
- Crear una contraseña segura de al menos 8 caracteres
- No reutilizar contraseñas de otros servicios

Si tienes problemas para acceder a tu cuenta, contacta con nosotros en [EMAIL_SOPORTE].

Un saludo,
El equipo de [NOMBRE_EMPRESA]

---
Este email ha sido enviado a [EMAIL_DESTINATARIO].
Si no has solicitado restablecer tu contraseña, te recomendamos revisar la seguridad de tu cuenta de email.

[NOMBRE_EMPRESA] | [DIRECCIÓN] | [CIF]`,

    pantallaRegistro: `REGISTRO DE USUARIO

Al registrarte en [NOMBRE_EMPRESA] aceptas nuestros Términos y Condiciones y nuestra Política de Privacidad.

Tus datos serán tratados para gestionar tu cuenta y prestarte el servicio de gestión de talleres. La base legal es la ejecución del contrato que formalizas al registrarte.

Podrás ejercer tus derechos de acceso, rectificación, supresión, portabilidad, limitación y oposición escribiendo a [EMAIL].

Para más información, consulta nuestra Política de Privacidad.`,

    politicaCancelacionCompleta: `POLÍTICA DE CANCELACIÓN Y REEMBOLSOS

1. DERECHO DE DESISTIMIENTO
Conforme al artículo 103.m) del Real Decreto Legislativo 1/2007, el derecho de desistimiento no es aplicable al suministro de contenido digital que no se preste en un soporte material cuando la ejecución haya comenzado con el previo consentimiento expreso del consumidor.

Al iniciar el uso del servicio tras el registro, el usuario reconoce que la prestación del servicio ha comenzado y que pierde su derecho de desistimiento.

No obstante, [NOMBRE_EMPRESA] ofrece un período de prueba gratuito de [DÍAS_PRUEBA] días para evaluar el servicio antes de contratar una suscripción de pago.

2. CANCELACIÓN DE LA SUSCRIPCIÓN
El usuario puede cancelar su suscripción en cualquier momento desde la sección "Configuración > Suscripción" de su cuenta.

La cancelación será efectiva al finalizar el período de facturación en curso. El usuario mantendrá acceso completo al servicio hasta dicha fecha.

Una vez cancelada la suscripción:
- El usuario tendrá 30 días para exportar sus datos
- Transcurridos 30 días, los datos serán eliminados de forma permanente
- El usuario podrá reactivar su cuenta durante los 30 días posteriores a la cancelación

3. POLÍTICA DE REEMBOLSOS
Como norma general, no se realizan reembolsos de los períodos de suscripción ya facturados.

Excepciones (se procederá al reembolso):
- Error de facturación imputable a [NOMBRE_EMPRESA]
- Cobro duplicado
- Fallo grave del servicio que impida su uso durante más de 7 días consecutivos
- Otros casos que [NOMBRE_EMPRESA] considere justificados

4. SOLICITUD DE REEMBOLSO
Para solicitar un reembolso, el usuario debe:
- Enviar un email a [EMAIL] con el asunto "Solicitud de reembolso"
- Indicar el motivo de la solicitud
- Adjuntar cualquier documentación relevante

Plazo: Las solicitudes deben realizarse en un plazo máximo de 14 días desde la fecha de facturación.

5. TRAMITACIÓN
[NOMBRE_EMPRESA] evaluará cada solicitud de forma individual y comunicará su decisión en un plazo máximo de 10 días laborables.

En caso de aprobarse el reembolso, este se realizará utilizando el mismo método de pago empleado para la transacción original, en un plazo máximo de 14 días.

6. CAMBIO DE PLAN
El usuario puede cambiar de plan de suscripción en cualquier momento:
- Upgrade (plan superior): Se aplicará de forma inmediata, prorrateando el importe restante del plan anterior.
- Downgrade (plan inferior): Se aplicará al inicio del siguiente período de facturación.

7. CONTACTO
Para cualquier consulta relacionada con cancelaciones o reembolsos:
Email: [EMAIL]
Teléfono: [TELÉFONO]
Horario de atención: Lunes a Viernes de 9:00 a 18:00 (CET)`,
  };

  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-5xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-2">Textos Legales para Implementación</h1>
          <p className="text-muted-foreground mb-6">
            Textos listos para copiar y usar en formularios, emails y diferentes secciones de la aplicación.
            Recuerda sustituir las variables entre corchetes [VARIABLE] por tus datos reales.
          </p>

          <Tabs defaultValue="formularios" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="formularios">Formularios</TabsTrigger>
              <TabsTrigger value="cookies">Cookies</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="otros">Otros</TabsTrigger>
            </TabsList>

            <TabsContent value="formularios" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Cláusula informativa para formulario de registro</CardTitle>
                      <CardDescription>Texto a mostrar junto al formulario de registro de usuarios</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.formularioRegistro, "formularioRegistro")}
                    >
                      {copiedId === "formularioRegistro" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.formularioRegistro}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Checkbox de aceptación de términos</CardTitle>
                      <CardDescription>Texto para el checkbox obligatorio de términos y condiciones</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.checkboxTerminos, "checkboxTerminos")}
                    >
                      {copiedId === "checkboxTerminos" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.checkboxTerminos}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Checkbox de comunicaciones comerciales</CardTitle>
                      <CardDescription>Texto opcional para recibir comunicaciones comerciales</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.checkboxComunicaciones, "checkboxComunicaciones")}
                    >
                      {copiedId === "checkboxComunicaciones" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.checkboxComunicaciones}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Declaración de mayoría de edad</CardTitle>
                      <CardDescription>Checkbox para confirmar que el usuario es mayor de edad</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.checkboxMayorEdad, "checkboxMayorEdad")}
                    >
                      {copiedId === "checkboxMayorEdad" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.checkboxMayorEdad}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Texto legal para pantalla de registro</CardTitle>
                      <CardDescription>Información legal a mostrar en la página de registro</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.pantallaRegistro, "pantallaRegistro")}
                    >
                      {copiedId === "pantallaRegistro" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.pantallaRegistro}</pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cookies" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Texto breve de consentimiento de cookies</CardTitle>
                      <CardDescription>Versión resumida para banners pequeños</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.consentimientoCookies, "consentimientoCookies")}
                    >
                      {copiedId === "consentimientoCookies" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.consentimientoCookies}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Banner de cookies completo</CardTitle>
                      <CardDescription>Versión completa con opciones de configuración</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.bannerCookiesCompleto, "bannerCookiesCompleto")}
                    >
                      {copiedId === "bannerCookiesCompleto" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.bannerCookiesCompleto}</pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Email de bienvenida</CardTitle>
                      <CardDescription>Enviado tras el registro de un nuevo usuario</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.emailBienvenida, "emailBienvenida")}
                    >
                      {copiedId === "emailBienvenida" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.emailBienvenida}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Email de factura</CardTitle>
                      <CardDescription>Enviado al generar una nueva factura</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.emailFactura, "emailFactura")}
                    >
                      {copiedId === "emailFactura" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.emailFactura}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Email de confirmación de cancelación</CardTitle>
                      <CardDescription>Enviado al cancelar la suscripción</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.emailCancelacion, "emailCancelacion")}
                    >
                      {copiedId === "emailCancelacion" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.emailCancelacion}</pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Email de recuperación de contraseña</CardTitle>
                      <CardDescription>Enviado al solicitar restablecer contraseña</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.emailRecuperacion, "emailRecuperacion")}
                    >
                      {copiedId === "emailRecuperacion" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">{textos.emailRecuperacion}</pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="otros" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Política de cancelación y reembolsos</CardTitle>
                      <CardDescription>Política completa para publicar en la web</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(textos.politicaCancelacionCompleta, "politicaCancelacionCompleta")}
                    >
                      {copiedId === "politicaCancelacionCompleta" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto">{textos.politicaCancelacionCompleta}</pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Variables a sustituir</CardTitle>
              <CardDescription>
                Antes de usar los textos, sustituye las siguientes variables por los datos reales de tu empresa:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <code className="bg-muted px-2 py-1 rounded">[NOMBRE_EMPRESA]</code>
                <code className="bg-muted px-2 py-1 rounded">[CIF]</code>
                <code className="bg-muted px-2 py-1 rounded">[DIRECCIÓN]</code>
                <code className="bg-muted px-2 py-1 rounded">[CÓDIGO_POSTAL]</code>
                <code className="bg-muted px-2 py-1 rounded">[CIUDAD]</code>
                <code className="bg-muted px-2 py-1 rounded">[PAÍS]</code>
                <code className="bg-muted px-2 py-1 rounded">[EMAIL]</code>
                <code className="bg-muted px-2 py-1 rounded">[TELÉFONO]</code>
                <code className="bg-muted px-2 py-1 rounded">[DOMINIO]</code>
                <code className="bg-muted px-2 py-1 rounded">[EMAIL_DPO]</code>
                <code className="bg-muted px-2 py-1 rounded">[EMAIL_SOPORTE]</code>
                <code className="bg-muted px-2 py-1 rounded">[DÍAS_PRUEBA]</code>
                <code className="bg-muted px-2 py-1 rounded">[FECHA_ACTUALIZACIÓN]</code>
                <code className="bg-muted px-2 py-1 rounded">[TOMO]</code>
                <code className="bg-muted px-2 py-1 rounded">[FOLIO]</code>
                <code className="bg-muted px-2 py-1 rounded">[HOJA]</code>
                <code className="bg-muted px-2 py-1 rounded">[INSCRIPCIÓN]</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
