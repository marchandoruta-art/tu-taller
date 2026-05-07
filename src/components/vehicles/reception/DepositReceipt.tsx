import { Button } from '@/components/ui/button';
import { FileText, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExteriorDamage } from './VehicleDiagram';
import type { InteriorCheckData } from './InteriorChecklist';

interface DepositReceiptProps {
  ownerData: {
    name: string;
    phone: string;
    email: string;
    dni: string;
    address: string;
  };
  vehicleData: {
    plate: string;
    brand: string;
    model: string;
    year: string;
    color: string;
    vin: string;
    client_description: string;
  };
  inspectionData: {
    fuel_level: number;
    mileage: string;
    exterior_damages: ExteriorDamage[];
    interior_check: InteriorCheckData;
    client_belongings: string;
    reception_notes: string;
    client_signature: string;
  };
}

const VEHICLE_ZONES: Record<string, string> = {
  front_bumper: 'Parachoques delantero',
  rear_bumper: 'Parachoques trasero',
  front_left_fender: 'Aleta delantera izquierda',
  front_right_fender: 'Aleta delantera derecha',
  rear_left_fender: 'Aleta trasera izquierda',
  rear_right_fender: 'Aleta trasera derecha',
  left_door_front: 'Puerta delantera izquierda',
  left_door_rear: 'Puerta trasera izquierda',
  right_door_front: 'Puerta delantera derecha',
  right_door_rear: 'Puerta trasera derecha',
  hood: 'Capó',
  trunk: 'Maletero',
  roof: 'Techo',
  windshield: 'Parabrisas',
  rear_window: 'Luneta trasera',
  left_mirror: 'Retrovisor izquierdo',
  right_mirror: 'Retrovisor derecho',
  wheel_fl: 'Rueda delantera izquierda',
  wheel_fr: 'Rueda delantera derecha',
  wheel_rl: 'Rueda trasera izquierda',
  wheel_rr: 'Rueda trasera derecha',
};

const INTERIOR_LABELS: Record<string, string> = {
  spare_wheel: 'Rueda de repuesto',
  jack: 'Gato',
  tools: 'Herramientas',
  warning_triangle: 'Triángulos de emergencia',
  first_aid_kit: 'Botiquín',
  fire_extinguisher: 'Extintor',
  radio: 'Radio/Navegador',
  navigation: 'Sistema navegación',
  floor_mats: 'Alfombrillas',
  antenna: 'Antena',
  documents: 'Documentación vehículo',
};

