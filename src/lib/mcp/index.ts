import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listVehiclesTool from "./tools/list-vehicles";
import getVehicleTool from "./tools/get-vehicle";
import listAppointmentsTool from "./tools/list-appointments";
import searchOwnersTool from "./tools/search-owners";
import getClientHistoryTool from "./tools/get-client-history";
import getWorkloadSummaryTool from "./tools/get-workload-summary";
import listPendingClientTasksTool from "./tools/list-pending-client-tasks";
import listVehiclePartsTool from "./tools/list-pending-parts";
import getProductivitySummaryTool from "./tools/get-productivity-summary";
import listTeamTool from "./tools/list-team";
import updateVehicleStatusTool from "./tools/update-vehicle-status";
import updateVehiclePriorityTool from "./tools/update-vehicle-priority";
import assignVehicleTool from "./tools/assign-vehicle";
import addClientTaskTool from "./tools/add-client-task";
import toggleClientTaskTool from "./tools/toggle-client-task";
import addVehicleNoteTool from "./tools/add-vehicle-note";
import createAppointmentTool from "./tools/create-appointment";
import addPartTool from "./tools/add-part";
import sendWhatsappTool from "./tools/send-whatsapp";
import generateRepairReportTool from "./tools/generate-repair-report";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tu-taller-mcp",
  title: "Tu Taller MCP",
  version: "0.3.0",
  instructions:
    "Herramientas del taller Tu Taller. Consulta y gestiona vehículos (órdenes de trabajo), citas, clientes, tareas de cliente, piezas y productividad del usuario autenticado. Los datos están limitados por la organización del usuario mediante RLS. Herramientas de escritura: cambian estado, prioridad, asignación, notas, tareas, citas y piezas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    // Lectura
    listVehiclesTool,
    getVehicleTool,
    listAppointmentsTool,
    searchOwnersTool,
    getClientHistoryTool,
    getWorkloadSummaryTool,
    listPendingClientTasksTool,
    listVehiclePartsTool,
    getProductivitySummaryTool,
    listTeamTool,
    // Escritura
    updateVehicleStatusTool,
    updateVehiclePriorityTool,
    assignVehicleTool,
    addClientTaskTool,
    toggleClientTaskTool,
    addVehicleNoteTool,
    createAppointmentTool,
    addPartTool,
    sendWhatsappTool,
    generateRepairReportTool,
  ],
});
