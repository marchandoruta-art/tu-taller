-- Create attendance_logs table for workshop entry/exit tracking
CREATE TABLE public.attendance_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    clock_out TIMESTAMP WITH TIME ZONE,
    total_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendance
CREATE POLICY "Users can view their own attendance"
ON public.attendance_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance"
ON public.attendance_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own attendance
CREATE POLICY "Users can insert their own attendance"
ON public.attendance_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance
CREATE POLICY "Users can update their own attendance"
ON public.attendance_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_attendance_logs_user_id ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_clock_in ON public.attendance_logs(clock_in DESC);