export function DepositReceipt({ ownerData, vehicleData, inspectionData }: DepositReceiptProps) {
  const generateReceiptHTML = () => {
    const now = new Date();
    const formattedDate = format(now, "d 'de' MMMM 'de' yyyy", { locale: es });
    const formattedTime = format(now, 'HH:mm');
    const esc = (s: unknown): string =>
      String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string));
    const escAttr = (s: unknown): string => esc(s);

    const checkedItems = Object.entries(inspectionData.interior_check)
      .filter(([key, value]) => key !== 'keys_count' && value === true)
      .map(([key]) => INTERIOR_LABELS[key] || key);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Depósito de Vehículo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    h2 { font-size: 14px; background: #f0f0f0; padding: 5px 10px; margin: 15px 0 10px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
    .company { font-weight: bold; font-size: 16px; }
    .date { margin-top: 5px; }
    .section { margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { margin-bottom: 5px; }
    .label { font-weight: bold; }
    .damages { background: #fff5f5; padding: 10px; border: 1px solid #ffcccc; margin: 10px 0; }
    .legal { font-size: 10px; margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 30px; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 5px; }
    .signature-img { max-height: 80px; margin-top: 10px; }
    .fuel-gauge { display: flex; gap: 2px; height: 20px; align-items: flex-end; }
    .fuel-bar { width: 20px; background: #e0e0e0; }
    .fuel-bar.filled.low { background: #ef4444; }
    .fuel-bar.filled.mid { background: #eab308; }
    .fuel-bar.filled.high { background: #22c55e; }
    @media print { body { padding: 10px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">TALLER AUTOS FORMENTERA ES BROLLS S.L.</div>
    <h1>RECIBO DE DEPÓSITO DE VEHÍCULO</h1>
    <div class="date">${formattedDate} - ${formattedTime}</div>
  </div>

  <h2>DATOS DEL CLIENTE</h2>
  <div class="section grid">
    <div class="field"><span class="label">Nombre:</span> ${esc(ownerData.name) || 'No indicado'}</div>
    <div class="field"><span class="label">DNI/NIF:</span> ${esc(ownerData.dni) || 'No indicado'}</div>
    <div class="field"><span class="label">Teléfono:</span> ${esc(ownerData.phone) || 'No indicado'}</div>
    <div class="field"><span class="label">Email:</span> ${esc(ownerData.email) || 'No indicado'}</div>
    <div class="field" style="grid-column: 1 / -1;"><span class="label">Dirección:</span> ${esc(ownerData.address) || 'No indicada'}</div>
  </div>

  <h2>DATOS DEL VEHÍCULO</h2>
  <div class="section grid">
    <div class="field"><span class="label">Matrícula:</span> ${esc(vehicleData.plate)}</div>
    <div class="field"><span class="label">Marca:</span> ${esc(vehicleData.brand)}</div>
    <div class="field"><span class="label">Modelo:</span> ${esc(vehicleData.model)}</div>
    <div class="field"><span class="label">Año:</span> ${esc(vehicleData.year) || 'No indicado'}</div>
    <div class="field"><span class="label">Color:</span> ${esc(vehicleData.color) || 'No indicado'}</div>
    <div class="field"><span class="label">Nº Bastidor:</span> ${esc(vehicleData.vin) || 'No indicado'}</div>
    <div class="field"><span class="label">Kilometraje:</span> ${inspectionData.mileage ? `${esc(inspectionData.mileage)} km` : 'No indicado'}</div>
    <div class="field">
      <span class="label">Combustible:</span>
      <div class="fuel-gauge">
        ${Array.from({ length: 8 }, (_, i) => {
          const level = i + 1;
          const isFilled = inspectionData.fuel_level >= level;
          const colorClass = level <= 2 ? 'low' : level <= 4 ? 'mid' : 'high';
          return `<div class="fuel-bar${isFilled ? ` filled ${colorClass}` : ''}" style="height: ${(level / 8) * 100}%"></div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <h2>MOTIVO DE ENTRADA</h2>
  <div class="section">
    <p>${esc(vehicleData.client_description) || 'No indicado'}</p>
  </div>

  ${inspectionData.exterior_damages.length > 0 ? `
  <h2>DAÑOS EXTERIORES DETECTADOS EN RECEPCIÓN</h2>
  <div class="damages">
    <ul>
      ${inspectionData.exterior_damages.map(d => `<li><strong>${esc(VEHICLE_ZONES[d.zone] || d.zone)}:</strong> ${esc(d.description)}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <h2>ELEMENTOS VERIFICADOS EN EL VEHÍCULO</h2>
  <div class="section">
    <p><strong>Presentes:</strong> ${checkedItems.length > 0 ? esc(checkedItems.join(', ')) : 'Ninguno marcado'}</p>
    <p><strong>Número de llaves entregadas:</strong> ${esc(inspectionData.interior_check.keys_count || 1)}</p>
  </div>

  ${inspectionData.client_belongings ? `
  <h2>OBJETOS PERSONALES DEL CLIENTE EN EL VEHÍCULO</h2>
  <div class="section">
    <p>${esc(inspectionData.client_belongings)}</p>
  </div>
  ` : ''}

  ${inspectionData.reception_notes ? `
  <h2>OBSERVACIONES</h2>
  <div class="section">
    <p>${esc(inspectionData.reception_notes)}</p>
  </div>
  ` : ''}

  <div class="legal">
    <p><strong>CONDICIONES GENERALES DE DEPÓSITO:</strong></p>
    <ol style="margin-left: 15px; margin-top: 5px;">
      <li>El cliente autoriza al taller a realizar las reparaciones necesarias según presupuesto previo aceptado.</li>
      <li>El taller no se responsabiliza de los objetos de valor dejados en el interior del vehículo que no hayan sido declarados expresamente en este documento.</li>
      <li>El vehículo permanecerá en las instalaciones del taller bajo custodia hasta su recogida por el cliente o persona autorizada.</li>
      <li>El cliente dispondrá de un plazo máximo de 30 días desde la comunicación de finalización de los trabajos para recoger el vehículo. Transcurrido este plazo, se aplicará un cargo por estancia de 15€/día.</li>
      <li>Los daños exteriores aquí reflejados han sido verificados y aceptados por el cliente en el momento de la recepción.</li>
      <li>El presupuesto tendrá una validez de 30 días desde su emisión.</li>
      <li>En caso de reparación parcial o no aceptación del presupuesto, el cliente abonará los gastos de diagnosis realizados.</li>
      <li>El taller se compromete a informar al cliente de cualquier variación significativa sobre el presupuesto inicial antes de proceder.</li>
    </ol>
    <p style="margin-top: 10px;"><strong>PROTECCIÓN DE DATOS:</strong> En cumplimiento del RGPD, los datos personales serán tratados con la finalidad de gestionar la relación comercial. No serán cedidos a terceros salvo obligación legal.</p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <p>El Taller</p>
      <div class="signature-line">Firma y sello</div>
    </div>
    <div class="signature-box">
      <p>El Cliente</p>
      ${inspectionData.client_signature && /^data:image\//.test(inspectionData.client_signature) ? `<img src="${escAttr(inspectionData.client_signature)}" class="signature-img" alt="Firma del cliente" />` : ''}
      <div class="signature-line">${esc(ownerData.name) || 'Firma del cliente'}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    const receiptHTML = generateReceiptHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const receiptHTML = generateReceiptHTML();
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-deposito-${vehicleData.plate}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <span className="font-medium">Generar Recibo de Depósito</span>
      </div>
      
      <p className="text-sm text-muted-foreground">
        El recibo incluirá todos los datos del cliente, vehículo, inspección realizada y los textos legales correspondientes.
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button type="button" variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
      </div>
    </div>
  );
}
