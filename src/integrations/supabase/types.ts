export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ajustes_plataforma: {
        Row: {
          clave: string
          nota: string | null
          valor: string
        }
        Insert: {
          clave: string
          nota?: string | null
          valor: string
        }
        Update: {
          clave?: string
          nota?: string | null
          valor?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          assigned_to: string | null
          avisos_aceptados_en: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          confirmation_status: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          documento_numero: string | null
          documento_tipo: string | null
          firma: string | null
          id: string
          issue_description: string | null
          notes: string | null
          organization_id: string | null
          origen: string
          servicios: string[]
          updated_at: string
          vehicle_brand: string | null
          vehicle_id: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: number | null
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          assigned_to?: string | null
          avisos_aceptados_en?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          confirmation_status?: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          documento_numero?: string | null
          documento_tipo?: string | null
          firma?: string | null
          id?: string
          issue_description?: string | null
          notes?: string | null
          organization_id?: string | null
          origen?: string
          servicios?: string[]
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          assigned_to?: string | null
          avisos_aceptados_en?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          confirmation_status?: Database["public"]["Enums"]["appointment_confirmation_status"]
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          documento_numero?: string | null
          documento_tipo?: string | null
          firma?: string | null
          id?: string
          issue_description?: string | null
          notes?: string | null
          organization_id?: string | null
          origen?: string
          servicios?: string[]
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          aviso_enviado_en: string | null
          clock_in: string
          clock_out: string | null
          corregido_en: string | null
          corregido_por: string | null
          created_at: string
          exit_type: string | null
          id: string
          motivo: string | null
          organization_id: string | null
          origen: string
          total_minutes: number | null
          user_id: string
        }
        Insert: {
          aviso_enviado_en?: string | null
          clock_in?: string
          clock_out?: string | null
          corregido_en?: string | null
          corregido_por?: string | null
          created_at?: string
          exit_type?: string | null
          id?: string
          motivo?: string | null
          organization_id?: string | null
          origen?: string
          total_minutes?: number | null
          user_id: string
        }
        Update: {
          aviso_enviado_en?: string | null
          clock_in?: string
          clock_out?: string | null
          corregido_en?: string | null
          corregido_por?: string | null
          created_at?: string
          exit_type?: string | null
          id?: string
          motivo?: string | null
          organization_id?: string | null
          origen?: string
          total_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_approvals: {
        Row: {
          client_note: string | null
          client_response_at: string | null
          created_at: string
          description: string
          estimated_info: string | null
          id: string
          organization_id: string
          requested_by: string | null
          status: Database["public"]["Enums"]["client_approval_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          client_note?: string | null
          client_response_at?: string | null
          created_at?: string
          description: string
          estimated_info?: string | null
          id?: string
          organization_id: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["client_approval_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          client_note?: string | null
          client_response_at?: string | null
          created_at?: string
          description?: string
          estimated_info?: string | null
          id?: string
          organization_id?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["client_approval_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_approvals_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          revoked: boolean
          token: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          revoked?: boolean
          token?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          revoked?: boolean
          token?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reminders: {
        Row: {
          brand: string | null
          channel: string | null
          created_at: string
          due_date: string
          id: string
          model: string | null
          notes: string | null
          organization_id: string
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          owner_phone: string | null
          plate: string
          reminder_type: string
          sent_at: string | null
          sent_by: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          brand?: string | null
          channel?: string | null
          created_at?: string
          due_date: string
          id?: string
          model?: string | null
          notes?: string | null
          organization_id: string
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          plate: string
          reminder_type: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          brand?: string | null
          channel?: string | null
          created_at?: string
          due_date?: string
          id?: string
          model?: string | null
          notes?: string | null
          organization_id?: string
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          plate?: string
          reminder_type?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          organization_id: string | null
          read: boolean | null
          type: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          read?: boolean | null
          type: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_holidays_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          attendance_end: string
          citas_avisos: string[]
          citas_desde: string
          citas_dias: number[]
          citas_duracion_min: number
          citas_hasta: string
          citas_por_franja: number
          citas_servicios: string[]
          citas_web_activas: boolean
          codigo_postal: string | null
          created_at: string
          dado_de_baja_en: string | null
          direccion: string | null
          email: string | null
          estado_suscripcion: Database["public"]["Enums"]["estado_suscripcion"]
          id: string
          logo_url: string | null
          name: string
          nif: string | null
          owner_id: string
          plan: string | null
          poblacion: string | null
          provincia: string | null
          prueba_termina_en: string | null
          razon_social: string | null
          slug: string
          suscripcion_termina_en: string | null
          telefono: string | null
          time_zone: string
          updated_at: string
        }
        Insert: {
          attendance_end?: string
          citas_avisos?: string[]
          citas_desde?: string
          citas_dias?: number[]
          citas_duracion_min?: number
          citas_hasta?: string
          citas_por_franja?: number
          citas_servicios?: string[]
          citas_web_activas?: boolean
          codigo_postal?: string | null
          created_at?: string
          dado_de_baja_en?: string | null
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          logo_url?: string | null
          name: string
          nif?: string | null
          owner_id: string
          plan?: string | null
          poblacion?: string | null
          provincia?: string | null
          prueba_termina_en?: string | null
          razon_social?: string | null
          slug: string
          suscripcion_termina_en?: string | null
          telefono?: string | null
          time_zone?: string
          updated_at?: string
        }
        Update: {
          attendance_end?: string
          citas_avisos?: string[]
          citas_desde?: string
          citas_dias?: number[]
          citas_duracion_min?: number
          citas_hasta?: string
          citas_por_franja?: number
          citas_servicios?: string[]
          citas_web_activas?: boolean
          codigo_postal?: string | null
          created_at?: string
          dado_de_baja_en?: string | null
          direccion?: string | null
          email?: string | null
          estado_suscripcion?: Database["public"]["Enums"]["estado_suscripcion"]
          id?: string
          logo_url?: string | null
          name?: string
          nif?: string | null
          owner_id?: string
          plan?: string | null
          poblacion?: string | null
          provincia?: string | null
          prueba_termina_en?: string | null
          razon_social?: string | null
          slug?: string
          suscripcion_termina_en?: string | null
          telefono?: string | null
          time_zone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_valido"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["codigo"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          created_at: string
          dni: string | null
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          quantity: number
          reference: string | null
          unit_price: number | null
          vehicle_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          reference?: string | null
          unit_price?: number | null
          vehicle_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          reference?: string | null
          unit_price?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      planes: {
        Row: {
          actualizado_en: string
          avisos_itv: boolean
          citas_web: boolean
          codigo: string
          creado_en: string
          documentos_con_logo: boolean
          estadisticas: boolean
          max_usuarios: number | null
          max_vehiculos_activos: number | null
          meses_historial: number | null
          nombre: string
          orden: number
          portal_cliente: boolean
          precio_mensual: number | null
          productividad: boolean
          registro_jornada: boolean
          usos_ia_mes: number | null
        }
        Insert: {
          actualizado_en?: string
          avisos_itv?: boolean
          citas_web?: boolean
          codigo: string
          creado_en?: string
          documentos_con_logo?: boolean
          estadisticas?: boolean
          max_usuarios?: number | null
          max_vehiculos_activos?: number | null
          meses_historial?: number | null
          nombre: string
          orden: number
          portal_cliente?: boolean
          precio_mensual?: number | null
          productividad?: boolean
          registro_jornada?: boolean
          usos_ia_mes?: number | null
        }
        Update: {
          actualizado_en?: string
          avisos_itv?: boolean
          citas_web?: boolean
          codigo?: string
          creado_en?: string
          documentos_con_logo?: boolean
          estadisticas?: boolean
          max_usuarios?: number | null
          max_vehiculos_activos?: number | null
          meses_historial?: number | null
          nombre?: string
          orden?: number
          portal_cliente?: boolean
          precio_mensual?: number | null
          productividad?: boolean
          registro_jornada?: boolean
          usos_ia_mes?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      propietarios_plataforma: {
        Row: {
          creado_en: string
          user_id: string
        }
        Insert: {
          creado_en?: string
          user_id: string
        }
        Update: {
          creado_en?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          organization_id: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          organization_id?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          organization_id?: string | null
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_deliveries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_deliveries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          tasks: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          tasks?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          tasks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          ended_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          started_at: string
          total_minutes: number | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          started_at?: string
          total_minutes?: number | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          started_at?: string
          total_minutes?: number | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_anomalies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          organization_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          organization_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_anomalies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_anomalies_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_archives: {
        Row: {
          anomalies_snapshot: Json
          archived_at: string
          archived_by: string | null
          brand: string | null
          files_snapshot: Json
          id: string
          messages_snapshot: Json
          model: string | null
          organization_id: string
          owner_id: string | null
          owner_snapshot: Json | null
          parts_snapshot: Json
          photos_snapshot: Json
          plate: string
          status_history_snapshot: Json
          time_logs_snapshot: Json
          vehicle_id: string
          vehicle_snapshot: Json
        }
        Insert: {
          anomalies_snapshot?: Json
          archived_at?: string
          archived_by?: string | null
          brand?: string | null
          files_snapshot?: Json
          id?: string
          messages_snapshot?: Json
          model?: string | null
          organization_id: string
          owner_id?: string | null
          owner_snapshot?: Json | null
          parts_snapshot?: Json
          photos_snapshot?: Json
          plate: string
          status_history_snapshot?: Json
          time_logs_snapshot?: Json
          vehicle_id: string
          vehicle_snapshot: Json
        }
        Update: {
          anomalies_snapshot?: Json
          archived_at?: string
          archived_by?: string | null
          brand?: string | null
          files_snapshot?: Json
          id?: string
          messages_snapshot?: Json
          model?: string | null
          organization_id?: string
          owner_id?: string | null
          owner_snapshot?: Json | null
          parts_snapshot?: Json
          photos_snapshot?: Json
          plate?: string
          status_history_snapshot?: Json
          time_logs_snapshot?: Json
          vehicle_id?: string
          vehicle_snapshot?: Json
        }
        Relationships: []
      }
      vehicle_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          organization_id: string | null
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          organization_id?: string | null
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          organization_id?: string | null
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_files_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          organization_id: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          organization_id?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          organization_id?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_messages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          photo_type: string
          photo_url: string
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          photo_type: string
          photo_url: string
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          photo_type?: string
          photo_url?: string
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["vehicle_status"]
          old_status: Database["public"]["Enums"]["vehicle_status"] | null
          organization_id: string | null
          vehicle_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["vehicle_status"]
          old_status?: Database["public"]["Enums"]["vehicle_status"] | null
          organization_id?: string | null
          vehicle_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["vehicle_status"]
          old_status?: Database["public"]["Enums"]["vehicle_status"] | null
          organization_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_status_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          archived: boolean | null
          assigned_to: string | null
          brand: string
          client_belongings: string | null
          client_description: string | null
          client_signature: string | null
          client_tasks: Json | null
          color: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          deposit_receipt_generated: boolean | null
          estimated_cost: number | null
          exterior_damages: Json | null
          finished_at: string | null
          fuel_level: number | null
          id: string
          interior_check: Json | null
          itv_date: string | null
          maintenance_checklist: Json
          mileage: number | null
          model: string
          next_maintenance_date: string | null
          organization_id: string | null
          owner_id: string | null
          plate: string
          priority: Database["public"]["Enums"]["vehicle_priority"]
          reception_date: string | null
          reception_notes: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vin: string | null
          work_summary: string | null
          year: number | null
        }
        Insert: {
          archived?: boolean | null
          assigned_to?: string | null
          brand: string
          client_belongings?: string | null
          client_description?: string | null
          client_signature?: string | null
          client_tasks?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          deposit_receipt_generated?: boolean | null
          estimated_cost?: number | null
          exterior_damages?: Json | null
          finished_at?: string | null
          fuel_level?: number | null
          id?: string
          interior_check?: Json | null
          itv_date?: string | null
          maintenance_checklist?: Json
          mileage?: number | null
          model: string
          next_maintenance_date?: string | null
          organization_id?: string | null
          owner_id?: string | null
          plate: string
          priority?: Database["public"]["Enums"]["vehicle_priority"]
          reception_date?: string | null
          reception_notes?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          work_summary?: string | null
          year?: number | null
        }
        Update: {
          archived?: boolean | null
          assigned_to?: string | null
          brand?: string
          client_belongings?: string | null
          client_description?: string | null
          client_signature?: string | null
          client_tasks?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          deposit_receipt_generated?: boolean | null
          estimated_cost?: number | null
          exterior_damages?: Json | null
          finished_at?: string | null
          fuel_level?: number | null
          id?: string
          interior_check?: Json | null
          itv_date?: string | null
          maintenance_checklist?: Json
          mileage?: number | null
          model?: string
          next_maintenance_date?: string | null
          organization_id?: string | null
          owner_id?: string | null
          plate?: string
          priority?: Database["public"]["Enums"]["vehicle_priority"]
          reception_date?: string | null
          reception_notes?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vin?: string | null
          work_summary?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_delivered_vehicles: { Args: never; Returns: undefined }
      assign_user_to_organization: {
        Args: { _org_id: string; _target_user_id: string }
        Returns: undefined
      }
      cerrar_pruebas_caducadas: { Args: never; Returns: number }
      cita_publica_config: {
        Args: { _slug: string }
        Returns: {
          avisos: string[]
          duracion_min: number
          logo_url: string
          nombre: string
          servicios: string[]
        }[]
      }
      cita_publica_huecos: {
        Args: { _desde?: string; _dias?: number; _slug: string }
        Returns: {
          dia: string
          hora: string
          libres: number
        }[]
      }
      cita_publica_solicitar: {
        Args: {
          _anio: number
          _apellidos: string
          _detalle: string
          _dia: string
          _doc_numero: string
          _doc_tipo: string
          _email: string
          _firma: string
          _hora: string
          _marca: string
          _matricula: string
          _modelo: string
          _nombre: string
          _servicios: string[]
          _slug: string
          _telefono: string
        }
        Returns: {
          dia: string
          hora: string
          id: string
          taller: string
          token: string
        }[]
      }
      convert_today_appointments: { Args: never; Returns: number }
      corregir_jornada: {
        Args: {
          _clock_in: string
          _clock_out: string
          _id: string
          _motivo: string
        }
        Returns: {
          aviso_enviado_en: string | null
          clock_in: string
          clock_out: string | null
          corregido_en: string | null
          corregido_por: string | null
          created_at: string
          exit_type: string | null
          id: string
          motivo: string | null
          organization_id: string | null
          origen: string
          total_minutes: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cron_avisar_jornadas_abiertas: {
        Args: { _instante?: string }
        Returns: number
      }
      es_propietario_plataforma: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      generate_client_reminders: { Args: never; Returns: number }
      get_user_organization_id: { Args: { _user_id?: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_workshop_contact_settings: {
        Args: never
        Returns: {
          horario: string
          nombre_taller: string
          telefono: string
          whatsapp: string
          whatsapp_message: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_organization_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      mi_suscripcion: {
        Args: never
        Returns: {
          dado_de_baja_en: string
          dias_de_cortesia: number
          estado: string
          plan: string
          plan_nombre: string
          prueba_termina_en: string
          suscripcion_termina_en: string
          taller: string
          tiene_acceso: boolean
        }[]
      }
      panel_propietario_cambiar_estado: {
        Args: {
          _estado: Database["public"]["Enums"]["estado_suscripcion"]
          _hasta?: string
          _taller: string
        }
        Returns: undefined
      }
      panel_propietario_cambiar_plan: {
        Args: { _plan: string; _taller: string }
        Returns: undefined
      }
      panel_propietario_detalle: {
        Args: { _taller: string }
        Returns: {
          alta_en: string
          citas_total: number
          contacto_correo: string
          contacto_nombre: string
          dado_de_baja_en: string
          estado_suscripcion: string
          nombre: string
          personas_por_rol: Json
          personas_total: number
          plan: string
          prueba_termina_en: string
          slug: string
          suscripcion_termina_en: string
          ultimo_acceso: string
          vehiculos_activos: number
          vehiculos_total: number
        }[]
      }
      panel_propietario_talleres: {
        Args: never
        Returns: {
          alta_en: string
          correo_propietario: string
          dado_de_baja_en: string
          estado_suscripcion: string
          id: string
          nombre: string
          nombre_propietario: string
          personas: number
          plan: string
          prueba_termina_en: string
          slug: string
          suscripcion_termina_en: string
          vehiculos: number
        }[]
      }
      plan_del_taller: {
        Args: { _org?: string }
        Returns: {
          actualizado_en: string
          avisos_itv: boolean
          citas_web: boolean
          codigo: string
          creado_en: string
          documentos_con_logo: boolean
          estadisticas: boolean
          max_usuarios: number | null
          max_vehiculos_activos: number | null
          meses_historial: number | null
          nombre: string
          orden: number
          portal_cliente: boolean
          precio_mensual: number | null
          productividad: boolean
          registro_jornada: boolean
          usos_ia_mes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "planes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purgar_jornadas_caducadas: {
        Args: { _instante?: string }
        Returns: number
      }
      taller_puede: {
        Args: { _funcion: string; _org?: string }
        Returns: boolean
      }
      taller_tiene_acceso: { Args: { _org: string }; Returns: boolean }
      trigger_pending_reminder: { Args: { _slot: string }; Returns: undefined }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_confirmation_status: "pendiente" | "confirmada" | "cancelada"
      appointment_type: "mecanica" | "chapa_pintura"
      client_approval_status: "pendiente" | "aprobado" | "rechazado"
      estado_suscripcion: "prueba" | "activa" | "pago_pendiente" | "cancelada"
      user_role: "mecanico" | "chapista" | "oficina" | "admin"
      vehicle_priority: "baja" | "normal" | "alta" | "urgente"
      vehicle_status:
        | "recibido"
        | "presupuestar"
        | "presupuestado"
        | "en_reparacion"
        | "pendiente_piezas"
        | "terminado"
        | "facturado"
        | "entregado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_confirmation_status: ["pendiente", "confirmada", "cancelada"],
      appointment_type: ["mecanica", "chapa_pintura"],
      client_approval_status: ["pendiente", "aprobado", "rechazado"],
      estado_suscripcion: ["prueba", "activa", "pago_pendiente", "cancelada"],
      user_role: ["mecanico", "chapista", "oficina", "admin"],
      vehicle_priority: ["baja", "normal", "alta", "urgente"],
      vehicle_status: [
        "recibido",
        "presupuestar",
        "presupuestado",
        "en_reparacion",
        "pendiente_piezas",
        "terminado",
        "facturado",
        "entregado",
      ],
    },
  },
} as const
