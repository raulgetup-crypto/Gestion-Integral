CREATE OR REPLACE FUNCTION public.get_concurrente_timeline(p_concurrente_id uuid)
 RETURNS TABLE(fecha timestamp with time zone, tipo_evento text, descripcion text, estado text, link_id text, origen_tabla text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT a.created_at, 'admision'::text,
         COALESCE(NULLIF(a.motivo_consulta,''),'Solicitud de admisión'),
         a.estado, a.id::text, 'admisiones'::text
    FROM public.admisiones a WHERE a.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT h.fecha_hora, 'admision_estado'::text,
         CASE WHEN COALESCE(h.estado_anterior,'') = '' THEN 'Alta de admisión'
              ELSE 'Cambio de estado: ' || h.estado_anterior || ' → ' || h.estado_nuevo END
           || CASE WHEN COALESCE(h.motivo_no_ingreso,'') <> '' THEN ' · ' || h.motivo_no_ingreso ELSE '' END,
         h.estado_nuevo, h.admision_id::text, 'historial_estados_admisiones'::text
    FROM public.historial_estados_admisiones h WHERE h.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT d.created_at, 'documento'::text,
         COALESCE(NULLIF(d.tipo_documento,''), d.nombre)
           || CASE WHEN d.fecha_vencimiento IS NOT NULL THEN ' · vence ' || to_char(d.fecha_vencimiento,'DD/MM/YYYY') ELSE '' END,
         d.estado, d.id::text, 'documentos'::text
    FROM public.documentos d WHERE d.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT p.created_at, 'planilla'::text,
         COALESCE((SELECT t.nombre FROM public.tipos_vencimiento t WHERE t.id = p.tipo_vencimiento_id), 'Planilla')
           || COALESCE(' · ' || to_char(p.periodo,'YYYY-MM'), ''),
         p.estado_recepcion, p.id::text, 'planillas'::text
    FROM public.planillas p WHERE p.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT c.fecha, 'comunicacion'::text,
         COALESCE(NULLIF(c.mensaje_enviado,''),'Comunicación') ,
         COALESCE(NULLIF(c.medio,''),''), c.id::text, 'comunicaciones'::text
    FROM public.comunicaciones c WHERE c.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT t.created_at, 'transporte'::text,
         'Traslado ' || COALESCE(NULLIF(t.tipo_traslado,''),'') 
           || CASE WHEN COALESCE(t.empresa,'') <> '' THEN ' · ' || t.empresa ELSE '' END
           || CASE WHEN COALESCE(t.financiador,'') <> '' THEN ' · ' || t.financiador ELSE '' END,
         t.estado, t.id::text, 'transporte_solicitudes'::text
    FROM public.transporte_solicitudes t WHERE t.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT v.created_at, 'vianda'::text,
         'Viandas ' || COALESCE(NULLIF(v.mes,''), to_char(v.fecha,'YYYY-MM'))
           || ' · ' || v.cantidad::text || ' unidad(es)'
           || CASE WHEN v.comprobante_recibido THEN ' · comprobante recibido' ELSE ' · sin comprobante' END,
         v.estado, v.id::text, 'viandas'::text
    FROM public.viandas v WHERE v.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT cp.created_at, 'profesional'::text,
         'Equipo: ' || COALESCE(pr.apellido,'') || ' ' || COALESCE(pr.nombre,'')
           || CASE WHEN COALESCE(pr.profesion,'') <> '' THEN ' (' || pr.profesion || ')' ELSE '' END
           || CASE WHEN COALESCE(cp.rol,'') <> '' THEN ' · ' || cp.rol ELSE '' END
           || CASE WHEN cp.referente THEN ' · referente' ELSE '' END,
         CASE WHEN cp.activa THEN 'activa' ELSE 'finalizada' END,
         cp.id::text, 'concurrente_profesionales'::text
    FROM public.concurrente_profesionales cp
    JOIN public.profesionales pr ON pr.id = cp.profesional_id
   WHERE cp.concurrente_id = p_concurrente_id
  ORDER BY 1 DESC;
$function$;