import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { usePermisos } from "@/hooks/use-permisos";
import { useAlertas } from "@/hooks/use-alertas";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Bus,
  Stethoscope,

  Receipt,
  FolderOpen,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Search,
  Menu,
  X,
  Building2,
  LogOut,
  Loader2,
  BellRing,
  Boxes,
  ClipboardCheck,
  PenLine,
  UtensilsCrossed,
  StickyNote,
  Gauge,
  CalendarClock,
  IdCard,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  DatabaseBackup,
  Phone,
  Send,
  BookOpen,
  Book,
  FileOutput
  Briefcase,



} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { fetchConcurrentes } from "@/lib/api";
import { iniciales } from "@/lib/format";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/alertas", label: "Alertas", icon: BellRing },
  { to: "/concurrentes", label: "Concurrentes", icon: Users },
  { to: "/ficha-maestra", label: "Ficha maestra", icon: IdCard },
  { to: "/admisiones", label: "Admisiones", icon: UserPlus },
  { to: "/planillas", label: "Planillas", icon: ClipboardList },
  { to: "/comunicaciones", label: "Comunicaciones", icon: MessageSquare },
  { to: "/directorio", label: "Directorio", icon: Phone },
  { to: "/envios-mensuales", label: "Envíos mensuales", icon: Send },
  { to: "/procedimientos", label: "Procedimientos", icon: BookOpen },
  { to: "/glosario", label: "Glosario", icon: Book },

  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/turnero", label: "Turnero", icon: ClipboardList },
  { to: "/prestaciones", label: "Prestaciones", icon: FileSpreadsheet },
  { to: "/profesionales", label: "Profesionales", icon: Stethoscope },
  { to: "/transporte", label: "Transporte", icon: Bus },

  { to: "/secretaria", label: "Secretaría", icon: ClipboardCheck },
  { to: "/centro-control", label: "Centro de control", icon: Gauge },
  { to: "/cronograma", label: "Cronograma", icon: CalendarClock },
  { to: "/lotes", label: "Lotes", icon: Boxes },
  { to: "/rutinas", label: "Rutinas", icon: ClipboardCheck },
   
  { to: "/papeletas-salida", label: "Papeletas", icon: FileOutput },
  { to: "/legajos-personal", label: "Legajos personal", icon: Briefcase },


  


  { to: "/viandas", label: "Viandas", icon: UtensilsCrossed },
  { to: "/notas", label: "Notas rápidas", icon: StickyNote },
  { to: "/kanban", label: "Kanban", icon: ClipboardList },
  { to: "/firmas", label: "Firmas", icon: PenLine },
  { to: "/facturacion", label: "Facturación", icon: Receipt },
  { to: "/documentacion", label: "Documentación", icon: FolderOpen },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/informe-mensual", label: "Informe mensual", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
  { to: "/respaldos", label: "Respaldos", icon: DatabaseBackup },
  { to: "/admin/usuarios", label: "Usuarios y roles", icon: ShieldCheck, soloAdmin: true },

] as const;

const SECTIONS = [
  {
    label: "Operativo",
    items: [
      "/", "/alertas", "/concurrentes", "/ficha-maestra", "/admisiones",
      "/calendario", "/turnero", "/prestaciones", "/profesionales",
      "/transporte", "/viandas", "/comunicaciones", "/directorio",
    ],
  },
  {
    label: "Secretaría",
    items: [
      "/secretaria", "/centro-control", "/cronograma", "/lotes",
      "/envios-mensuales", "/procedimientos", "/glosario", "/firmas",
      "/facturacion", "/documentacion", "/reportes", "/informe-mensual",
     "/rutinas", "/papeletas-salida", "/legajos-personal",
    ],
  },
  {
    label: "Sistema",
    items: [
      "/notas", "/kanban", "/configuracion", "/admin/usuarios",
    ],
  },
] as const;

/** Ítems visibles según el rol del usuario logueado. */
function useNavVisible() {
  const { esAdmin } = usePermisos();
  return NAV.filter((n) => !("soloAdmin" in n && n.soloAdmin) || esAdmin);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useNavVisible();
  const { total: totalAlertas } = useAlertas();

  const itemMap = new Map(items.map((i) => [i.to, i]));

  return (
    <nav className="flex flex-col gap-1 px-3">
      {SECTIONS.map((section) => {
        const sectionItems = section.items
          .map((to) => itemMap.get(to))
          .filter(Boolean) as typeof items;

        if (sectionItems.length === 0) return null;

        return (
          <div key={section.label} className="mb-2">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {sectionItems.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const badge = item.to === "/alertas" && totalAlertas > 0 ? totalAlertas : null;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {badge !== null && (
                      <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-6 py-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight">Centro de Día</p>
        <p className="truncate text-xs text-muted-foreground">Sistema de gestión</p>
      </div>
    </div>
  );
}

function GlobalSearch({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const items = useNavVisible();

  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    navigate({ to, search: search as never });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar por nombre, apellido o DNI… o ir a una sección" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Navegación">
          {items.map((n) => (
            <CommandItem key={n.to} value={`ir ${n.label}`} onSelect={() => go(n.to)}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Vista 360° de concurrentes">
          {personas.slice(0, 300).map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.apellido ?? ""} ${p.nombre} ${p.dni ?? ""} ${p.obra_social} ${p.prestacion}`}
              onSelect={() => go("/vista-360", { id: p.id })}
            >
              <span className="mr-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                {iniciales(p.nombre)}
              </span>
              <span className="truncate">{`${p.apellido ?? ""} ${p.nombre}`.trim()}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.dni || p.prestacion}</span>
            </CommandItem>
          ))}
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { session, cargando } = useSession();
  const { soloLectura, activo, cargando: cargandoRol } = usePermisos();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Muro de acceso: sin sesión no se renderiza ni se consulta nada del panel.
  useEffect(() => {
    if (!cargando && !session) navigate({ to: "/auth", replace: true });
  }, [cargando, session, navigate]);

  const cerrarSesion = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shortcut = useMemo(
    () => (typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    [],
  );

  if (session && !cargandoRol && !activo) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-base font-semibold">Acceso desactivado</p>
          <p className="text-sm text-muted-foreground">
            Tu usuario está inactivo. Pedile a un administrador que reactive tu acceso.
          </p>
          <button className="text-sm font-medium text-primary hover:underline" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (cargando || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto pb-6">
          <NavLinks />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 animate-slide-in-right flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="mr-4 text-muted-foreground" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</h1>
              {description && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                Buscar
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {shortcut}
                </kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent sm:hidden"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </button>
              {soloLectura && (
                <span className="hidden rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">
                  Solo lectura
                </span>
              )}
              <button
                onClick={toggle}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={cerrarSesion}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>

            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-6">{actions}</div>}
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </div>
  );
}
