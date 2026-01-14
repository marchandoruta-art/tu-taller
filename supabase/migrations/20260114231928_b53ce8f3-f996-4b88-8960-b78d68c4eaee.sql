-- Add exit_type column to attendance_logs for different types of clock-out
-- Types: 'normal', 'medico' (medical), 'descanso' (break), 'desayuno' (breakfast)
ALTER TABLE public.attendance_logs 
ADD COLUMN exit_type TEXT DEFAULT 'normal';

-- Add a comment for documentation
COMMENT ON COLUMN public.attendance_logs.exit_type IS 'Type of exit: normal, medico, descanso, desayuno';