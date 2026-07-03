import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listVehiclesTool from "./tools/list-vehicles";
import getVehicleTool from "./tools/get-vehicle";
import listAppointmentsTool from "./tools/list-appointments";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tu-taller-mcp",
  title: "Tu Taller MCP",
  version: "0.1.0",
  instructions:
    "Herramientas del taller Tu Taller. Consulta vehículos (órdenes de trabajo), su estado y las citas del taller del usuario autenticado. Los datos están limitados por la organización del usuario mediante RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listVehiclesTool, getVehicleTool, listAppointmentsTool],
});
