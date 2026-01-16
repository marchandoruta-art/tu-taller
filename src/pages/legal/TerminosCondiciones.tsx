import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TerminosCondiciones() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 prose prose-slate dark:prose-invert">
          <h1>TÉRMINOS Y CONDICIONES DE USO DEL SERVICIO</h1>
          
          <h2>1. IDENTIFICACIÓN DE LAS PARTES</h2>
          
          <h3>1.1. Prestador del Servicio</h3>
          <ul>
            <li><strong>Denominación social:</strong> [NOMBRE_EMPRESA]</li>
            <li><strong>CIF/NIF:</strong> [CIF]</li>
            <li><strong>Domicilio social:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD], [PAÍS]</li>
            <li><strong>Correo electrónico:</strong> [EMAIL]</li>
            <li><strong>Teléfono:</strong> [TELÉFONO]</li>
            <li><strong>Datos registrales:</strong> Inscrita en el Registro Mercantil de [CIUDAD], Tomo [TOMO], Folio [FOLIO], Hoja [HOJA]</li>
          </ul>
          <p>En adelante, "[NOMBRE_EMPRESA]" o "el Prestador".</p>

          <h3>1.2. Cliente</h3>
          <p>
            Persona física o jurídica que contrata los servicios de [NOMBRE_EMPRESA] mediante la aceptación de los 
            presentes Términos y Condiciones y el registro en la Plataforma.
          </p>
          <p>En adelante, "el Cliente" o "el Usuario".</p>

          <h2>2. OBJETO DEL CONTRATO</h2>
          <p>
            Los presentes Términos y Condiciones regulan la prestación por parte de [NOMBRE_EMPRESA] del servicio 
            de software como servicio (SaaS) de gestión de talleres mecánicos a través de la plataforma web 
            [DOMINIO] (en adelante, "la Plataforma" o "el Servicio").
          </p>
          <p>El Servicio incluye las siguientes funcionalidades principales:</p>
          <ul>
            <li>Gestión de clientes y propietarios de vehículos</li>
            <li>Gestión de vehículos y su información</li>
            <li>Gestión de órdenes de trabajo y reparaciones</li>
            <li>Control de inventario, piezas y recambios</li>
            <li>Gestión de empleados y equipos de trabajo</li>
            <li>Registro de tiempos de trabajo</li>
            <li>Facturación básica</li>
            <li>Histórico de intervenciones</li>
            <li>Generación de documentos (recibos de depósito, etc.)</li>
            <li>Comunicación con clientes</li>
            <li>Almacenamiento de archivos y fotografías</li>
          </ul>

          <h2>3. ACEPTACIÓN DE LOS TÉRMINOS</h2>
          <p>
            El acceso y uso de la Plataforma implica la aceptación plena y sin reservas de todos los términos y 
            condiciones recogidos en el presente documento, así como de la Política de Privacidad y la Política 
            de Cookies.
          </p>
          <p>
            Si el Cliente no está de acuerdo con alguna de las condiciones aquí establecidas, deberá abstenerse 
            de utilizar la Plataforma.
          </p>
          <p>
            [NOMBRE_EMPRESA] se reserva el derecho de modificar en cualquier momento los presentes Términos y 
            Condiciones, siendo efectivas dichas modificaciones desde su publicación en la Plataforma. El uso 
            continuado del Servicio tras la publicación de las modificaciones implicará la aceptación de las mismas.
          </p>

          <h2>4. REGISTRO Y CUENTA DE USUARIO</h2>
          
          <h3>4.1. Requisitos de registro</h3>
          <p>Para utilizar el Servicio, el Cliente deberá:</p>
          <ul>
            <li>Ser mayor de edad o representante legal de una empresa</li>
            <li>Proporcionar información veraz, exacta y completa durante el registro</li>
            <li>Mantener actualizada la información de su cuenta</li>
            <li>Aceptar los presentes Términos y Condiciones</li>
          </ul>

          <h3>4.2. Credenciales de acceso</h3>
          <p>
            El Cliente es responsable de mantener la confidencialidad de sus credenciales de acceso (correo 
            electrónico y contraseña) y de todas las actividades que se realicen bajo su cuenta.
          </p>
          <p>
            El Cliente deberá notificar inmediatamente a [NOMBRE_EMPRESA] cualquier uso no autorizado de su cuenta 
            o cualquier otra brecha de seguridad.
          </p>

          <h3>4.3. Organizaciones y equipos</h3>
          <p>
            El Cliente que registre una organización (taller) será considerado el administrador de la misma y 
            podrá invitar a otros usuarios a formar parte de su equipo, asignándoles diferentes roles y permisos.
          </p>
          <p>
            El administrador es responsable de las acciones realizadas por los miembros de su equipo dentro de 
            la Plataforma.
          </p>

          <h2>5. PLANES DE SUSCRIPCIÓN Y PRECIOS</h2>
          
          <h3>5.1. Modalidades de contratación</h3>
          <p>
            [NOMBRE_EMPRESA] ofrece diferentes planes de suscripción, cuyas características y precios están 
            disponibles en [DOMINIO]/precios. Los planes pueden incluir:
          </p>
          <ul>
            <li>Período de prueba gratuito (si aplica)</li>
            <li>Suscripción mensual</li>
            <li>Suscripción anual (con descuento)</li>
          </ul>

          <h3>5.2. Precios e impuestos</h3>
          <p>
            Los precios publicados no incluyen el Impuesto sobre el Valor Añadido (IVA) ni otros impuestos 
            aplicables, salvo que se indique expresamente lo contrario.
          </p>
          <p>
            [NOMBRE_EMPRESA] se reserva el derecho de modificar los precios en cualquier momento. Los cambios 
            de precio no afectarán a las suscripciones ya contratadas hasta su próxima renovación.
          </p>

          <h3>5.3. Facturación</h3>
          <p>
            La facturación se realizará por adelantado según el período de suscripción contratado (mensual o anual).
          </p>
          <p>
            El Cliente recibirá las facturas por correo electrónico en la dirección proporcionada durante el registro.
          </p>

          <h3>5.4. Método de pago</h3>
          <p>
            El pago se realizará mediante tarjeta de crédito/débito a través de la pasarela de pago segura Stripe. 
            El Cliente autoriza a [NOMBRE_EMPRESA] a realizar los cargos correspondientes a su método de pago 
            registrado.
          </p>

          <h3>5.5. Renovación automática</h3>
          <p>
            Las suscripciones se renovarán automáticamente al finalizar cada período de facturación, salvo que 
            el Cliente cancele la suscripción antes de la fecha de renovación.
          </p>

          <h2>6. CANCELACIÓN Y REEMBOLSOS</h2>
          
          <h3>6.1. Derecho de desistimiento</h3>
          <p>
            Conforme al artículo 103 del Real Decreto Legislativo 1/2007, el derecho de desistimiento no será 
            aplicable a los contratos de suministro de contenido digital que no se preste en un soporte material 
            cuando la ejecución haya comenzado con el previo consentimiento expreso del consumidor.
          </p>
          <p>
            No obstante, [NOMBRE_EMPRESA] ofrece un período de prueba gratuito de [DÍAS_PRUEBA] días para que 
            el Cliente pueda evaluar el Servicio antes de comprometerse con una suscripción de pago.
          </p>

          <h3>6.2. Cancelación por el Cliente</h3>
          <p>
            El Cliente puede cancelar su suscripción en cualquier momento desde el panel de configuración de su cuenta.
          </p>
          <p>
            La cancelación será efectiva al finalizar el período de facturación en curso. El Cliente mantendrá 
            acceso al Servicio hasta dicha fecha.
          </p>
          <p>
            No se realizarán reembolsos por los períodos de suscripción ya facturados, salvo en los casos 
            expresamente previstos en estos Términos.
          </p>

          <h3>6.3. Reembolsos</h3>
          <p>Se procederá al reembolso en los siguientes casos:</p>
          <ul>
            <li>Error de facturación imputable a [NOMBRE_EMPRESA]</li>
            <li>Incumplimiento grave del Servicio por parte de [NOMBRE_EMPRESA]</li>
            <li>Otros casos que [NOMBRE_EMPRESA] considere justificados a su exclusiva discreción</li>
          </ul>
          <p>
            Las solicitudes de reembolso deberán dirigirse a [EMAIL] en un plazo máximo de 14 días desde la 
            fecha de facturación.
          </p>

          <h3>6.4. Cancelación por [NOMBRE_EMPRESA]</h3>
          <p>[NOMBRE_EMPRESA] podrá cancelar la cuenta del Cliente en los siguientes casos:</p>
          <ul>
            <li>Impago de las cuotas de suscripción</li>
            <li>Incumplimiento de los presentes Términos y Condiciones</li>
            <li>Uso fraudulento o ilegal del Servicio</li>
            <li>Conducta que perjudique a otros usuarios o a la Plataforma</li>
          </ul>

          <h3>6.5. Efectos de la cancelación</h3>
          <p>Tras la cancelación de la cuenta:</p>
          <ul>
            <li>El Cliente perderá acceso a la Plataforma</li>
            <li>Los datos del Cliente serán conservados durante un período de 30 días, durante el cual podrá solicitar su exportación</li>
            <li>Transcurrido dicho plazo, los datos serán eliminados de forma permanente</li>
          </ul>

          <h2>7. NIVEL DE SERVICIO (SLA)</h2>
          
          <h3>7.1. Disponibilidad</h3>
          <p>
            [NOMBRE_EMPRESA] se compromete a mantener una disponibilidad del Servicio del 99,5% mensual, excluyendo:
          </p>
          <ul>
            <li>Mantenimientos programados, que serán notificados con al menos 48 horas de antelación</li>
            <li>Circunstancias de fuerza mayor</li>
            <li>Fallos atribuibles al Cliente o a terceros ajenos a [NOMBRE_EMPRESA]</li>
            <li>Actualizaciones de emergencia por motivos de seguridad</li>
          </ul>

          <h3>7.2. Soporte técnico</h3>
          <p>[NOMBRE_EMPRESA] ofrece soporte técnico a través de:</p>
          <ul>
            <li>Correo electrónico: [EMAIL_SOPORTE]</li>
            <li>Horario de atención: Lunes a Viernes de 9:00 a 18:00 (CET)</li>
            <li>Tiempo de respuesta objetivo: 24-48 horas laborables</li>
          </ul>

          <h3>7.3. Copias de seguridad</h3>
          <p>
            [NOMBRE_EMPRESA] realiza copias de seguridad automáticas de los datos con una frecuencia diaria. 
            Las copias se conservan durante un período de 30 días.
          </p>

          <h3>7.4. Compensaciones</h3>
          <p>
            En caso de incumplimiento del nivel de disponibilidad garantizado, el Cliente podrá solicitar una 
            compensación en forma de extensión del período de suscripción, proporcional al tiempo de indisponibilidad.
          </p>

          <h2>8. OBLIGACIONES DEL CLIENTE</h2>
          <p>El Cliente se compromete a:</p>
          <ul>
            <li>Utilizar el Servicio conforme a la legalidad vigente y los presentes Términos</li>
            <li>No utilizar el Servicio para fines ilegales, fraudulentos o que vulneren derechos de terceros</li>
            <li>No intentar acceder a sistemas o datos de otros usuarios</li>
            <li>No realizar actividades que puedan dañar, sobrecargar o perjudicar el funcionamiento de la Plataforma</li>
            <li>No copiar, modificar, distribuir o realizar ingeniería inversa del software</li>
            <li>Mantener la confidencialidad de sus credenciales de acceso</li>
            <li>Cumplir con la normativa de protección de datos respecto a los datos personales que trate a través de la Plataforma</li>
            <li>Obtener los consentimientos necesarios de sus clientes finales para el tratamiento de sus datos</li>
          </ul>

          <h2>9. PROPIEDAD INTELECTUAL</h2>
          
          <h3>9.1. Titularidad</h3>
          <p>
            [NOMBRE_EMPRESA] es titular de todos los derechos de propiedad intelectual e industrial sobre la 
            Plataforma, incluyendo el software, código fuente, diseño, estructura, bases de datos, logotipos, 
            marcas, nombres comerciales y cualquier otro contenido.
          </p>

          <h3>9.2. Licencia de uso</h3>
          <p>
            La contratación del Servicio otorga al Cliente una licencia de uso limitada, no exclusiva, 
            intransferible y revocable para utilizar la Plataforma conforme a los presentes Términos durante 
            la vigencia de la suscripción.
          </p>

          <h3>9.3. Prohibiciones</h3>
          <p>Queda expresamente prohibido:</p>
          <ul>
            <li>Copiar, modificar, adaptar o traducir el software</li>
            <li>Realizar ingeniería inversa, descompilar o desensamblar el software</li>
            <li>Crear obras derivadas basadas en el software</li>
            <li>Sublicenciar, alquilar, prestar o transferir el acceso a terceros</li>
            <li>Eliminar o alterar avisos de propiedad intelectual</li>
            <li>Utilizar el Servicio para desarrollar un producto o servicio competidor</li>
          </ul>

          <h3>9.4. Datos del Cliente</h3>
          <p>
            El Cliente conserva todos los derechos sobre los datos que introduzca en la Plataforma. El Cliente 
            otorga a [NOMBRE_EMPRESA] una licencia limitada para procesar dichos datos exclusivamente con el 
            fin de prestar el Servicio.
          </p>

          <h2>10. PROTECCIÓN DE DATOS</h2>
          
          <h3>10.1. Responsable del tratamiento</h3>
          <p>
            [NOMBRE_EMPRESA] actúa como Responsable del Tratamiento respecto a los datos del Cliente y sus 
            empleados necesarios para la gestión de la cuenta y la prestación del Servicio.
          </p>

          <h3>10.2. Encargado del tratamiento</h3>
          <p>
            [NOMBRE_EMPRESA] actúa como Encargado del Tratamiento respecto a los datos de los clientes finales 
            del taller que el Cliente introduzca en la Plataforma. Las condiciones de este encargo se regulan 
            en el Contrato de Encargado de Tratamiento disponible en [DOMINIO]/contrato-encargado.
          </p>

          <h3>10.3. Obligaciones del Cliente</h3>
          <p>El Cliente, como Responsable del Tratamiento de los datos de sus clientes finales, se compromete a:</p>
          <ul>
            <li>Obtener los consentimientos necesarios para el tratamiento de datos</li>
            <li>Informar adecuadamente a los interesados sobre el tratamiento</li>
            <li>Atender los derechos de los interesados</li>
            <li>Cumplir con la normativa de protección de datos aplicable</li>
          </ul>

          <h2>11. LIMITACIÓN DE RESPONSABILIDAD</h2>
          
          <h3>11.1. Exclusión de garantías</h3>
          <p>
            El Servicio se proporciona "tal cual" y "según disponibilidad". [NOMBRE_EMPRESA] no garantiza que 
            el Servicio sea ininterrumpido, oportuno, seguro o libre de errores.
          </p>

          <h3>11.2. Limitación de responsabilidad</h3>
          <p>
            En la máxima medida permitida por la ley, [NOMBRE_EMPRESA] no será responsable por daños indirectos, 
            incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de beneficios, datos, uso, 
            fondo de comercio u otras pérdidas intangibles.
          </p>
          <p>
            La responsabilidad total de [NOMBRE_EMPRESA] por cualquier reclamación derivada del Servicio estará 
            limitada al importe pagado por el Cliente durante los 12 meses anteriores al hecho que dio lugar 
            a la reclamación.
          </p>

          <h3>11.3. Exclusiones</h3>
          <p>Las limitaciones anteriores no serán aplicables en caso de:</p>
          <ul>
            <li>Dolo o culpa grave</li>
            <li>Daños personales</li>
            <li>Otros supuestos en que la ley no permita la limitación de responsabilidad</li>
          </ul>

          <h2>12. FUERZA MAYOR</h2>
          <p>
            [NOMBRE_EMPRESA] no será responsable del incumplimiento de sus obligaciones cuando este sea debido 
            a causas de fuerza mayor, incluyendo: catástrofes naturales, guerras, terrorismo, disturbios, 
            embargos, actos de autoridades, fallos de infraestructuras de telecomunicaciones, cortes de 
            suministro eléctrico, o cualquier otra circunstancia fuera de su control razonable.
          </p>

          <h2>13. CONFIDENCIALIDAD</h2>
          <p>
            Ambas partes se comprometen a mantener la confidencialidad de la información confidencial de la 
            otra parte a la que tengan acceso con motivo de la prestación del Servicio, no divulgándola a 
            terceros ni utilizándola para fines distintos a los previstos en este contrato.
          </p>
          <p>
            Esta obligación de confidencialidad permanecerá vigente incluso después de la terminación de la 
            relación contractual.
          </p>

          <h2>14. MODIFICACIÓN DE LOS TÉRMINOS</h2>
          <p>
            [NOMBRE_EMPRESA] se reserva el derecho de modificar los presentes Términos y Condiciones en 
            cualquier momento.
          </p>
          <p>
            Las modificaciones serán comunicadas al Cliente con al menos 30 días de antelación a su entrada 
            en vigor, mediante correo electrónico o aviso en la Plataforma.
          </p>
          <p>
            Si el Cliente no está de acuerdo con las modificaciones, podrá cancelar su suscripción antes de 
            que entren en vigor. El uso continuado del Servicio tras la entrada en vigor de las modificaciones 
            implicará la aceptación de las mismas.
          </p>

          <h2>15. CESIÓN</h2>
          <p>
            El Cliente no podrá ceder ni transferir sus derechos u obligaciones derivados de estos Términos 
            sin el consentimiento previo por escrito de [NOMBRE_EMPRESA].
          </p>
          <p>
            [NOMBRE_EMPRESA] podrá ceder libremente sus derechos y obligaciones a cualquier empresa del grupo 
            o en caso de fusión, adquisición o venta de activos, notificándolo al Cliente.
          </p>

          <h2>16. NULIDAD PARCIAL</h2>
          <p>
            Si cualquier cláusula de los presentes Términos fuese declarada nula o inaplicable, las demás 
            cláusulas permanecerán en pleno vigor y efecto.
          </p>

          <h2>17. RENUNCIA</h2>
          <p>
            El hecho de que [NOMBRE_EMPRESA] no ejerza o retrase el ejercicio de cualquier derecho o acción 
            no constituirá una renuncia al mismo.
          </p>

          <h2>18. LEGISLACIÓN APLICABLE Y JURISDICCIÓN</h2>
          <p>
            Los presentes Términos y Condiciones se regirán e interpretarán conforme a la legislación española.
          </p>
          <p>
            Para la resolución de cualquier controversia que pudiera derivarse del presente contrato, las 
            partes se someten expresamente a los Juzgados y Tribunales de la ciudad de [CIUDAD] (España), 
            con renuncia expresa a cualquier otro fuero que pudiera corresponderles.
          </p>
          <p>
            No obstante, cuando el Cliente tenga la condición de consumidor, serán competentes los tribunales 
            del lugar de residencia del consumidor.
          </p>

          <h2>19. RESOLUCIÓN ALTERNATIVA DE LITIGIOS</h2>
          <p>
            Conforme al Reglamento (UE) 524/2013, informamos de que la Comisión Europea facilita una plataforma 
            de resolución de litigios en línea disponible en: 
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>
          </p>

          <h2>20. CONTACTO</h2>
          <p>
            Para cualquier consulta relacionada con estos Términos y Condiciones, puede contactar con nosotros en:
          </p>
          <ul>
            <li><strong>Correo electrónico:</strong> [EMAIL]</li>
            <li><strong>Dirección postal:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD], [PAÍS]</li>
            <li><strong>Teléfono:</strong> [TELÉFONO]</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: [FECHA_ACTUALIZACIÓN]
          </p>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
