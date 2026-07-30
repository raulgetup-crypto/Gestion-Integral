## Análisis de lo que existe hoy

El panel actual (1.272 líneas en un solo archivo) tiene 8 pestañas: Inicio, Planilla mensual, Turnero, Mensajes, Tareas, Fechas, Catálogos y Ayuda. Contiene la base real de concurrentes (BASE MAESTRA + TRANSPORTE) embebida en el código.

Tres problemas serios detectados:

1. **Los datos no se guardan.** Todo usa `window.storage.get/set`, una API que no existe en un navegador. Cada llamada falla en silencio (los `catch` están vacíos). Hoy, al recargar la página se pierde todo: estados de planilla, turnos, tareas, altas y bajas.
2. **La base de concurrentes está escrita a mano en el código.** No se puede consultar, filtrar ni respaldar bien, y crece sin control.
3. **Todo vive en un único archivo** con estilos en línea, lo que impide reutilizar componentes y hace lento cada cambio.

## Mejoras que propongo para la productividad diaria

Pensando en un administrativo que trabaja todo el día con cientos de concurrentes:

- **Buscador global con Cmd/Ctrl+K**: escribís tres letras y saltás a la ficha, sin navegar por pestañas.
- **Vista tabla densa tipo Airtable** para concurrentes: ordenar por columna, filtros combinados (prestación, mutual, responsable, estado) y filtros guardados.
- **Edición en línea y acciones masivas**: marcar planilla de 20 personas de una vez, en lugar de una por una.
- **Panel lateral de ficha** que se abre sin perder el listado ni los filtros detrás.
- **Bandeja "Pendientes de hoy"** en el dashboard: documentos vencidos, planillas sin enviar, consultas sin responder, eventos próximos — todo accionable con un clic.
- **Atajos**: `N` nuevo concurrente, `T` nueva tarea, `/` buscar, `Esc` cerrar panel.

## Plan de implementación

### Fase 1 — Backend real (Lovable Cloud)
Activar Lovable Cloud y migrar la persistencia rota a base de datos:
- Tablas: `concurrentes`, `prestaciones_catalogo`, `mutuales`, `responsables`, `planilla_estados`, `turnos`, `tareas`, `eventos`, `mensajes`, `documentos`, `facturacion`, `historial`.
- Migración con los datos reales actuales cargados como filas (no se pierde nada).
- Almacenamiento de archivos para documentación (PDF, imágenes, Word) con fecha de vencimiento.
- Registro automático en `historial` de cada alta, edición, cambio de prestación y documento.

### Fase 2 — Sistema de diseño y layout
- Sidebar fija con las 10 secciones e iconografía consistente; colapsable y con menú inferior en móvil.
- Tokens de color suaves, modo claro y oscuro, tipografía moderna, tarjetas y densidad tipo Linear.
- Componentes reutilizables: DataTable, StatCard, SidePanel, EmptyState, ConfirmDialog, toasts de éxito/error, skeletons de carga.

### Fase 3 — Módulos
- **Inicio**: dashboard con activos, bajas, prestaciones, transportes, eventos próximos, documentación pendiente, facturación pendiente, planillas pendientes y últimas actividades.
- **Concurrentes**: tabla + ficha lateral completa (personal, prestaciones, obra social, responsable, contacto, documentos, historial, observaciones, eventos, facturación).
- **Calendario**: vistas mensual, semanal y diaria + lista de próximos; eventos con título, fecha, hora, prioridad, categoría, color, estado y descripción.
- **Turnero**: agregar, editar, mover, eliminar, buscar y filtrar, con guardado automático en base de datos.
- **Prestaciones / Transporte / Facturación / Documentación**: vistas dedicadas derivadas de la planilla actual, sin perder ninguna función existente.
- **Reportes**: gráficos por prestación, por mutual, cantidades IE / CET / CD / Transporte y facturación mensual.
- **Configuración**: catálogos actuales + preferencias.

### Fase 4 — Pulido
Animaciones suaves, confirmaciones antes de eliminar, estados de carga y error, responsive completo, atajos de teclado y exportación a Excel (ya presente, se conserva).

## Notas técnicas

- Se conservan todas las funciones actuales; las pestañas Tareas, Mensajes, Fechas y Ayuda se mantienen dentro de la nueva navegación.
- Se reemplaza `window.storage` por consultas a la base de datos con TanStack Query (caché, sin renders innecesarios).
- El archivo único se divide en rutas por sección y componentes compartidos.
- La base actual de concurrentes se importa una sola vez en la migración inicial.

## Alcance por entrega

Es un trabajo grande. Propongo entregar Fase 1 + 2 + el módulo Concurrentes y Dashboard en la primera iteración, y seguir con Calendario, Turnero, Reportes y Documentación en la siguiente. Si preferís otro orden, decímelo.
