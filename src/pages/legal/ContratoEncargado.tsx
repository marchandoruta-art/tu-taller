import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ContratoEncargado() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 prose prose-slate dark:prose-invert">
          <h1>CONTRATO DE ENCARGADO DEL TRATAMIENTO</h1>
          <p className="text-lg font-medium">
            (Conforme al artículo 28 del Reglamento (UE) 2016/679 - RGPD)
          </p>
          
          <h2>REUNIDOS</h2>
          
          <h3>De una parte, como RESPONSABLE DEL TRATAMIENTO:</h3>
          <p>
            El Cliente que contrata los servicios de [NOMBRE_EMPRESA] a través de la plataforma [DOMINIO], 
            cuyos datos identificativos constan en el formulario de registro y en la cuenta de usuario.
          </p>
          <p>En adelante, "el Responsable" o "el Cliente".</p>

          <h3>De otra parte, como ENCARGADO DEL TRATAMIENTO:</h3>
          <ul>
            <li><strong>Denominación social:</strong> [NOMBRE_EMPRESA]</li>
            <li><strong>CIF/NIF:</strong> [CIF]</li>
            <li><strong>Domicilio social:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD], [PAÍS]</li>
            <li><strong>Correo electrónico:</strong> [EMAIL]</li>
          </ul>
          <p>En adelante, "el Encargado" o "[NOMBRE_EMPRESA]".</p>

          <p>
            Ambas partes se reconocen capacidad legal suficiente para contratar y obligarse y, a tal efecto,
          </p>

          <h2>EXPONEN</h2>
          <p>
            <strong>I.</strong> Que el Responsable desarrolla una actividad de taller mecánico y ha contratado 
            los servicios de [NOMBRE_EMPRESA] para la gestión informatizada de su negocio a través de la 
            plataforma [DOMINIO].
          </p>
          <p>
            <strong>II.</strong> Que para la prestación del servicio contratado, el Encargado tendrá acceso 
            a datos personales de clientes del Responsable.
          </p>
          <p>
            <strong>III.</strong> Que, conforme al artículo 28 del Reglamento (UE) 2016/679 del Parlamento 
            Europeo y del Consejo, de 27 de abril de 2016 (RGPD), es necesario regular las condiciones del 
            tratamiento de datos personales por parte del Encargado.
          </p>
          <p>
            <strong>IV.</strong> Que las partes acuerdan suscribir el presente Contrato de Encargado del 
            Tratamiento conforme a las siguientes
          </p>

          <h2>CLÁUSULAS</h2>

          <h3>PRIMERA. OBJETO DEL ENCARGO</h3>
          <p>
            Mediante el presente contrato, el Responsable encarga al Encargado el tratamiento de datos 
            personales necesario para la prestación del servicio de gestión de talleres mecánicos contratado.
          </p>
          <p>El tratamiento consistirá en:</p>
          <ul>
            <li>Almacenamiento de datos en la plataforma cloud</li>
            <li>Organización y estructuración de los datos</li>
            <li>Consulta y extracción de datos</li>
            <li>Comunicación por transmisión (entre dispositivos del Responsable)</li>
            <li>Conservación de los datos</li>
            <li>Supresión o destrucción de datos (a solicitud del Responsable o fin del contrato)</li>
          </ul>

          <h3>SEGUNDA. DATOS OBJETO DE TRATAMIENTO</h3>
          
          <h4>2.1. Categorías de interesados</h4>
          <ul>
            <li>Clientes del taller (propietarios de vehículos)</li>
            <li>Empleados del taller</li>
            <li>Contactos profesionales (proveedores, colaboradores)</li>
          </ul>

          <h4>2.2. Categorías de datos personales</h4>
          <ul>
            <li>Datos identificativos: nombre, apellidos, DNI/NIE/NIF, imagen</li>
            <li>Datos de contacto: dirección, teléfono, correo electrónico</li>
            <li>Datos económicos: datos de facturación</li>
            <li>Datos de los vehículos: matrícula, marca, modelo, VIN, historial de reparaciones</li>
            <li>Datos laborales (empleados): cargo, horarios, registros de actividad</li>
          </ul>

          <h4>2.3. Categorías especiales de datos</h4>
          <p>
            El Encargado NO tratará categorías especiales de datos (datos de salud, origen étnico, 
            orientación sexual, etc.). El Responsable se compromete a no introducir este tipo de datos 
            en la Plataforma.
          </p>

          <h3>TERCERA. DURACIÓN</h3>
          <p>
            El presente contrato tendrá la misma duración que la relación contractual principal derivada 
            de la contratación del servicio SaaS.
          </p>
          <p>
            Una vez finalizada la prestación del servicio, el Encargado procederá conforme a lo establecido 
            en la cláusula décima del presente contrato.
          </p>

          <h3>CUARTA. OBLIGACIONES DEL ENCARGADO</h3>
          <p>El Encargado se obliga a:</p>
          
          <p><strong>a)</strong> Utilizar los datos personales objeto de tratamiento únicamente para la 
          finalidad objeto del encargo y siguiendo las instrucciones documentadas del Responsable.</p>
          
          <p><strong>b)</strong> No aplicar o utilizar los datos con fines distintos a los establecidos 
          en este contrato, ni comunicarlos a terceras personas, salvo autorización expresa del Responsable 
          o en los casos legalmente establecidos.</p>
          
          <p><strong>c)</strong> Tratar los datos de acuerdo con las instrucciones del Responsable. Si el 
          Encargado considera que alguna instrucción infringe la normativa de protección de datos, lo 
          comunicará inmediatamente al Responsable.</p>
          
          <p><strong>d)</strong> Llevar por escrito un registro de todas las categorías de actividades de 
          tratamiento efectuadas por cuenta del Responsable, conforme al artículo 30.2 del RGPD.</p>
          
          <p><strong>e)</strong> No subcontratar ninguna de las prestaciones que formen parte del objeto 
          del presente contrato sin la autorización previa por escrito del Responsable. En caso de 
          autorización, el subencargado estará obligado por las mismas condiciones establecidas en este contrato.</p>
          
          <p><strong>f)</strong> Garantizar que las personas autorizadas para tratar datos personales se 
          comprometan, de forma expresa y por escrito, a respetar la confidencialidad y cumplir las medidas 
          de seguridad correspondientes.</p>
          
          <p><strong>g)</strong> Mantener a disposición del Responsable la documentación acreditativa del 
          cumplimiento de las obligaciones establecidas en este contrato.</p>
          
          <p><strong>h)</strong> Garantizar la formación necesaria en materia de protección de datos de las 
          personas autorizadas para tratar datos personales.</p>
          
          <p><strong>i)</strong> Asistir al Responsable en la respuesta al ejercicio de derechos de los 
          interesados, comunicándole cualquier solicitud recibida en el plazo máximo de 24 horas.</p>
          
          <p><strong>j)</strong> Notificar al Responsable, sin dilación indebida y en un plazo máximo de 
          24 horas, las violaciones de la seguridad de los datos de las que tenga conocimiento, junto con 
          toda la información relevante para la documentación y comunicación de la incidencia.</p>
          
          <p><strong>k)</strong> Asistir al Responsable en la realización de evaluaciones de impacto y 
          consultas previas a la autoridad de control, cuando proceda.</p>
          
          <p><strong>l)</strong> Poner a disposición del Responsable toda la información necesaria para 
          demostrar el cumplimiento de las obligaciones establecidas en el artículo 28 del RGPD y permitir 
          y contribuir a la realización de auditorías o inspecciones.</p>

          <h3>QUINTA. SUBENCARGADOS AUTORIZADOS</h3>
          <p>
            El Responsable autoriza expresamente al Encargado a subcontratar los siguientes servicios con 
            los siguientes subencargados:
          </p>
          <table>
            <thead>
              <tr>
                <th>Subencargado</th>
                <th>Servicio</th>
                <th>Ubicación</th>
                <th>Garantías</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supabase Inc.</td>
                <td>Infraestructura cloud y base de datos</td>
                <td>UE (Frankfurt)</td>
                <td>Cláusulas Contractuales Tipo</td>
              </tr>
              <tr>
                <td>Stripe Inc.</td>
                <td>Procesamiento de pagos</td>
                <td>UE/EE.UU.</td>
                <td>Data Privacy Framework</td>
              </tr>
            </tbody>
          </table>
          <p>
            El Encargado informará al Responsable de cualquier cambio en los subencargados con al menos 
            30 días de antelación, permitiéndole oponerse a dicho cambio.
          </p>

          <h3>SEXTA. MEDIDAS DE SEGURIDAD</h3>
          <p>
            El Encargado aplicará las medidas técnicas y organizativas apropiadas para garantizar un nivel 
            de seguridad adecuado al riesgo, conforme al artículo 32 del RGPD. Dichas medidas incluyen:
          </p>
          
          <h4>Medidas técnicas:</h4>
          <ul>
            <li>Cifrado de datos en tránsito (TLS/HTTPS)</li>
            <li>Cifrado de datos en reposo</li>
            <li>Seudonimización de datos cuando sea posible</li>
            <li>Control de acceso basado en roles</li>
            <li>Autenticación robusta con contraseñas cifradas</li>
            <li>Copias de seguridad periódicas</li>
            <li>Sistemas de detección de intrusiones</li>
            <li>Firewalls y segmentación de red</li>
            <li>Actualizaciones de seguridad regulares</li>
            <li>Monitorización de sistemas</li>
          </ul>

          <h4>Medidas organizativas:</h4>
          <ul>
            <li>Política de acceso basada en el principio de mínimo privilegio</li>
            <li>Formación del personal en protección de datos</li>
            <li>Acuerdos de confidencialidad con empleados</li>
            <li>Procedimiento de gestión de incidentes</li>
            <li>Plan de continuidad de negocio</li>
            <li>Evaluaciones periódicas de riesgos</li>
          </ul>

          <h3>SÉPTIMA. TRANSFERENCIAS INTERNACIONALES</h3>
          <p>
            En caso de que para la prestación del servicio sea necesaria la transferencia de datos a un 
            tercer país u organización internacional fuera del Espacio Económico Europeo, el Encargado 
            garantiza que dicha transferencia se realizará conforme a las garantías establecidas en el 
            Capítulo V del RGPD, mediante:
          </p>
          <ul>
            <li>Decisión de adecuación de la Comisión Europea</li>
            <li>Cláusulas Contractuales Tipo aprobadas por la Comisión Europea</li>
            <li>Normas corporativas vinculantes</li>
            <li>Certificación conforme al marco de privacidad de datos UE-EE.UU. (Data Privacy Framework)</li>
          </ul>

          <h3>OCTAVA. OBLIGACIONES DEL RESPONSABLE</h3>
          <p>El Responsable se obliga a:</p>
          <ul>
            <li>Entregar al Encargado los datos necesarios para la prestación del servicio</li>
            <li>Velar por el cumplimiento de la normativa de protección de datos respecto a los datos que trata</li>
            <li>Garantizar que ha obtenido el consentimiento de los interesados o cuenta con otra base legal para el tratamiento</li>
            <li>Informar adecuadamente a los interesados sobre el tratamiento de sus datos</li>
            <li>Atender las solicitudes de ejercicio de derechos de los interesados</li>
            <li>Pagar el precio del servicio conforme a las condiciones contratadas</li>
          </ul>

          <h3>NOVENA. DERECHOS DE LOS INTERESADOS</h3>
          <p>
            El Encargado asistirá al Responsable en la atención de las solicitudes de ejercicio de derechos 
            de los interesados (acceso, rectificación, supresión, portabilidad, limitación, oposición).
          </p>
          <p>
            Si el Encargado recibe una solicitud directa de un interesado, la remitirá al Responsable en un 
            plazo máximo de 24 horas, absteniéndose de responder directamente salvo instrucción expresa del Responsable.
          </p>
          <p>
            El Encargado proporcionará al Responsable las herramientas necesarias para que pueda extraer, 
            rectificar o suprimir los datos de los interesados cuando sea necesario.
          </p>

          <h3>DÉCIMA. DESTINO DE LOS DATOS A LA FINALIZACIÓN DEL CONTRATO</h3>
          <p>
            Una vez finalizada la relación contractual, el Encargado, a elección del Responsable:
          </p>
          <ul>
            <li><strong>a)</strong> Devolverá al Responsable todos los datos personales, poniéndolos a su disposición para su exportación en formato estructurado y de uso común.</li>
            <li><strong>b)</strong> Destruirá los datos personales una vez transcurrido un plazo de 30 días desde la finalización del contrato, salvo que exista obligación legal de conservarlos.</li>
          </ul>
          <p>
            El Responsable tendrá un plazo de 30 días desde la finalización del contrato para solicitar la 
            exportación de sus datos. Transcurrido dicho plazo sin solicitud, el Encargado procederá a la 
            destrucción de los datos.
          </p>
          <p>
            El Encargado certificará por escrito la destrucción de los datos cuando el Responsable lo solicite.
          </p>

          <h3>UNDÉCIMA. VIOLACIONES DE SEGURIDAD</h3>
          <p>
            En caso de que el Encargado tenga conocimiento de una violación de la seguridad de los datos 
            personales objeto de tratamiento, lo notificará al Responsable sin dilación indebida, y en 
            cualquier caso en un plazo máximo de 24 horas, por correo electrónico a la dirección proporcionada 
            por el Responsable.
          </p>
          <p>La notificación incluirá, como mínimo:</p>
          <ul>
            <li>Descripción de la naturaleza de la violación</li>
            <li>Categorías de datos y número aproximado de interesados afectados</li>
            <li>Datos de contacto del responsable de la gestión del incidente</li>
            <li>Consecuencias potenciales de la violación</li>
            <li>Medidas adoptadas o propuestas para remediar la violación</li>
          </ul>
          <p>
            El Encargado asistirá al Responsable en el cumplimiento de sus obligaciones de notificación a 
            la autoridad de control y, en su caso, comunicación a los interesados.
          </p>

          <h3>DUODÉCIMA. RESPONSABILIDAD</h3>
          <p>
            El Encargado será responsable de los daños y perjuicios causados por el tratamiento cuando haya 
            incumplido las obligaciones del RGPD específicamente dirigidas a los encargados o haya actuado 
            al margen o en contra de las instrucciones legítimas del Responsable.
          </p>
          <p>
            En caso de que el Encargado destine los datos a otras finalidades, los comunique o los utilice 
            incumpliendo las estipulaciones del contrato, será considerado Responsable del tratamiento y 
            responderá de las infracciones en que hubiera incurrido personalmente.
          </p>

          <h3>DECIMOTERCERA. CONFIDENCIALIDAD</h3>
          <p>
            El Encargado y todas las personas que intervengan en cualquier fase del tratamiento guardarán 
            secreto profesional sobre los datos de carácter personal objeto de tratamiento, manteniendo 
            absoluta confidencialidad y reserva sobre los mismos.
          </p>
          <p>
            Esta obligación de confidencialidad subsistirá incluso después de finalizada la relación 
            contractual.
          </p>

          <h3>DECIMOCUARTA. AUDITORÍAS</h3>
          <p>
            El Encargado pondrá a disposición del Responsable toda la información necesaria para demostrar 
            el cumplimiento de las obligaciones establecidas en este contrato y en el artículo 28 del RGPD.
          </p>
          <p>
            El Encargado permitirá y contribuirá a la realización de auditorías, incluidas inspecciones, 
            por parte del Responsable o de otro auditor autorizado por éste.
          </p>
          <p>
            Las auditorías se realizarán con un preaviso mínimo de 30 días, durante el horario laboral y 
            de forma que no interfieran en el normal funcionamiento del Encargado.
          </p>

          <h3>DECIMOQUINTA. MODIFICACIONES</h3>
          <p>
            Cualquier modificación del presente contrato requerirá el consentimiento de ambas partes y 
            deberá formalizarse por escrito.
          </p>

          <h3>DECIMOSEXTA. LEGISLACIÓN APLICABLE Y JURISDICCIÓN</h3>
          <p>
            El presente contrato se regirá e interpretará conforme a la legislación española y, en 
            particular, al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
          </p>
          <p>
            Para la resolución de cualquier controversia derivada del presente contrato, las partes se 
            someten a los Juzgados y Tribunales de [CIUDAD] (España).
          </p>

          <h3>DECIMOSÉPTIMA. ACEPTACIÓN</h3>
          <p>
            El presente Contrato de Encargado del Tratamiento forma parte integrante de los Términos y 
            Condiciones del servicio y se entiende aceptado por el Responsable en el momento de contratar 
            el servicio de [NOMBRE_EMPRESA].
          </p>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: [FECHA_ACTUALIZACIÓN]
          </p>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
