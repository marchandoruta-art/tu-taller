import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AvisoLegal() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 prose prose-slate dark:prose-invert">
          <h1>AVISO LEGAL</h1>
          
          <h2>1. DATOS IDENTIFICATIVOS DEL TITULAR</h2>
          <p>
            En cumplimiento del deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, 
            de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), a continuación se 
            reflejan los siguientes datos:
          </p>
          <ul>
            <li><strong>Denominación social:</strong> [NOMBRE_EMPRESA]</li>
            <li><strong>CIF/NIF:</strong> [CIF]</li>
            <li><strong>Domicilio social:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD], [PAÍS]</li>
            <li><strong>Correo electrónico:</strong> [EMAIL]</li>
            <li><strong>Teléfono:</strong> [TELÉFONO]</li>
            <li><strong>Sitio web:</strong> [DOMINIO]</li>
            <li><strong>Datos registrales:</strong> Inscrita en el Registro Mercantil de [CIUDAD], Tomo [TOMO], Folio [FOLIO], Hoja [HOJA], Inscripción [INSCRIPCIÓN]</li>
          </ul>

          <h2>2. OBJETO Y ÁMBITO DE APLICACIÓN</h2>
          <p>
            El presente Aviso Legal regula el uso del sitio web [DOMINIO] (en adelante, "el Sitio Web" o "la Plataforma"), 
            del que es titular [NOMBRE_EMPRESA] (en adelante, "el Titular" o "la Empresa").
          </p>
          <p>
            La navegación, acceso y uso del Sitio Web confiere la condición de usuario (en adelante, "el Usuario"), 
            e implica la aceptación, desde dicha navegación, de todas las condiciones establecidas en el presente 
            Aviso Legal, así como de cualesquiera otras disposiciones legales que resultaran de aplicación.
          </p>
          <p>
            El Titular se reserva el derecho de modificar cualquier tipo de información que pudiera aparecer en el 
            Sitio Web, sin que exista obligación de preavisar o poner en conocimiento de los Usuarios dichas 
            obligaciones, entendiéndose como suficiente la publicación en el Sitio Web del Titular.
          </p>

          <h2>3. DESCRIPCIÓN DEL SERVICIO</h2>
          <p>
            [NOMBRE_EMPRESA] ofrece una plataforma de software como servicio (SaaS) destinada a la gestión integral 
            de talleres mecánicos, que incluye, entre otras funcionalidades:
          </p>
          <ul>
            <li>Gestión de clientes y vehículos</li>
            <li>Gestión de órdenes de trabajo y reparaciones</li>
            <li>Control de inventario y piezas</li>
            <li>Facturación y gestión económica básica</li>
            <li>Gestión de empleados y equipos de trabajo</li>
            <li>Histórico de intervenciones y documentación</li>
            <li>Comunicación con clientes</li>
            <li>Generación de documentos e informes</li>
          </ul>

          <h2>4. CONDICIONES DE ACCESO Y USO</h2>
          
          <h3>4.1. Carácter gratuito del acceso y uso del Sitio Web</h3>
          <p>
            El acceso al Sitio Web es gratuito. No obstante, el uso de determinados servicios y contenidos 
            requiere la contratación de una suscripción de pago según las tarifas vigentes publicadas en la Plataforma.
          </p>

          <h3>4.2. Registro de Usuario</h3>
          <p>
            Con carácter general, para el acceso a los servicios de la Plataforma será necesario el registro previo 
            del Usuario, la aceptación de los Términos y Condiciones de uso y la contratación del plan de suscripción correspondiente.
          </p>

          <h3>4.3. Veracidad de la información</h3>
          <p>
            El Usuario garantiza la autenticidad y actualidad de todos aquellos datos que comunique y será el único 
            responsable de las manifestaciones falsas o inexactas que realice.
          </p>

          <h3>4.4. Obligaciones del Usuario</h3>
          <p>El Usuario se compromete a:</p>
          <ul>
            <li>Hacer un uso lícito, diligente, honrado y correcto de cuanta información o contenido tenga acceso a través del Sitio Web.</li>
            <li>No utilizar el servicio para actividades contrarias a la ley, la moral, el orden público o las presentes condiciones.</li>
            <li>No introducir o difundir virus informáticos o cualesquiera otros sistemas que sean susceptibles de provocar daños.</li>
            <li>No intentar acceder a áreas restringidas de los sistemas informáticos del Titular o de terceros.</li>
            <li>No suplantar la identidad de otro usuario.</li>
            <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
          </ul>

          <h2>5. EXCLUSIÓN DE GARANTÍAS Y RESPONSABILIDAD</h2>
          
          <h3>5.1. Disponibilidad del servicio</h3>
          <p>
            El Titular no garantiza la disponibilidad y continuidad del funcionamiento del Sitio Web y de los Servicios. 
            Cuando ello sea razonablemente posible, el Titular advertirá previamente de las interrupciones en el 
            funcionamiento del Sitio Web y de los Servicios.
          </p>

          <h3>5.2. Contenidos</h3>
          <p>
            El Titular no garantiza la ausencia de errores en los contenidos, ni que estos se encuentren actualizados, 
            aunque desarrollará sus mejores esfuerzos para, en su caso, evitarlos, subsanarlos o actualizarlos.
          </p>

          <h3>5.3. Virus y otros elementos dañinos</h3>
          <p>
            El Titular no garantiza la ausencia de virus ni de otros elementos en los Servicios prestados por terceros 
            a través del Sitio Web que puedan producir alteraciones en el sistema informático del Usuario.
          </p>

          <h3>5.4. Uso indebido</h3>
          <p>
            El Titular no se hace responsable de los daños y perjuicios de toda naturaleza que pudieran derivarse del 
            uso ilícito o indebido del Sitio Web.
          </p>

          <h2>6. PROPIEDAD INTELECTUAL E INDUSTRIAL</h2>
          
          <h3>6.1. Derechos del Titular</h3>
          <p>
            Todos los contenidos del Sitio Web, incluyendo, sin carácter limitativo, textos, fotografías, gráficos, 
            imágenes, iconos, tecnología, software, enlaces y demás contenidos audiovisuales o sonoros, así como su 
            diseño gráfico y códigos fuente, son propiedad intelectual del Titular o de terceros, sin que puedan 
            entenderse cedidos al Usuario ninguno de los derechos de explotación sobre los mismos más allá de lo 
            estrictamente necesario para el correcto uso del Sitio Web.
          </p>

          <h3>6.2. Marcas</h3>
          <p>
            Las marcas, nombres comerciales o signos distintivos son titularidad del Titular o terceros, sin que 
            pueda entenderse que el acceso al Sitio Web atribuye ningún derecho sobre los mismos.
          </p>

          <h3>6.3. Prohibiciones</h3>
          <p>
            Queda expresamente prohibida la reproducción, distribución, comunicación pública, transformación o 
            cualquier otra forma de explotación de los contenidos del Sitio Web, salvo autorización expresa y 
            por escrito del Titular.
          </p>

          <h3>6.4. Propiedad del Software</h3>
          <p>
            El software que compone la Plataforma, incluyendo su código fuente, arquitectura, diseño, funcionalidades, 
            interfaces, bases de datos y documentación técnica, son propiedad exclusiva del Titular y están protegidos 
            por las leyes de propiedad intelectual e industrial aplicables, incluyendo el Real Decreto Legislativo 
            1/1996, de 12 de abril, por el que se aprueba el texto refundido de la Ley de Propiedad Intelectual.
          </p>
          <p>
            La contratación de los servicios no implica en ningún caso la cesión, licencia o transmisión de derechos 
            de propiedad intelectual sobre el software, otorgándose únicamente un derecho de uso limitado, no exclusivo, 
            intransferible y revocable durante la vigencia de la suscripción contratada.
          </p>

          <h2>7. ENLACES (LINKS)</h2>
          
          <h3>7.1. Enlaces a terceros</h3>
          <p>
            En el caso de que en el Sitio Web se dispusiesen enlaces o hipervínculos hacia otros sitios de Internet, 
            el Titular no ejercerá ningún tipo de control sobre dichos sitios y contenidos. En ningún caso el Titular 
            asumirá responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno.
          </p>

          <h3>7.2. Enlaces desde terceros</h3>
          <p>
            Si cualquier Usuario, entidad o sitio web desease establecer algún tipo de enlace con destino al Sitio Web, 
            deberá atenerse a las siguientes estipulaciones:
          </p>
          <ul>
            <li>El enlace solamente se podrá dirigir a la página principal o Home del Sitio Web.</li>
            <li>El enlace debe ser absoluto y completo.</li>
            <li>En ningún caso, salvo autorización expresa, podrá reproducir el Sitio Web.</li>
            <li>No se creará un browser o border environment sobre las páginas del Sitio Web.</li>
            <li>No se realizarán manifestaciones o indicaciones falsas, inexactas o incorrectas sobre el Titular.</li>
          </ul>

          <h2>8. PROTECCIÓN DE DATOS</h2>
          <p>
            Para más información sobre el tratamiento de datos personales, consulte nuestra Política de Privacidad 
            disponible en [DOMINIO]/politica-privacidad.
          </p>

          <h2>9. COOKIES</h2>
          <p>
            Para más información sobre el uso de cookies, consulte nuestra Política de Cookies disponible en 
            [DOMINIO]/politica-cookies.
          </p>

          <h2>10. LEGISLACIÓN APLICABLE Y JURISDICCIÓN</h2>
          <p>
            Las presentes condiciones se regirán por la legislación española. Para la resolución de cualquier 
            controversia que pudiera derivarse del acceso o uso del Sitio Web, el Titular y el Usuario acuerdan 
            someterse expresamente a los Juzgados y Tribunales de la ciudad de [CIUDAD] (España), con renuncia 
            expresa a cualquier otro fuero que pudiera corresponderles.
          </p>
          <p>
            No obstante lo anterior, cuando el Usuario tenga la condición de consumidor conforme a la legislación 
            aplicable, serán competentes los juzgados y tribunales del lugar de residencia del consumidor.
          </p>

          <h2>11. RESOLUCIÓN ALTERNATIVA DE LITIGIOS</h2>
          <p>
            De conformidad con el Reglamento (UE) 524/2013 del Parlamento Europeo y del Consejo, de 21 de mayo de 2013, 
            se informa de que la Comisión Europea facilita una plataforma de resolución de litigios en línea, disponible 
            en: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>
          </p>

          <h2>12. NULIDAD E INEFICACIA DE LAS CLÁUSULAS</h2>
          <p>
            Si cualquier cláusula incluida en el presente Aviso Legal fuese declarada total o parcialmente nula o 
            ineficaz, tal nulidad o ineficacia tan sólo afectará a dicha disposición o a la parte de la misma que 
            resulte nula o ineficaz, subsistiendo el presente Aviso Legal en todo lo demás.
          </p>

          <h2>13. MODIFICACIONES</h2>
          <p>
            El Titular se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas 
            en el Sitio Web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a 
            través del mismo como la forma en la que éstos aparezcan presentados o localizados.
          </p>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: [FECHA_ACTUALIZACIÓN]
          </p>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
