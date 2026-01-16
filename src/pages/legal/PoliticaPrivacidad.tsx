import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PoliticaPrivacidad() {
  return (
    <MainLayout>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto p-6 prose prose-slate dark:prose-invert">
          <h1>POLÍTICA DE PRIVACIDAD</h1>
          
          <h2>1. INFORMACIÓN AL USUARIO</h2>
          <p>
            [NOMBRE_EMPRESA], como Responsable del Tratamiento, le informa que, según lo dispuesto en el Reglamento 
            (UE) 2016/679, de 27 de abril (RGPD), la Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD), y demás 
            normativa legal vigente en materia de protección de datos personales, los datos personales recabados 
            a través de los formularios del Sitio Web, durante la navegación o mediante la utilización de los 
            servicios, serán tratados de conformidad con lo establecido en la presente Política de Privacidad.
          </p>

          <h2>2. IDENTIDAD DEL RESPONSABLE DEL TRATAMIENTO</h2>
          <ul>
            <li><strong>Denominación social:</strong> [NOMBRE_EMPRESA]</li>
            <li><strong>CIF/NIF:</strong> [CIF]</li>
            <li><strong>Domicilio:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD], [PAÍS]</li>
            <li><strong>Correo electrónico:</strong> [EMAIL]</li>
            <li><strong>Teléfono:</strong> [TELÉFONO]</li>
            <li><strong>Delegado de Protección de Datos (DPO):</strong> [EMAIL_DPO] (si aplica)</li>
          </ul>

          <h2>3. PRINCIPIOS APLICABLES AL TRATAMIENTO</h2>
          <p>
            El tratamiento de los datos personales se realizará conforme a los siguientes principios recogidos 
            en el artículo 5 del RGPD:
          </p>
          <ul>
            <li><strong>Principio de licitud, lealtad y transparencia:</strong> Se requerirá siempre el consentimiento del Usuario para el tratamiento de sus datos personales para uno o varios fines específicos.</li>
            <li><strong>Principio de minimización de datos:</strong> Solo se solicitarán datos estrictamente necesarios en relación con los fines para los que se requieren.</li>
            <li><strong>Principio de limitación del plazo de conservación:</strong> Los datos serán mantenidos durante no más tiempo del necesario.</li>
            <li><strong>Principio de integridad y confidencialidad:</strong> Los datos serán tratados de manera que se garantice su seguridad y confidencialidad.</li>
          </ul>

          <h2>4. CATEGORÍAS DE DATOS PERSONALES</h2>
          <p>Las categorías de datos que se tratan son:</p>
          
          <h3>4.1. Datos de identificación</h3>
          <p>Nombre, apellidos, DNI/NIE/NIF, imagen (en caso de foto de perfil).</p>
          
          <h3>4.2. Datos de contacto</h3>
          <p>Dirección postal, correo electrónico, teléfono.</p>
          
          <h3>4.3. Datos profesionales</h3>
          <p>Cargo, empresa, sector de actividad.</p>
          
          <h3>4.4. Datos económicos y de facturación</h3>
          <p>Datos bancarios, historial de pagos, datos fiscales.</p>
          
          <h3>4.5. Datos de navegación</h3>
          <p>Dirección IP, tipo de navegador, páginas visitadas, tiempo de permanencia.</p>
          
          <h3>4.6. Datos de uso del servicio</h3>
          <p>Registros de actividad, preferencias de configuración, histórico de acciones.</p>
          
          <p><strong>No se tratan categorías especiales de datos personales</strong> (aquellos que revelen origen étnico o racial, opiniones políticas, convicciones religiosas o filosóficas, afiliación sindical, datos genéticos, datos biométricos, datos relativos a la salud o a la vida sexual u orientación sexual).</p>

          <h2>5. FINALIDADES DEL TRATAMIENTO</h2>
          <p>Los datos personales son recabados y tratados para las siguientes finalidades:</p>

          <h3>5.1. Gestión de usuarios y prestación del servicio</h3>
          <ul>
            <li>Creación y gestión de cuentas de usuario</li>
            <li>Prestación del servicio SaaS contratado</li>
            <li>Gestión de la relación contractual</li>
            <li>Facturación y cobro de los servicios</li>
            <li>Soporte técnico y atención al cliente</li>
          </ul>
          <p><strong>Base legitimadora:</strong> Ejecución de un contrato (Art. 6.1.b RGPD)</p>

          <h3>5.2. Comunicaciones comerciales</h3>
          <ul>
            <li>Envío de newsletters y comunicaciones promocionales</li>
            <li>Información sobre nuevos productos, servicios o funcionalidades</li>
            <li>Encuestas de satisfacción</li>
          </ul>
          <p><strong>Base legitimadora:</strong> Consentimiento del interesado (Art. 6.1.a RGPD)</p>

          <h3>5.3. Cumplimiento de obligaciones legales</h3>
          <ul>
            <li>Cumplimiento de obligaciones fiscales y contables</li>
            <li>Atención a requerimientos de autoridades competentes</li>
            <li>Conservación de documentación mercantil</li>
          </ul>
          <p><strong>Base legitimadora:</strong> Cumplimiento de obligación legal (Art. 6.1.c RGPD)</p>

          <h3>5.4. Mejora del servicio</h3>
          <ul>
            <li>Análisis de uso de la plataforma</li>
            <li>Desarrollo de nuevas funcionalidades</li>
            <li>Personalización de la experiencia de usuario</li>
          </ul>
          <p><strong>Base legitimadora:</strong> Interés legítimo (Art. 6.1.f RGPD)</p>

          <h3>5.5. Seguridad</h3>
          <ul>
            <li>Prevención de fraude y uso indebido</li>
            <li>Protección de los sistemas y datos</li>
            <li>Investigación de incidentes de seguridad</li>
          </ul>
          <p><strong>Base legitimadora:</strong> Interés legítimo (Art. 6.1.f RGPD)</p>

          <h2>6. CONSERVACIÓN DE LOS DATOS</h2>
          <p>Los datos personales serán conservados durante los siguientes plazos:</p>
          <table>
            <thead>
              <tr>
                <th>Categoría de datos</th>
                <th>Plazo de conservación</th>
                <th>Criterio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Datos de cuenta de usuario</td>
                <td>Duración de la relación contractual + 5 años</td>
                <td>Prescripción de acciones contractuales</td>
              </tr>
              <tr>
                <td>Datos de facturación</td>
                <td>6 años desde el último asiento</td>
                <td>Art. 30 Código de Comercio</td>
              </tr>
              <tr>
                <td>Datos fiscales</td>
                <td>4 años</td>
                <td>Art. 66 Ley General Tributaria</td>
              </tr>
              <tr>
                <td>Comunicaciones comerciales</td>
                <td>Hasta revocación del consentimiento</td>
                <td>Consentimiento del interesado</td>
              </tr>
              <tr>
                <td>Registros de actividad (logs)</td>
                <td>12 meses</td>
                <td>Art. 25 LSSI-CE</td>
              </tr>
              <tr>
                <td>Datos de navegación (cookies)</td>
                <td>Según tipo de cookie (ver Política de Cookies)</td>
                <td>Guía AEPD</td>
              </tr>
            </tbody>
          </table>
          <p>
            Transcurridos los plazos indicados, los datos serán suprimidos o, en su caso, anonimizados para fines 
            estadísticos o de mejora del servicio.
          </p>

          <h2>7. DESTINATARIOS DE LOS DATOS</h2>
          <p>Los datos personales podrán ser comunicados a los siguientes destinatarios:</p>

          <h3>7.1. Encargados del tratamiento</h3>
          <p>
            Se ha suscrito contrato de encargado del tratamiento con los siguientes proveedores que acceden a 
            datos personales para la prestación del servicio:
          </p>
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
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
              <tr>
                <td>Resend Inc. (si aplica)</td>
                <td>Envío de correos electrónicos</td>
                <td>EE.UU.</td>
                <td>Data Privacy Framework</td>
              </tr>
              <tr>
                <td>Vercel Inc. (si aplica)</td>
                <td>Hosting y distribución</td>
                <td>Global (Edge)</td>
                <td>Data Privacy Framework</td>
              </tr>
            </tbody>
          </table>

          <h3>7.2. Autoridades públicas</h3>
          <p>
            Los datos podrán ser comunicados a autoridades públicas (Agencia Tributaria, juzgados, fuerzas de 
            seguridad) cuando exista obligación legal.
          </p>

          <h3>7.3. Otros destinatarios</h3>
          <p>No se realizarán cesiones de datos a terceros salvo obligación legal o consentimiento del interesado.</p>

          <h2>8. TRANSFERENCIAS INTERNACIONALES DE DATOS</h2>
          <p>
            Algunos de nuestros proveedores de servicios se encuentran ubicados fuera del Espacio Económico Europeo (EEE). 
            En estos casos, garantizamos que las transferencias internacionales de datos se realizan con las 
            garantías adecuadas conforme al RGPD:
          </p>
          <ul>
            <li><strong>Decisión de adecuación:</strong> Países con nivel de protección equivalente reconocido por la Comisión Europea.</li>
            <li><strong>Data Privacy Framework UE-EE.UU.:</strong> Para proveedores estadounidenses certificados en el marco de privacidad de datos UE-EE.UU.</li>
            <li><strong>Cláusulas Contractuales Tipo:</strong> Aprobadas por la Comisión Europea conforme a la Decisión de Ejecución (UE) 2021/914.</li>
          </ul>
          <p>Puede solicitar información adicional sobre las garantías aplicadas contactando a [EMAIL].</p>

          <h2>9. DERECHOS DE LOS INTERESADOS</h2>
          <p>El Usuario puede ejercer los siguientes derechos:</p>

          <h3>9.1. Derecho de acceso (Art. 15 RGPD)</h3>
          <p>Derecho a obtener confirmación de si se están tratando o no datos personales y, en tal caso, acceder a los mismos.</p>

          <h3>9.2. Derecho de rectificación (Art. 16 RGPD)</h3>
          <p>Derecho a obtener la rectificación de los datos personales inexactos o incompletos.</p>

          <h3>9.3. Derecho de supresión (Art. 17 RGPD)</h3>
          <p>Derecho a obtener la supresión de los datos personales cuando concurran las circunstancias previstas legalmente.</p>

          <h3>9.4. Derecho a la limitación del tratamiento (Art. 18 RGPD)</h3>
          <p>Derecho a obtener la limitación del tratamiento de los datos cuando se cumplan determinadas condiciones.</p>

          <h3>9.5. Derecho a la portabilidad de los datos (Art. 20 RGPD)</h3>
          <p>Derecho a recibir los datos personales en un formato estructurado, de uso común y lectura mecánica, y a transmitirlos a otro responsable.</p>

          <h3>9.6. Derecho de oposición (Art. 21 RGPD)</h3>
          <p>Derecho a oponerse al tratamiento de sus datos personales, incluida la elaboración de perfiles.</p>

          <h3>9.7. Derecho a no ser objeto de decisiones automatizadas (Art. 22 RGPD)</h3>
          <p>Derecho a no ser objeto de una decisión basada únicamente en el tratamiento automatizado, incluida la elaboración de perfiles.</p>

          <h3>9.8. Derecho a retirar el consentimiento</h3>
          <p>Cuando la base legitimadora sea el consentimiento, el Usuario podrá retirarlo en cualquier momento sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada.</p>

          <h3>Ejercicio de derechos</h3>
          <p>
            Para ejercer cualquiera de estos derechos, el Usuario puede dirigirse a [NOMBRE_EMPRESA] mediante:
          </p>
          <ul>
            <li><strong>Correo electrónico:</strong> [EMAIL] (indicando en el asunto "Ejercicio de derechos RGPD")</li>
            <li><strong>Correo postal:</strong> [DIRECCIÓN], [CÓDIGO_POSTAL] [CIUDAD]</li>
          </ul>
          <p>
            La solicitud deberá incluir copia de DNI o documento identificativo equivalente, indicación del derecho 
            que se ejerce y, en su caso, documentación que fundamente la petición.
          </p>
          <p>
            El plazo máximo para resolver es de un mes desde la recepción de la solicitud, pudiendo prorrogarse 
            otros dos meses en caso de solicitudes complejas o numerosas.
          </p>

          <h3>Derecho a presentar reclamación</h3>
          <p>
            Si el Usuario considera que el tratamiento de sus datos personales infringe la normativa, puede presentar 
            una reclamación ante la Agencia Española de Protección de Datos (AEPD):
          </p>
          <ul>
            <li><strong>Dirección:</strong> C/ Jorge Juan, 6, 28001 Madrid</li>
            <li><strong>Web:</strong> <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a></li>
          </ul>

          <h2>10. SEGURIDAD DE LOS DATOS</h2>
          <p>
            [NOMBRE_EMPRESA] ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad 
            e integridad de los datos personales, evitando su alteración, pérdida, tratamiento o acceso no autorizado.
          </p>
          
          <h3>10.1. Medidas técnicas</h3>
          <ul>
            <li>Cifrado de datos en tránsito mediante protocolo TLS/HTTPS</li>
            <li>Cifrado de datos en reposo en las bases de datos</li>
            <li>Sistemas de autenticación robustos con contraseñas cifradas</li>
            <li>Copias de seguridad periódicas y automatizadas</li>
            <li>Sistemas de detección y prevención de intrusiones</li>
            <li>Firewalls y segmentación de redes</li>
            <li>Actualizaciones de seguridad periódicas</li>
            <li>Monitorización continua de sistemas</li>
          </ul>

          <h3>10.2. Medidas organizativas</h3>
          <ul>
            <li>Políticas de acceso basadas en el principio de mínimo privilegio</li>
            <li>Formación del personal en protección de datos</li>
            <li>Acuerdos de confidencialidad con empleados y colaboradores</li>
            <li>Procedimientos de gestión de incidentes de seguridad</li>
            <li>Evaluaciones periódicas de riesgos</li>
            <li>Auditorías de seguridad</li>
          </ul>

          <h2>11. BRECHAS DE SEGURIDAD</h2>
          <p>
            En caso de producirse una violación de la seguridad de los datos personales que constituya un riesgo 
            para los derechos y libertades de las personas físicas, [NOMBRE_EMPRESA]:
          </p>
          <ul>
            <li>Notificará la brecha a la Agencia Española de Protección de Datos en un plazo máximo de 72 horas desde su conocimiento.</li>
            <li>Cuando la brecha suponga un alto riesgo para los derechos y libertades de los afectados, les comunicará la incidencia sin dilación indebida.</li>
            <li>Documentará internamente cualquier brecha de seguridad, incluyendo sus efectos y las medidas correctivas adoptadas.</li>
          </ul>

          <h2>12. DATOS DE MENORES</h2>
          <p>
            Los servicios de [NOMBRE_EMPRESA] están dirigidos a profesionales y empresas, no a menores de edad. 
            No se recaban conscientemente datos de menores de 16 años. Si se detectase que se han recabado datos 
            de un menor sin el consentimiento de sus padres o tutores, se procederá a su supresión inmediata.
          </p>

          <h2>13. MODIFICACIONES DE LA POLÍTICA DE PRIVACIDAD</h2>
          <p>
            [NOMBRE_EMPRESA] se reserva el derecho a modificar la presente Política de Privacidad para adaptarla 
            a novedades legislativas, jurisprudenciales o de práctica empresarial. En dichos supuestos, se anunciará 
            en el Sitio Web los cambios introducidos con razonable antelación a su puesta en práctica.
          </p>
          <p>
            Se recomienda revisar periódicamente esta Política de Privacidad para estar informado de cómo se 
            protegen los datos personales.
          </p>

          <p className="text-sm text-muted-foreground mt-8">
            Última actualización: [FECHA_ACTUALIZACIÓN]
          </p>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
