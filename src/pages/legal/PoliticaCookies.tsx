import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PoliticaCookies() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 prose prose-slate dark:prose-invert">
          <h1>POLÍTICA DE COOKIES</h1>
          
          <h2>1. ¿QUÉ SON LAS COOKIES?</h2>
          <p>
            Las cookies son pequeños archivos de texto que los sitios web almacenan en el dispositivo del usuario 
            (ordenador, tablet, smartphone) cuando navega por Internet. Las cookies permiten que el sitio web 
            recuerde las acciones y preferencias del usuario (como el idioma, tamaño de fuente y otras preferencias 
            de visualización), de manera que no tenga que volver a configurarlas cuando regrese al sitio o navegue 
            por sus páginas.
          </p>

          <h2>2. RESPONSABLE DEL USO DE COOKIES</h2>
          <p>
            El responsable del uso de cookies en este sitio web es [NOMBRE_EMPRESA], con domicilio en [DIRECCIÓN], 
            [CÓDIGO_POSTAL] [CIUDAD], [PAÍS], y correo electrónico [EMAIL].
          </p>

          <h2>3. TIPOS DE COOKIES UTILIZADAS</h2>
          <p>Este sitio web utiliza los siguientes tipos de cookies:</p>

          <h3>3.1. Según su titularidad</h3>
          
          <h4>Cookies propias</h4>
          <p>
            Son aquellas que se envían al equipo del usuario desde un equipo o dominio gestionado por [NOMBRE_EMPRESA] 
            y desde el que se presta el servicio solicitado por el usuario.
          </p>
          
          <h4>Cookies de terceros</h4>
          <p>
            Son aquellas que se envían al equipo del usuario desde un equipo o dominio que no es gestionado por 
            [NOMBRE_EMPRESA], sino por otra entidad que trata los datos obtenidos a través de las cookies.
          </p>

          <h3>3.2. Según su finalidad</h3>

          <h4>Cookies técnicas o necesarias</h4>
          <p>
            Son aquellas que permiten al usuario la navegación a través de una página web, plataforma o aplicación 
            y la utilización de las diferentes opciones o servicios que en ella existan, incluyendo aquellas que 
            se utilizan para permitir la gestión y operativa de la página web y habilitar sus funciones y servicios, 
            como, por ejemplo, controlar el tráfico y la comunicación de datos, identificar la sesión, acceder a 
            partes de acceso restringido, recordar los elementos que integran un pedido, realizar el proceso de 
            compra de un pedido, gestionar el pago, etc.
          </p>

          <h4>Cookies de preferencias o personalización</h4>
          <p>
            Son aquellas que permiten recordar información para que el usuario acceda al servicio con determinadas 
            características que pueden diferenciar su experiencia de la de otros usuarios, como, por ejemplo, el 
            idioma, el número de resultados a mostrar cuando el usuario realiza una búsqueda, el aspecto o contenido 
            del servicio en función del tipo de navegador a través del cual el usuario accede al servicio o de la 
            región desde la que accede al servicio, etc.
          </p>

          <h4>Cookies de análisis o medición</h4>
          <p>
            Son aquellas que permiten al responsable de las mismas el seguimiento y análisis del comportamiento 
            de los usuarios de los sitios web a los que están vinculadas, incluida la cuantificación de los impactos 
            de los anuncios. La información recogida mediante este tipo de cookies se utiliza en la medición de la 
            actividad de los sitios web, aplicación o plataforma, con el fin de introducir mejoras en función del 
            análisis de los datos de uso que hacen los usuarios del servicio.
          </p>

          <h4>Cookies de publicidad comportamental</h4>
          <p>
            Son aquellas que almacenan información del comportamiento de los usuarios obtenida a través de la 
            observación continuada de sus hábitos de navegación, lo que permite desarrollar un perfil específico 
            para mostrar publicidad en función del mismo.
          </p>

          <h3>3.3. Según su duración</h3>

          <h4>Cookies de sesión</h4>
          <p>
            Son aquellas diseñadas para recabar y almacenar datos mientras el usuario accede a una página web. 
            Se suelen emplear para almacenar información que solo interesa conservar para la prestación del servicio 
            solicitado por el usuario en una sola ocasión y desaparecen al terminar la sesión.
          </p>

          <h4>Cookies persistentes</h4>
          <p>
            Son aquellas en las que los datos siguen almacenados en el terminal y pueden ser accedidos y tratados 
            durante un periodo definido por el responsable de la cookie, que puede ir de unos minutos a varios años.
          </p>

          <h2>4. COOKIES UTILIZADAS EN ESTE SITIO WEB</h2>
          <p>A continuación se detallan las cookies utilizadas en este sitio web:</p>

          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Titular</th>
                <th>Finalidad</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>sb-*-auth-token</td>
                <td>Técnica</td>
                <td>Propia</td>
                <td>Mantener la sesión del usuario autenticado</td>
                <td>Sesión / 7 días</td>
              </tr>
              <tr>
                <td>supabase-auth-token</td>
                <td>Técnica</td>
                <td>Propia</td>
                <td>Token de autenticación para acceso a servicios</td>
                <td>7 días</td>
              </tr>
              <tr>
                <td>theme</td>
                <td>Preferencias</td>
                <td>Propia</td>
                <td>Recordar la preferencia de tema claro/oscuro</td>
                <td>1 año</td>
              </tr>
              <tr>
                <td>cookie-consent</td>
                <td>Técnica</td>
                <td>Propia</td>
                <td>Almacenar las preferencias de cookies del usuario</td>
                <td>1 año</td>
              </tr>
              <tr>
                <td>locale</td>
                <td>Preferencias</td>
                <td>Propia</td>
                <td>Recordar el idioma seleccionado por el usuario</td>
                <td>1 año</td>
              </tr>
            </tbody>
          </table>

          <h3>Cookies de terceros</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Titular</th>
                <th>Finalidad</th>
                <th>Duración</th>
                <th>Más información</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>__stripe_mid, __stripe_sid</td>
                <td>Técnica</td>
                <td>Stripe</td>
                <td>Procesamiento seguro de pagos y prevención de fraude</td>
                <td>1 año / Sesión</td>
                <td><a href="https://stripe.com/es/privacy" target="_blank" rel="noopener noreferrer">Política de privacidad de Stripe</a></td>
              </tr>
            </tbody>
          </table>

          <h2>5. LEGITIMACIÓN PARA EL USO DE COOKIES</h2>
          <p>
            La base legal para el tratamiento de datos mediante cookies es:
          </p>
          <ul>
            <li><strong>Cookies técnicas/necesarias:</strong> Art. 22.2 LSSI-CE. No requieren consentimiento al ser estrictamente necesarias para la prestación del servicio.</li>
            <li><strong>Cookies de preferencias, análisis y publicidad:</strong> Art. 6.1.a) RGPD. Consentimiento del usuario prestado mediante el banner de cookies.</li>
          </ul>

          <h2>6. GESTIÓN DE COOKIES</h2>
          
          <h3>6.1. Panel de configuración de cookies</h3>
          <p>
            En cualquier momento puede modificar sus preferencias de cookies a través del panel de configuración 
            de cookies disponible en [DOMINIO]/configuracion-cookies o haciendo clic en "Configurar cookies" 
            en el pie de página.
          </p>

          <h3>6.2. Configuración del navegador</h3>
          <p>
            También puede configurar su navegador para aceptar o rechazar por defecto todas las cookies o para 
            recibir un aviso en pantalla de la recepción de cada cookie y decidir en ese momento su implantación 
            o no en su disco duro. A continuación le proporcionamos los enlaces a las instrucciones de los 
            navegadores más utilizados:
          </p>
          <ul>
            <li><strong>Google Chrome:</strong> <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Configuración de cookies en Chrome</a></li>
            <li><strong>Mozilla Firefox:</strong> <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Configuración de cookies en Firefox</a></li>
            <li><strong>Safari:</strong> <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Configuración de cookies en Safari</a></li>
            <li><strong>Microsoft Edge:</strong> <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Configuración de cookies en Edge</a></li>
            <li><strong>Opera:</strong> <a href="https://help.opera.com/en/latest/web-preferences/#cookies" target="_blank" rel="noopener noreferrer">Configuración de cookies en Opera</a></li>
          </ul>

          <h3>6.3. Consecuencias de desactivar las cookies</h3>
          <p>
            Si desactiva las cookies técnicas o necesarias, es posible que no pueda acceder a determinadas partes 
            del sitio web o que algunas funcionalidades no estén disponibles o no funcionen correctamente.
          </p>
          <p>
            Si desactiva las cookies de personalización, es posible que tenga que volver a configurar sus 
            preferencias cada vez que visite el sitio web.
          </p>

          <h2>7. TRANSFERENCIAS INTERNACIONALES</h2>
          <p>
            Algunos de nuestros proveedores de cookies pueden estar ubicados fuera del Espacio Económico Europeo. 
            En estos casos, las transferencias de datos se realizan conforme a las garantías previstas en el RGPD, 
            tales como las Cláusulas Contractuales Tipo o el marco de privacidad UE-EE.UU. (Data Privacy Framework).
          </p>
          <p>
            Puede consultar más información sobre las garantías aplicadas a cada proveedor en el apartado 7 de 
            nuestra Política de Privacidad.
          </p>

          <h2>8. ACTUALIZACIONES Y CAMBIOS EN LA POLÍTICA DE COOKIES</h2>
          <p>
            Esta Política de Cookies puede ser actualizada en función de exigencias legales o con la finalidad de 
            adaptar dicha política a las instrucciones dictadas por la Agencia Española de Protección de Datos o 
            por cambios en nuestro sitio web.
          </p>
          <p>
            Por ello, aconsejamos revisar esta política periódicamente para estar informado sobre cómo y para qué 
            usamos las cookies.
          </p>
          <p>
            Cuando se produzcan cambios significativos en esta Política de Cookies, se comunicará al usuario 
            mediante un aviso visible en el sitio web.
          </p>

          <h2>9. MÁS INFORMACIÓN</h2>
          <p>
            Para más información sobre el tratamiento de sus datos personales, consulte nuestra Política de Privacidad 
            disponible en [DOMINIO]/politica-privacidad.
          </p>
          <p>
            Si tiene cualquier duda sobre esta Política de Cookies, puede contactar con nosotros en [EMAIL].
          </p>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: [FECHA_ACTUALIZACIÓN]
          </p>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
