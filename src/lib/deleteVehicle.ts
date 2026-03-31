import { supabase } from '@/integrations/supabase/client';

/**
 * Evita que una cita ya convertida vuelva a recrear el vehículo
 * si ese vehículo se elimina manualmente más tarde.
 */
export async function deleteVehiclePermanently(vehicleId: string) {
  const { error: unlinkError } = await supabase
    .from('appointments')
    .update({ vehicle_id: null, created_by: null })
    .eq('vehicle_id', vehicleId);

  if (unlinkError) {
    return { error: unlinkError };
  }

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId);

  return { error };
}