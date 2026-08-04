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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      catalogos: {
        Row: {
          created_at: string
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          tipo: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      concurrentes: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          dias_especificos: string
          dias_x_semana: string
          direccion: string
          dni: string
          fecha_baja: string | null
          fecha_nacimiento: string | null
          grupo: string
          horarios: string
          id: string
          legacy_id: string | null
          lugar_firma: string
          mail: string
          motivo_baja: string
          n_afiliado: string
          nombre: string
          notas: string
          obra_social: string
          observaciones: string
          prestacion: string
          responsable: string
          telefono: string
          tipo: string
          transporte: boolean
          updated_at: string
          wsp: string
        }
        Insert: {
          activo?: boolean
          apellido?: string
          created_at?: string
          dias_especificos?: string
          dias_x_semana?: string
          direccion?: string
          dni?: string
          fecha_baja?: string | null
          fecha_nacimiento?: string | null
          grupo?: string
          horarios?: string
          id?: string
          legacy_id?: string | null
          lugar_firma?: string
          mail?: string
          motivo_baja?: string
          n_afiliado?: string
          nombre: string
          notas?: string
          obra_social?: string
          observaciones?: string
          prestacion?: string
          responsable?: string
          telefono?: string
          tipo?: string
          transporte?: boolean
          updated_at?: string
          wsp?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          dias_especificos?: string
          dias_x_semana?: string
          direccion?: string
          dni?: string
          fecha_baja?: string | null
          fecha_nacimiento?: string | null
          grupo?: string
          horarios?: string
          id?: string
          legacy_id?: string | null
          lugar_firma?: string
          mail?: string
          motivo_baja?: string
          n_afiliado?: string
          nombre?: string
          notas?: string
          obra_social?: string
          observaciones?: string
          prestacion?: string
          responsable?: string
          telefono?: string
          tipo?: string
          transporte?: boolean
          updated_at?: string
          wsp?: string
        }
        Relationships: []
      }
      documento_maestro: {
        Row: {
          actualizado_por: string
          concurrente_id: string
          contenido: string
          created_at: string
          id: string
          updated_at: string
          version: number
        }
        Insert: {
          actualizado_por?: string
          concurrente_id: string
          contenido?: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Update: {
          actualizado_por?: string
          concurrente_id?: string
          contenido?: string
          created_at?: string
          id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_maestro_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: true
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_maestro_versiones: {
        Row: {
          concurrente_id: string | null
          contenido: string
          created_at: string
          documento_id: string | null
          id: string
          resumen: string
          updated_at: string
          usuario: string
          version: number
        }
        Insert: {
          concurrente_id?: string | null
          contenido?: string
          created_at?: string
          documento_id?: string | null
          id?: string
          resumen?: string
          updated_at?: string
          usuario?: string
          version?: number
        }
        Update: {
          concurrente_id?: string | null
          contenido?: string
          created_at?: string
          documento_id?: string | null
          id?: string
          resumen?: string
          updated_at?: string
          usuario?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_maestro_versiones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_maestro_versiones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_maestro"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          concurrente_id: string | null
          created_at: string
          id: string
          nombre: string
          notas: string
          requisito: string
          storage_path: string
          tipo: string
          url: string
          vencimiento: string | null
        }
        Insert: {
          concurrente_id?: string | null
          created_at?: string
          id?: string
          nombre: string
          notas?: string
          requisito?: string
          storage_path?: string
          tipo?: string
          url?: string
          vencimiento?: string | null
        }
        Update: {
          concurrente_id?: string | null
          created_at?: string
          id?: string
          nombre?: string
          notas?: string
          requisito?: string
          storage_path?: string
          tipo?: string
          url?: string
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          categoria: string
          color: string
          concurrente_id: string | null
          created_at: string
          descripcion: string
          estado: string
          fecha: string
          hora: string
          id: string
          prioridad: string
          titulo: string
        }
        Insert: {
          categoria?: string
          color?: string
          concurrente_id?: string | null
          created_at?: string
          descripcion?: string
          estado?: string
          fecha: string
          hora?: string
          id?: string
          prioridad?: string
          titulo: string
        }
        Update: {
          categoria?: string
          color?: string
          concurrente_id?: string | null
          created_at?: string
          descripcion?: string
          estado?: string
          fecha?: string
          hora?: string
          id?: string
          prioridad?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      facturacion: {
        Row: {
          concurrente_id: string | null
          created_at: string
          estado: string
          id: string
          mes: string
          monto: number
          notas: string
        }
        Insert: {
          concurrente_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          mes: string
          monto?: number
          notas?: string
        }
        Update: {
          concurrente_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          mes?: string
          monto?: number
          notas?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturacion_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      historial: {
        Row: {
          accion: string
          concurrente_id: string | null
          created_at: string
          detalle: string
          entidad: string
          entidad_id: string | null
          id: string
          observaciones: string
          usuario: string
        }
        Insert: {
          accion: string
          concurrente_id?: string | null
          created_at?: string
          detalle?: string
          entidad: string
          entidad_id?: string | null
          id?: string
          observaciones?: string
          usuario?: string
        }
        Update: {
          accion?: string
          concurrente_id?: string | null
          created_at?: string
          detalle?: string
          entidad?: string
          entidad_id?: string | null
          id?: string
          observaciones?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_items: {
        Row: {
          concurrente_id: string | null
          created_at: string
          id: string
          lote_id: string
          nombre: string
        }
        Insert: {
          concurrente_id?: string | null
          created_at?: string
          id?: string
          lote_id: string
          nombre?: string
        }
        Update: {
          concurrente_id?: string | null
          created_at?: string
          id?: string
          lote_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "lote_items_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_items_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string
          entregado_por: string
          estado: string
          fecha_armado: string
          fecha_entrega: string | null
          fecha_recepcion: string | null
          id: string
          mes: string
          mutual: string
          notas: string
          numero: string
          prestacion: string
          recibido_por: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entregado_por?: string
          estado?: string
          fecha_armado?: string
          fecha_entrega?: string | null
          fecha_recepcion?: string | null
          id?: string
          mes?: string
          mutual?: string
          notas?: string
          numero: string
          prestacion?: string
          recibido_por?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entregado_por?: string
          estado?: string
          fecha_armado?: string
          fecha_entrega?: string | null
          fecha_recepcion?: string | null
          id?: string
          mes?: string
          mutual?: string
          notas?: string
          numero?: string
          prestacion?: string
          recibido_por?: string
          updated_at?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          id: string
          motivo: string
          nombre: string
          notas: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          motivo?: string
          nombre: string
          notas?: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          motivo?: string
          nombre?: string
          notas?: string
        }
        Relationships: []
      }
      notas_rapidas: {
        Row: {
          categoria: string
          created_at: string
          estado: string
          fecha: string
          id: string
          prioridad: string
          texto: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          prioridad?: string
          texto?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          prioridad?: string
          texto?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      planilla_estados: {
        Row: {
          concurrente_id: string
          estados: Json
          id: string
          mes: string
          updated_at: string
        }
        Insert: {
          concurrente_id: string
          estados?: Json
          id?: string
          mes: string
          updated_at?: string
        }
        Update: {
          concurrente_id?: string
          estados?: Json
          id?: string
          mes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planilla_estados_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitos_documentales: {
        Row: {
          created_at: string
          documento: string
          id: string
          obligatorio: boolean
          prestacion: string
          vence: boolean
        }
        Insert: {
          created_at?: string
          documento: string
          id?: string
          obligatorio?: boolean
          prestacion: string
          vence?: boolean
        }
        Update: {
          created_at?: string
          documento?: string
          id?: string
          obligatorio?: boolean
          prestacion?: string
          vence?: boolean
        }
        Relationships: []
      }
      tareas: {
        Row: {
          created_at: string
          estado: string
          id: string
          notas: string
          prioridad: string
          titulo: string
          vence: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          notas?: string
          prioridad?: string
          titulo: string
          vence?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          notas?: string
          prioridad?: string
          titulo?: string
          vence?: string | null
        }
        Relationships: []
      }
      turnos: {
        Row: {
          contacto: string
          created_at: string
          estado: string
          fecha: string
          hora: string
          id: string
          nombre: string
          notas: string
          obra_social: string
          tipo: string
        }
        Insert: {
          contacto?: string
          created_at?: string
          estado?: string
          fecha: string
          hora?: string
          id?: string
          nombre: string
          notas?: string
          obra_social?: string
          tipo?: string
        }
        Update: {
          contacto?: string
          created_at?: string
          estado?: string
          fecha?: string
          hora?: string
          id?: string
          nombre?: string
          notas?: string
          obra_social?: string
          tipo?: string
        }
        Relationships: []
      }
      viandas: {
        Row: {
          administrativo: string
          cantidad: number
          comprobante_recibido: boolean
          concurrente_id: string | null
          created_at: string
          estado: string
          fecha: string
          fecha_comprobante: string | null
          fecha_pago: string | null
          forma_pago: string
          id: string
          mes: string
          nombre_concurrente: string
          observaciones: string
          precio_unitario: number
          profesional: string
          semana: number
          updated_at: string
        }
        Insert: {
          administrativo?: string
          cantidad?: number
          comprobante_recibido?: boolean
          concurrente_id?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          fecha_comprobante?: string | null
          fecha_pago?: string | null
          forma_pago?: string
          id?: string
          mes?: string
          nombre_concurrente?: string
          observaciones?: string
          precio_unitario?: number
          profesional?: string
          semana?: number
          updated_at?: string
        }
        Update: {
          administrativo?: string
          cantidad?: number
          comprobante_recibido?: boolean
          concurrente_id?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          fecha_comprobante?: string | null
          fecha_pago?: string | null
          forma_pago?: string
          id?: string
          mes?: string
          nombre_concurrente?: string
          observaciones?: string
          precio_unitario?: number
          profesional?: string
          semana?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viandas_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_lote_items: {
        Args: { p_items: Json; p_lote_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
