import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  RegistroJornada, formatearDuracion, sumarMinutos,
  esFabricado, esCorregido, estaAbierto,
} from '@/lib/jornada';

interface Props {
  registros: RegistroJornada[];
  nombreTrabajador: string;
  nombreTaller: string;
  desde: Date;
  hasta: Date;
}

/**
 * El documento que se lleva el trabajador. Vive oculto en la pagina y solo
 * aparece al imprimir (ver `.registro-imprimible` en index.css).
 *
 * Se monta con un portal directamente en <body>: al imprimir se coloca desde el
 * origen de la hoja, y si quedara dentro del layout heredaria el desplazamiento
 * de cualquier contenedor posicionado por encima.
 *
 * Lleva a proposito la fecha de expedicion y la advertencia de las jornadas
 * generadas automaticamente: si alguien compara este papel con las horas
 * reales, tiene que quedar claro cuales no las marco una persona.
 */
export function RegistroImprimible({
  registros, nombreTrabajador, nombreTaller, desde, hasta,
}: Props) {
  const { t } = useTranslation();

  const total = sumarMinutos(registros);
  const fabricados = registros.filter(esFabricado).length;
  const corregidos = registros.filter(esCorregido).length;

  const fecha = (iso: string) => format(new Date(iso), "dd/MM/yyyy", { locale: es });
  const hora = (iso: string | null) => (iso ? format(new Date(iso), 'HH:mm', { locale: es }) : '—');

  return createPortal(
    <div className="registro-imprimible">
      <h1 style={{ fontSize: '16pt', margin: '0 0 4pt' }}>
        {t('jornadaUI.documento.titulo')}
      </h1>
      <p style={{ margin: '0 0 12pt', fontSize: '10pt' }}>
        {t('jornadaUI.documento.amparo')}
      </p>

      <table style={{ width: '100%', marginBottom: '12pt', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ width: '22%' }}><strong>{t('jornadaUI.documento.taller')}</strong></td>
            <td>{nombreTaller}</td>
          </tr>
          <tr>
            <td><strong>{t('jornadaUI.documento.trabajador')}</strong></td>
            <td>{nombreTrabajador}</td>
          </tr>
          <tr>
            <td><strong>{t('jornadaUI.documento.periodo')}</strong></td>
            <td>{fecha(desde.toISOString())} — {fecha(hasta.toISOString())}</td>
          </tr>
          <tr>
            <td><strong>{t('jornadaUI.documento.expedido')}</strong></td>
            <td>{format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</td>
          </tr>
        </tbody>
      </table>

      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}
        cellPadding={4}
      >
        <thead>
          <tr style={{ borderBottom: '1.5px solid #000' }}>
            <th style={{ textAlign: 'left' }}>{t('jornadaUI.tabla.dia')}</th>
            <th style={{ textAlign: 'left' }}>{t('jornadaUI.tabla.entrada')}</th>
            <th style={{ textAlign: 'left' }}>{t('jornadaUI.tabla.salida')}</th>
            <th style={{ textAlign: 'right' }}>{t('jornadaUI.tabla.total')}</th>
            <th style={{ textAlign: 'left' }}>{t('jornadaUI.tabla.procedencia')}</th>
          </tr>
        </thead>
        <tbody>
          {registros.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: '8pt 0' }}>
                {t('jornadaUI.documento.sinRegistros')}
              </td>
            </tr>
          )}
          {registros.map((r) => (
            <tr key={r.id} style={{ borderBottom: '0.5px solid #999' }}>
              <td>{fecha(r.clock_in)}</td>
              <td>{hora(r.clock_in)}</td>
              <td>{hora(r.clock_out)}</td>
              <td style={{ textAlign: 'right' }}>
                {estaAbierto(r) ? t('jornadaUI.tabla.sinCerrar') : formatearDuracion(r.total_minutes)}
              </td>
              <td>
                {esFabricado(r) && '(*) '}
                {t(
                  esFabricado(r) ? 'jornadaUI.origen.automatico'
                  : esCorregido(r) ? 'jornadaUI.origen.correccion'
                  : estaAbierto(r) ? 'jornadaUI.origen.abierta'
                  : 'jornadaUI.origen.trabajador'
                )}
                {r.motivo ? ` — ${r.motivo}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1.5px solid #000', fontWeight: 'bold' }}>
            <td colSpan={3}>{t('jornadaUI.documento.totalPeriodo')}</td>
            <td style={{ textAlign: 'right' }}>{formatearDuracion(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      {fabricados > 0 && (
        <p style={{ marginTop: '12pt', fontSize: '9pt' }}>
          <strong>(*)</strong> {t('jornadaUI.documento.avisoFabricado', { count: fabricados })}
        </p>
      )}
      {corregidos > 0 && (
        <p style={{ marginTop: '4pt', fontSize: '9pt' }}>
          {t('jornadaUI.documento.avisoCorregido', { count: corregidos })}
        </p>
      )}

      <p style={{ marginTop: '16pt', fontSize: '9pt' }}>
        {t('jornadaUI.documento.conservacion')}
      </p>
    </div>,
    document.body,
  );
}
