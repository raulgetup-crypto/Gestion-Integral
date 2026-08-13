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
      admisiones: {
        Row: {
          activo: boolean
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          estado: string
          fecha_baja: string | null
          fecha_entrevista: string | null
          fecha_solicitud: string | null
          id: number
          medio: string
          motivo_baja: string
          motivo_consulta: string
          motivo_no_ingreso: string
          motivo_no_ingreso_codigo: string
          motivo_no_ingreso_detalle: string
          nombre_contacto: string
          observaciones: string
          persona_id: string | null
          sede_id: number | null
          telefono: string
          updated_at: string
          updated_by: number | null
          usuario_baja: number | null
        }
        Insert: {
          activo?: boolean
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado?: string
          fecha_baja?: string | null
          fecha_entrevista?: string | null
          fecha_solicitud?: string | null
          id?: number
          medio?: string
          motivo_baja?: string
          motivo_consulta?: string
          motivo_no_ingreso?: string
          motivo_no_ingreso_codigo?: string
          motivo_no_ingreso_detalle?: string
          nombre_contacto?: string
          observaciones?: string
          persona_id?: string | null
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Update: {
          activo?: boolean
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado?: string
          fecha_baja?: string | null
          fecha_entrevista?: string | null
          fecha_solicitud?: string | null
          id?: number
          medio?: string
          motivo_baja?: string
          motivo_consulta?: string
          motivo_no_ingreso?: string
          motivo_no_ingreso_codigo?: string
          motivo_no_ingreso_detalle?: string
          nombre_contacto?: string
          observaciones?: string
          persona_id?: string | null
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admisiones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admisiones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admisiones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admisiones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admisiones_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admisiones_usuario_baja_fkey"
            columns: ["usuario_baja"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_revisadas: {
        Row: {
          auth_user_id: string
          created_at: string
          fecha_revision: string
          id: string
          observaciones: string
          tipo_alerta: string
          updated_at: string
          usuario_id: number | null
        }
        Insert: {
          auth_user_id?: string
          created_at?: string
          fecha_revision?: string
          id?: string
          observaciones?: string
          tipo_alerta?: string
          updated_at?: string
          usuario_id?: number | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          fecha_revision?: string
          id?: string
          observaciones?: string
          tipo_alerta?: string
          updated_at?: string
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_revisadas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
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
      comunicaciones: {
        Row: {
          activo: boolean
          compromiso: string
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          destinatario: string
          documento_id: string | null
          fecha: string
          fecha_baja: string | null
          id: number
          medio: string
          mensaje_enviado: string
          motivo_baja: string
          planilla_id: number | null
          respuesta: string
          updated_at: string
          updated_by: number | null
          usuario_baja: number | null
        }
        Insert: {
          activo?: boolean
          compromiso?: string
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          destinatario?: string
          documento_id?: string | null
          fecha?: string
          fecha_baja?: string | null
          id?: number
          medio?: string
          mensaje_enviado?: string
          motivo_baja?: string
          planilla_id?: number | null
          respuesta?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Update: {
          activo?: boolean
          compromiso?: string
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          destinatario?: string
          documento_id?: string | null
          fecha?: string
          fecha_baja?: string | null
          id?: number
          medio?: string
          mensaje_enviado?: string
          motivo_baja?: string
          planilla_id?: number | null
          respuesta?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comunicaciones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "planillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicaciones_usuario_baja_fkey"
            columns: ["usuario_baja"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concurrente_prestaciones: {
        Row: {
          activa: boolean
          concurrente_id: string
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          observaciones: string
          prestacion: string
          principal: boolean
          updated_at: string
        }
        Insert: {
          activa?: boolean
          concurrente_id: string
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string
          prestacion: string
          principal?: boolean
          updated_at?: string
        }
        Update: {
          activa?: boolean
          concurrente_id?: string
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          observaciones?: string
          prestacion?: string
          principal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concurrente_prestaciones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      concurrente_profesionales: {
        Row: {
          activa: boolean
          concurrente_id: string
          created_at: string
          created_by: number | null
          fecha_baja: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          motivo_baja: string
          observaciones: string
          profesional_id: string
          referente: boolean
          rol: string
          updated_at: string
          updated_by: number | null
          usuario_baja: number | null
        }
        Insert: {
          activa?: boolean
          concurrente_id: string
          created_at?: string
          created_by?: number | null
          fecha_baja?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          motivo_baja?: string
          observaciones?: string
          profesional_id: string
          referente?: boolean
          rol?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Update: {
          activa?: boolean
          concurrente_id?: string
          created_at?: string
          created_by?: number | null
          fecha_baja?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          motivo_baja?: string
          observaciones?: string
          profesional_id?: string
          referente?: boolean
          rol?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concurrente_profesionales_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrente_profesionales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrente_profesionales_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrente_profesionales_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrente_profesionales_usuario_baja_fkey"
            columns: ["usuario_baja"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      concurrentes: {
        Row: {
          activo: boolean
          apellido: string
          colegio: string
          come_viandas: boolean
          created_at: string
          created_by: number | null
          dias_especificos: string
          dias_x_semana: string
          direccion: string
          dni: string
          fecha_baja: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          genera_planilla: boolean
          grupo: string
          horarios: string
          id: string
          legacy_id: string | null
          lugar_firma: string
          mail: string
          modalidad_ingreso: string
          motivo_baja: string
          mutual: string
          n_afiliado: string
          nombre: string
          notas: string
          numero_institucion: string
          obra_social: string
          observaciones: string
          observaciones_administrativas: string
          persona_id: string | null
          prestacion: string
          responsable: string
          revisar_dni: boolean
          sede_id: number | null
          servicio_beca: string
          telefono: string
          tipo: string
          transporte: boolean
          updated_at: string
          updated_by: number | null
          wsp: string
        }
        Insert: {
          activo?: boolean
          apellido?: string
          colegio?: string
          come_viandas?: boolean
          created_at?: string
          created_by?: number | null
          dias_especificos?: string
          dias_x_semana?: string
          direccion?: string
          dni?: string
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          genera_planilla?: boolean
          grupo?: string
          horarios?: string
          id?: string
          legacy_id?: string | null
          lugar_firma?: string
          mail?: string
          modalidad_ingreso?: string
          motivo_baja?: string
          mutual?: string
          n_afiliado?: string
          nombre: string
          notas?: string
          numero_institucion?: string
          obra_social?: string
          observaciones?: string
          observaciones_administrativas?: string
          persona_id?: string | null
          prestacion?: string
          responsable?: string
          revisar_dni?: boolean
          sede_id?: number | null
          servicio_beca?: string
          telefono?: string
          tipo?: string
          transporte?: boolean
          updated_at?: string
          updated_by?: number | null
          wsp?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          colegio?: string
          come_viandas?: boolean
          created_at?: string
          created_by?: number | null
          dias_especificos?: string
          dias_x_semana?: string
          direccion?: string
          dni?: string
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          genera_planilla?: boolean
          grupo?: string
          horarios?: string
          id?: string
          legacy_id?: string | null
          lugar_firma?: string
          mail?: string
          modalidad_ingreso?: string
          motivo_baja?: string
          mutual?: string
          n_afiliado?: string
          nombre?: string
          notas?: string
          numero_institucion?: string
          obra_social?: string
          observaciones?: string
          observaciones_administrativas?: string
          persona_id?: string | null
          prestacion?: string
          responsable?: string
          revisar_dni?: boolean
          sede_id?: number | null
          servicio_beca?: string
          telefono?: string
          tipo?: string
          transporte?: boolean
          updated_at?: string
          updated_by?: number | null
          wsp?: string
        }
        Relationships: [
          {
            foreignKeyName: "concurrentes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrentes_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrentes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurrentes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_administrativo: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          id: string
          mes: string
          observaciones: string
          responsable: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha: string
          id?: string
          mes: string
          observaciones?: string
          responsable?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          mes?: string
          observaciones?: string
          responsable?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      directorio: {
        Row: {
          activo: boolean
          area: string | null
          cargo: string | null
          created_at: string
          created_by: number | null
          email: string | null
          fecha_baja: string | null
          id: string
          institucion: string | null
          motivo_baja: string | null
          nombre: string
          observaciones: string | null
          sede_id: number | null
          telefono: string | null
          telefono_alternativo: string | null
          updated_at: string
          updated_by: number | null
          usuario_baja: number | null
        }
        Insert: {
          activo?: boolean
          area?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: number | null
          email?: string | null
          fecha_baja?: string | null
          id?: string
          institucion?: string | null
          motivo_baja?: string | null
          nombre: string
          observaciones?: string | null
          sede_id?: number | null
          telefono?: string | null
          telefono_alternativo?: string | null
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Update: {
          activo?: boolean
          area?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: number | null
          email?: string | null
          fecha_baja?: string | null
          id?: string
          institucion?: string | null
          motivo_baja?: string | null
          nombre?: string
          observaciones?: string | null
          sede_id?: number | null
          telefono?: string | null
          telefono_alternativo?: string | null
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
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
      documento_maestro_archivos: {
        Row: {
          concurrente_id: string
          created_at: string
          descripcion: string
          id: string
          mime: string
          nombre: string
          storage_path: string
          tamano: number
          updated_at: string
          usuario: string
          version: number
        }
        Insert: {
          concurrente_id: string
          created_at?: string
          descripcion?: string
          id?: string
          mime?: string
          nombre?: string
          storage_path?: string
          tamano?: number
          updated_at?: string
          usuario?: string
          version?: number
        }
        Update: {
          concurrente_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          mime?: string
          nombre?: string
          storage_path?: string
          tamano?: number
          updated_at?: string
          usuario?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_maestro_archivos_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
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
      documento_versiones: {
        Row: {
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          documento_id: string
          id: string
          mime: string
          nombre: string
          storage_path: string
          tamano: number
          usuario: string
          version: number
        }
        Insert: {
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          documento_id: string
          id?: string
          mime?: string
          nombre?: string
          storage_path?: string
          tamano?: number
          usuario?: string
          version?: number
        }
        Update: {
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          documento_id?: string
          id?: string
          mime?: string
          nombre?: string
          storage_path?: string
          tamano?: number
          usuario?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_versiones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_versiones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          activo: boolean
          archivo_nombre: string
          archivo_tamano: number
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          estado: string
          fecha_recepcion: string | null
          fecha_solicitud: string | null
          fecha_vencimiento: string | null
          id: string
          nombre: string
          notas: string
          requisito: string
          storage_path: string
          tipo: string
          tipo_documento: string
          updated_at: string
          updated_by: number | null
          url: string
          vencimiento: string | null
          version: number
        }
        Insert: {
          activo?: boolean
          archivo_nombre?: string
          archivo_tamano?: number
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado?: string
          fecha_recepcion?: string | null
          fecha_solicitud?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          notas?: string
          requisito?: string
          storage_path?: string
          tipo?: string
          tipo_documento?: string
          updated_at?: string
          updated_by?: number | null
          url?: string
          vencimiento?: string | null
          version?: number
        }
        Update: {
          activo?: boolean
          archivo_nombre?: string
          archivo_tamano?: number
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado?: string
          fecha_recepcion?: string | null
          fecha_solicitud?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          notas?: string
          requisito?: string
          storage_path?: string
          tipo?: string
          tipo_documento?: string
          updated_at?: string
          updated_by?: number | null
          url?: string
          vencimiento?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      glosario: {
        Row: {
          categoria: string | null
          created_at: string | null
          definicion: string
          id: string
          termino: string
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          definicion: string
          id?: string
          termino: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          definicion?: string
          id?: string
          termino?: string
          updated_at?: string | null
        }
        Relationships: []
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
      historial_estados_admisiones: {
        Row: {
          admision_id: number
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          estado_anterior: string
          estado_nuevo: string
          fecha_hora: string
          id: number
          motivo_no_ingreso: string
          observacion: string
          sede_id: number | null
          updated_at: string
          updated_by: number | null
          usuario_id: number | null
        }
        Insert: {
          admision_id: number
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado_anterior?: string
          estado_nuevo: string
          fecha_hora?: string
          id?: number
          motivo_no_ingreso?: string
          observacion?: string
          sede_id?: number | null
          updated_at?: string
          updated_by?: number | null
          usuario_id?: number | null
        }
        Update: {
          admision_id?: number
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          estado_anterior?: string
          estado_nuevo?: string
          fecha_hora?: string
          id?: number
          motivo_no_ingreso?: string
          observacion?: string
          sede_id?: number | null
          updated_at?: string
          updated_by?: number | null
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_estados_admisiones_admision_id_fkey"
            columns: ["admision_id"]
            isOneToOne: false
            referencedRelation: "admisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_admisiones_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_admisiones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_admisiones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_admisiones_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_admisiones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
          lugar_entrega: string
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
          lugar_entrega?: string
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
          lugar_entrega?: string
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
      personas: {
        Row: {
          apellido: string
          created_at: string
          created_by: number | null
          documento_numero: string | null
          documento_tipo: string | null
          email: string | null
          etapa: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          observaciones: string
          sede_id: number | null
          telefono: string
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          apellido?: string
          created_at?: string
          created_by?: number | null
          documento_numero?: string | null
          documento_tipo?: string | null
          email?: string | null
          etapa?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          observaciones?: string
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          apellido?: string
          created_at?: string
          created_by?: number | null
          documento_numero?: string | null
          documento_tipo?: string | null
          email?: string | null
          etapa?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          observaciones?: string
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      planilla_estados: {
        Row: {
          ciclo: string
          concurrente_id: string
          estados: Json
          fecha_archivado: string | null
          fecha_entrega: string | null
          fecha_escaneo: string | null
          fecha_firma: string | null
          fecha_impresion: string | null
          fecha_recepcion: string | null
          id: string
          impresa_por: string
          lote_id: string | null
          mes: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ciclo?: string
          concurrente_id: string
          estados?: Json
          fecha_archivado?: string | null
          fecha_entrega?: string | null
          fecha_escaneo?: string | null
          fecha_firma?: string | null
          fecha_impresion?: string | null
          fecha_recepcion?: string | null
          id?: string
          impresa_por?: string
          lote_id?: string | null
          mes: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ciclo?: string
          concurrente_id?: string
          estados?: Json
          fecha_archivado?: string | null
          fecha_entrega?: string | null
          fecha_escaneo?: string | null
          fecha_firma?: string | null
          fecha_impresion?: string | null
          fecha_recepcion?: string | null
          id?: string
          impresa_por?: string
          lote_id?: string | null
          mes?: string
          tipo?: string
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
          {
            foreignKeyName: "planilla_estados_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      planilla_eventos: {
        Row: {
          concurrente_id: string | null
          created_at: string
          estado_anterior: string
          estado_nuevo: string
          id: string
          lote_id: string | null
          mes: string
          observaciones: string
          tipo: string
          usuario: string
        }
        Insert: {
          concurrente_id?: string | null
          created_at?: string
          estado_anterior?: string
          estado_nuevo: string
          id?: string
          lote_id?: string | null
          mes: string
          observaciones?: string
          tipo?: string
          usuario?: string
        }
        Update: {
          concurrente_id?: string | null
          created_at?: string
          estado_anterior?: string
          estado_nuevo?: string
          id?: string
          lote_id?: string | null
          mes?: string
          observaciones?: string
          tipo?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "planilla_eventos_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilla_eventos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      planillas: {
        Row: {
          activo: boolean
          concurrente_id: string
          created_at: string
          created_by: number | null
          estado_firma: string
          estado_recepcion: string
          fecha_baja: string | null
          fecha_limite: string | null
          fecha_recepcion: string | null
          id: number
          motivo_baja: string
          motivo_demora: string
          periodo: string | null
          responsable: string
          tipo_vencimiento_id: number | null
          ubicacion_actual: string
          updated_at: string
          updated_by: number | null
          usuario_baja: number | null
        }
        Insert: {
          activo?: boolean
          concurrente_id: string
          created_at?: string
          created_by?: number | null
          estado_firma?: string
          estado_recepcion?: string
          fecha_baja?: string | null
          fecha_limite?: string | null
          fecha_recepcion?: string | null
          id?: number
          motivo_baja?: string
          motivo_demora?: string
          periodo?: string | null
          responsable?: string
          tipo_vencimiento_id?: number | null
          ubicacion_actual?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Update: {
          activo?: boolean
          concurrente_id?: string
          created_at?: string
          created_by?: number | null
          estado_firma?: string
          estado_recepcion?: string
          fecha_baja?: string | null
          fecha_limite?: string | null
          fecha_recepcion?: string | null
          id?: number
          motivo_baja?: string
          motivo_demora?: string
          periodo?: string | null
          responsable?: string
          tipo_vencimiento_id?: number | null
          ubicacion_actual?: string
          updated_at?: string
          updated_by?: number | null
          usuario_baja?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planillas_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_tipo_vencimiento_id_fkey"
            columns: ["tipo_vencimiento_id"]
            isOneToOne: false
            referencedRelation: "tipos_vencimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_usuario_baja_fkey"
            columns: ["usuario_baja"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prestacion_horarios: {
        Row: {
          created_at: string
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          horas: number
          id: string
          observaciones: string
          prestacion_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          hora_fin?: string
          hora_inicio?: string
          horas?: number
          id?: string
          observaciones?: string
          prestacion_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          horas?: number
          id?: string
          observaciones?: string
          prestacion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestacion_horarios_prestacion_id_fkey"
            columns: ["prestacion_id"]
            isOneToOne: false
            referencedRelation: "concurrente_prestaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimientos: {
        Row: {
          categoria: string
          created_at: string | null
          historial: Json | null
          id: string
          paso_a_paso: string
          titulo: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          historial?: Json | null
          id?: string
          paso_a_paso: string
          titulo: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          historial?: Json | null
          id?: string
          paso_a_paso?: string
          titulo?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      profesionales: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          created_by: number | null
          dni: string
          email: string
          fecha_ingreso: string | null
          id: string
          matricula: string
          nombre: string
          observaciones: string
          profesion: string
          sede_id: number | null
          telefono: string
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          activo?: boolean
          apellido?: string
          created_at?: string
          created_by?: number | null
          dni?: string
          email?: string
          fecha_ingreso?: string | null
          id?: string
          matricula?: string
          nombre?: string
          observaciones?: string
          profesion?: string
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          created_by?: number | null
          dni?: string
          email?: string
          fecha_ingreso?: string | null
          id?: string
          matricula?: string
          nombre?: string
          observaciones?: string
          profesion?: string
          sede_id?: number | null
          telefono?: string
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profesionales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesionales_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profesionales_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_horas: {
        Row: {
          concurrente_id: string
          created_at: string
          fecha: string
          horas: number
          id: string
          mes: string
          observaciones: string
          prestacion_id: string | null
          tipo: string
          updated_at: string
          usuario: string
        }
        Insert: {
          concurrente_id: string
          created_at?: string
          fecha?: string
          horas?: number
          id?: string
          mes?: string
          observaciones?: string
          prestacion_id?: string | null
          tipo?: string
          updated_at?: string
          usuario?: string
        }
        Update: {
          concurrente_id?: string
          created_at?: string
          fecha?: string
          horas?: number
          id?: string
          mes?: string
          observaciones?: string
          prestacion_id?: string | null
          tipo?: string
          updated_at?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_horas_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_horas_prestacion_id_fkey"
            columns: ["prestacion_id"]
            isOneToOne: false
            referencedRelation: "concurrente_prestaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      reglas_planilla: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          modo_facturacion: string
          mutual: string
          nombre: string
          observaciones: string
          prestacion: string
          prioridad: number
          tipo_planilla: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          modo_facturacion?: string
          mutual?: string
          nombre?: string
          observaciones?: string
          prestacion?: string
          prioridad?: number
          tipo_planilla: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          modo_facturacion?: string
          mutual?: string
          nombre?: string
          observaciones?: string
          prestacion?: string
          prioridad?: number
          tipo_planilla?: string
          updated_at?: string
        }
        Relationships: []
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
      respaldo_config: {
        Row: {
          created_at: string
          id: boolean
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      respaldos: {
        Row: {
          created_at: string
          detalle: string
          estado: string
          id: string
          origen: string
          storage_path: string
          tablas: string
          tamano: number
          tipo: string
          total_registros: number
          updated_at: string
          usuario: string
        }
        Insert: {
          created_at?: string
          detalle?: string
          estado?: string
          id?: string
          origen?: string
          storage_path?: string
          tablas?: string
          tamano?: number
          tipo?: string
          total_registros?: number
          updated_at?: string
          usuario?: string
        }
        Update: {
          created_at?: string
          detalle?: string
          estado?: string
          id?: string
          origen?: string
          storage_path?: string
          tablas?: string
          tamano?: number
          tipo?: string
          total_registros?: number
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          activa: boolean
          id: number
          nombre: string
        }
        Insert: {
          activa?: boolean
          id?: number
          nombre: string
        }
        Update: {
          activa?: boolean
          id?: number
          nombre?: string
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
      tipos_vencimiento: {
        Row: {
          activo: boolean
          dias_plazo: number
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean
          dias_plazo?: number
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean
          dias_plazo?: number
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      transporte_servicios: {
        Row: {
          comprobante_anses: boolean
          concurrente_id: string | null
          created_at: string
          dias: string
          empresa: string
          estado: string
          fecha_comprobante: string | null
          hora_ida: string
          hora_vuelta: string
          id: string
          mes: string
          monto: number
          observaciones: string
          recorrido: string
          updated_at: string
        }
        Insert: {
          comprobante_anses?: boolean
          concurrente_id?: string | null
          created_at?: string
          dias?: string
          empresa?: string
          estado?: string
          fecha_comprobante?: string | null
          hora_ida?: string
          hora_vuelta?: string
          id?: string
          mes: string
          monto?: number
          observaciones?: string
          recorrido?: string
          updated_at?: string
        }
        Update: {
          comprobante_anses?: boolean
          concurrente_id?: string | null
          created_at?: string
          dias?: string
          empresa?: string
          estado?: string
          fecha_comprobante?: string | null
          hora_ida?: string
          hora_vuelta?: string
          id?: string
          mes?: string
          monto?: number
          observaciones?: string
          recorrido?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporte_servicios_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      transporte_solicitudes: {
        Row: {
          activo: boolean
          admision_id: number | null
          chofer: string
          concurrente_id: string | null
          created_at: string
          created_by: number | null
          dias: string
          domicilio_destino: string
          domicilio_origen: string
          empresa: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_solicitud: string
          financiador: string
          hora_ida: string
          hora_vuelta: string
          id: string
          monto_mensual: number
          motivo_rechazo: string
          observaciones: string
          requiere_acompanante: boolean
          sede_id: number | null
          telefono_transportista: string
          tipo_traslado: string
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          activo?: boolean
          admision_id?: number | null
          chofer?: string
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          dias?: string
          domicilio_destino?: string
          domicilio_origen?: string
          empresa?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_solicitud?: string
          financiador?: string
          hora_ida?: string
          hora_vuelta?: string
          id?: string
          monto_mensual?: number
          motivo_rechazo?: string
          observaciones?: string
          requiere_acompanante?: boolean
          sede_id?: number | null
          telefono_transportista?: string
          tipo_traslado?: string
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          activo?: boolean
          admision_id?: number | null
          chofer?: string
          concurrente_id?: string | null
          created_at?: string
          created_by?: number | null
          dias?: string
          domicilio_destino?: string
          domicilio_origen?: string
          empresa?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_solicitud?: string
          financiador?: string
          hora_ida?: string
          hora_vuelta?: string
          id?: string
          monto_mensual?: number
          motivo_rechazo?: string
          observaciones?: string
          requiere_acompanante?: boolean
          sede_id?: number | null
          telefono_transportista?: string
          tipo_traslado?: string
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transporte_solicitudes_admision_id_fkey"
            columns: ["admision_id"]
            isOneToOne: false
            referencedRelation: "admisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporte_solicitudes_concurrente_id_fkey"
            columns: ["concurrente_id"]
            isOneToOne: false
            referencedRelation: "concurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporte_solicitudes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporte_solicitudes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporte_solicitudes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          contacto: string
          created_at: string
          dni: string
          estado: string
          fecha: string
          hora: string
          id: string
          nombre: string
          notas: string
          obra_social: string
          persona_id: string | null
          profesional: string
          resultado: string
          sede_id: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          contacto?: string
          created_at?: string
          dni?: string
          estado?: string
          fecha: string
          hora?: string
          id?: string
          nombre: string
          notas?: string
          obra_social?: string
          persona_id?: string | null
          profesional?: string
          resultado?: string
          sede_id?: number | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          contacto?: string
          created_at?: string
          dni?: string
          estado?: string
          fecha?: string
          hora?: string
          id?: string
          nombre?: string
          notas?: string
          obra_social?: string
          persona_id?: string | null
          profesional?: string
          resultado?: string
          sede_id?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_user_id: string | null
          created_at: string
          email: string
          id: number
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: number
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: number
          nombre?: string
          rol?: string
          updated_at?: string
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
      admision_registrar: {
        Args: {
          p_admision: Json
          p_admision_id: number
          p_persona: Json
          p_usuario_id?: number
        }
        Returns: Json
      }
      get_concurrente_timeline: {
        Args: { p_concurrente_id: string }
        Returns: {
          descripcion: string
          estado: string
          fecha: string
          link_id: string
          origen_tabla: string
          tipo_evento: string
        }[]
      }
      importar_concurrentes_lote: { Args: { p_items: Json }; Returns: Json }
      kalen_rol: { Args: never; Returns: string }
      respaldo_cron_token: { Args: never; Returns: string }
      resumen_aprossy: {
        Args: { p_concurrente_id: string; p_mes: string }
        Returns: Json
      }
      set_ciclo_lote: {
        Args: { p_ciclo: string; p_lote_id: string }
        Returns: number
      }
      set_ciclo_planillas:
        | {
            Args: {
              p_ciclo: string
              p_ids: string[]
              p_lote_id?: string
              p_mes: string
              p_usuario?: string
            }
            Returns: number
          }
        | {
            Args: {
              p_ciclo: string
              p_ids: string[]
              p_lote_id?: string
              p_mes: string
              p_observaciones?: string
              p_tipo?: string
              p_usuario?: string
            }
            Returns: number
          }
      set_lote_items: {
        Args: { p_items: Json; p_lote_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
