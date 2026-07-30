import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import {
  Plus, Check, Clock, Circle, Trash2, X, ChevronRight,
  ClipboardList, CalendarClock, ListChecks, Search, User, ArrowLeft,
  Home, Settings, HelpCircle, Moon, Sun, Download, Pencil, Archive, ArchiveRestore,
  CalendarCheck, MessageCircle, PhoneCall,
} from "lucide-react";

/* ---------- Datos reales de base: BASE MAESTRA + BASE TRANSPORTE (activos al momento de la carga) ---------- */
const PEOPLE_BASE = [{"id": "m1", "nombre": "Aramunt Mateo", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-MIE-JUE", "horarios": "MAR 9:30 A 11:30/ MIE 10 A 11:30 /JUE 9:30 A 11:30", "responsable": "CAMILA DIAZ", "mail": "diazcamilaromina990@gmail.com", "wsp": "3584 84-8952", "notas": "15 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m2", "nombre": "Alcala Santino", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-MIE-JUE", "horarios": "DE 14 A16HS", "responsable": "ABIGAIL NOVAS", "mail": "abigail_novas_@hotmail.com", "wsp": "3584 85-6332", "notas": "16 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m3", "nombre": "Alturria Aliek Mikeas", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-JUE-VIE", "horarios": "DE 14 A16HS", "responsable": "VERONICA LUCERO", "mail": "Ulivero04@gmail.com", "wsp": "3584 25-8654", "notas": "16 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m4", "nombre": "Bakanouwski Brisa", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-JUE-VIE", "horarios": "DE 08 A 10HS", "responsable": "MARINA GIORDANO", "mail": "marinagiordano@hotmail.com", "wsp": "3585 61-9301", "notas": "16 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m5", "nombre": "Bigo Isaias Martin", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "2", "diasEspecificos": "MIE-VIE", "horarios": "DE 14 A 17HS", "responsable": "CAROLINA BRAGA", "mail": "carobraga16@gmail.com", "wsp": "3584 11-3255", "notas": "18 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m6", "nombre": "Borges Uriel", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MIE-JUE-VIE", "horarios": "MIE Y JUE DE 15 A 17HS/ VIE DE 11 A 13HS", "responsable": "JULIA BAZTERRECHEA", "mail": "juli.bazte@gmail.com", "wsp": "3385 40-2763", "notas": "18 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m7", "nombre": "Bustos Santino", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-JUE-VIE", "horarios": "LUN 9:30 A 10:30/ JUE 7:30 A 9:30/ VIE 7:30 A 10:30", "responsable": "GISELA FERNANDEZ", "mail": "gisenafernandez@gmail.com", "wsp": "3584 02-9426", "notas": "17 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m8", "nombre": "Devia Helena", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-MIE-JUE", "horarios": "MAR 10 A 12/ MIE 8 A 10/ JUE 10 A 12", "responsable": "GISELA FERNANDEZ", "mail": "gisenafernandez@gmail.com", "wsp": "3584 02-9426", "notas": "16 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m9", "nombre": "Cisneros Valentin", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MIE-VIE", "horarios": "DE 14 A 16HS", "responsable": "ACOSTA PAMELA", "mail": "piaypame3254@gmail.com", "wsp": "3385 46-5672", "notas": "16 horas ENV", "observaciones": "SE ENVIA POR CORREO A NATASHA OVIEDO TODO JUNTO CISNEROS VALENTIN Y MOYANO MIA, SON DE LABOULAYE", "tipo": "prestacion"}, {"id": "m10", "nombre": "Farias Mateo Nicolas", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "2", "diasEspecificos": "MAR-JUE", "horarios": "DE 16 A 18HS", "responsable": "DE ARMAS MILAGROS", "mail": "milagrosda1999@gmail.com", "wsp": "3385 43-2647", "notas": "10 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m11", "nombre": "Fernandez Scamperte Lisandro", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MAR-JUE", "horarios": "DE 16 A 18HS", "responsable": "VIVIANA PEREZ", "mail": "vivianamperez@hotmail.com", "wsp": "3585 02-7374", "notas": "14 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m12", "nombre": "Legman Paulina", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "2", "diasEspecificos": "MAR-JUE", "horarios": "DE 13:20 A 16:20HS", "responsable": "MICAELA CONTRERA", "mail": "contrerasmicaela9@gmail.com", "wsp": "3582 44-0843", "notas": "15 horas ENV", "observaciones": "ACHIRAS", "tipo": "prestacion"}, {"id": "m13", "nombre": "Moyano Martina Mia", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MIE-VIE", "horarios": "DE 15 A 17HS", "responsable": "NATHASA OVIEDO", "mail": "natashaoviedo1998@gmail.com", "wsp": "3385 40-6634", "notas": "16 horas ENV", "observaciones": "SON DE LABOULAYE", "tipo": "prestacion"}, {"id": "m14", "nombre": "Reynoso Fernandez Elias", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MIE-VIE", "horarios": "LUN 8:30 A 10:30/ MIE 7:30 A 9:30 / VIE 8:30 A 10:30", "responsable": "AGUSTINA ACOSTA", "mail": "agustina.00acosta@gmail.com", "wsp": "3583 43-9354", "notas": "16 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m15", "nombre": "Torres Santino", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "2", "diasEspecificos": "MAR-JUE", "horarios": "DE 9:00 A 12:00", "responsable": "SOL VICARI", "mail": "sool.vicari00@gmail.com", "wsp": "3584 82-5383", "notas": "15 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m16", "nombre": "Lunetta Bruno", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-JUEV-VIE (mar 8 a10, jueves y viernes de 9 a 11)", "horarios": "", "responsable": "CLAUDIA SALINAS", "mail": "clarisasalinas05@gmail.com", "wsp": "3584297383.0", "notas": "16 horas", "observaciones": "TIENE MIE, SE VA A PASAR A IE", "tipo": "prestacion"}, {"id": "m17", "nombre": "Alcoba Benjamin Ariel", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MIER-VIER 15:30 A 17:30", "horarios": "", "responsable": "Helena Perez", "mail": "", "wsp": "3586 00-4122", "notas": "16 horas ENV", "observaciones": "AUDITORIA", "tipo": "prestacion"}, {"id": "m18", "nombre": "Cordeyro, Emily", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUN-MAR-JUEVES", "horarios": "15 A 17", "responsable": "JAQUELINE BESSONE", "mail": "Jackybessone208@gmail.com", "wsp": "3585 13-1500", "notas": "14 horas ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m19", "nombre": "Chavero Yeray Ezequiel", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUNES-MARTES Y JUEVES", "horarios": "DE 9 A 11", "responsable": "DE ARMAS MILAGROS", "mail": "milagrosda1999@gmail.com", "wsp": "3385 43-2647", "notas": "12 HORAS ENV", "observaciones": "", "tipo": "prestacion"}, {"id": "m20", "nombre": "Sosa Tejerina Valentin Arian", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "2", "diasEspecificos": "MIER-VIERNES", "horarios": "8 A 11", "responsable": "DANIELA CARRANZA", "mail": "danicarranzajl@gmail.com", "wsp": "3586 00-7564", "notas": "Agosto", "observaciones": "", "tipo": "prestacion"}, {"id": "m21", "nombre": "Contreras Tesando Valentino Joan", "grupo": "APROSS", "prestacion": "IE", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "LUNES, JUEVES Y VIERNES", "horarios": "LUNES Y JUEVES DE 15 A 18 Y VIERNES DE 13:30 A 15:30", "responsable": "Antequera Jesica Vanesa", "mail": "antequerajesica73@gmail.com", "wsp": "", "notas": "agosto", "observaciones": "", "tipo": "prestacion"}, {"id": "m22", "nombre": "Azcurra Ghigo", "grupo": "APROSS", "prestacion": "CET", "obraSocial": "APROSS V", "nAfiliado": "", "diasXSemana": "5", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "FIRMA EN KALEN", "tipo": "prestacion"}, {"id": "m23", "nombre": "Gatica Agustin", "grupo": "APROSS", "prestacion": "CET", "obraSocial": "APROSS V", "nAfiliado": "", "diasXSemana": "5", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m24", "nombre": "Guzman Nazareno", "grupo": "APROSS", "prestacion": "CET Y TT", "obraSocial": "APROSS V", "nAfiliado": "", "diasXSemana": "5", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m25", "nombre": "Meneguzzi Genaro", "grupo": "APROSS", "prestacion": "CET Y TT", "obraSocial": "APROSS V", "nAfiliado": "", "diasXSemana": "5", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "DANIELA DIALE", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m26", "nombre": "Rodriguez Agustina", "grupo": "APROSS", "prestacion": "CET", "obraSocial": "APROSS V", "nAfiliado": "", "diasXSemana": "5", "diasEspecificos": "TODOS LOS DIAS(LOS MIERCOLES TIENE TRANSPORTE, ABONA PARTICULAR)", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m27", "nombre": "Alonso Camila", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m28", "nombre": "Ayail Mauro", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "FIRMA EN KALEN", "tipo": "prestacion"}, {"id": "m29", "nombre": "Carreño Abel", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m30", "nombre": "Cenci Diego", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m31", "nombre": "Defant Lautaro", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m32", "nombre": "Manasero Juan", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m33", "nombre": "Zapatera Rocio", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m34", "nombre": "Bertola Guadalupe", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m35", "nombre": "Ulla Victoria", "grupo": "APROSS", "prestacion": "CD Y TT", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "firmada", "observaciones": "FIRMA EN KALEN", "tipo": "prestacion"}, {"id": "m36", "nombre": "Fernandez Ismael", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m37", "nombre": "Oberto Esteban", "grupo": "APROSS", "prestacion": "CD Y TT", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "V", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m38", "nombre": "Ryan Reineri", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "v", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m39", "nombre": "Gaitan Maria Fernanda", "grupo": "APROSS", "prestacion": "CD", "obraSocial": "APROSS", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "TODOS LOS DIAS DE 12 A 16HS", "horarios": "", "responsable": "", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m40", "nombre": "Ezquerro, Maria Leonor", "grupo": "OTRAS MUTUALES", "prestacion": "TCC", "obraSocial": "OSECAC", "nAfiliado": "58979142.0", "diasXSemana": "3", "diasEspecificos": "MARTES,MIERCOLES Y JUEVES", "horarios": "DNI:", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "FIRMA ACA", "observaciones": "FIRMA EN KALEN", "tipo": "prestacion"}, {"id": "m41", "nombre": "Falcon Mia", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSECAC", "nAfiliado": "49620403.0", "diasXSemana": "5", "diasEspecificos": "LUNES A VIERNES", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m42", "nombre": "Leaniz Benjamin", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSECAC", "nAfiliado": "47251137.0", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m43", "nombre": "Suarez Joaquin", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSECAC", "nAfiliado": "44549950.0", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "ENTREGA S FIN DE MES", "observaciones": "", "tipo": "prestacion"}, {"id": "m44", "nombre": "Mc Loughlin", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "OSECAC", "nAfiliado": "340255475.0", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m45", "nombre": "Ledesma Benjamin", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSECAC", "nAfiliado": "47363598.0", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m46", "nombre": "Principi Maria", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "ASPURC(L)", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "DANIELA DIALE", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m47", "nombre": "Llorente Facundo", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "IOSFA", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m48", "nombre": "Rivero Santo", "grupo": "OTRAS MUTUALES", "prestacion": "CET+AUT/TT+ AUT", "obraSocial": "PREVENCION SALUD", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "NO VIENE MAS", "horarios": "", "responsable": "DANIELA DIALE", "mail": "", "wsp": "", "notas": "", "observaciones": "FIRMA EN KALEN", "tipo": "prestacion"}, {"id": "m49", "nombre": "Lingua", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m50", "nombre": "Mansuino", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m51", "nombre": "Basso", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m52", "nombre": "Ferrer Eugenia", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m53", "nombre": "Lescano Alvaro", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m54", "nombre": "Ortolano Evelyne", "grupo": "OTRAS MUTUALES", "prestacion": "IE", "obraSocial": "PAMI (MAIL)", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "mveronica230@gmail.com", "responsable": "Veronica mendez", "mail": "", "wsp": "", "notas": "ENV", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m55", "nombre": "Palacios Luka", "grupo": "OTRAS MUTUALES", "prestacion": "IE", "obraSocial": "PAMI (MAIL)", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "meli.perrone1982@gmail.com", "responsable": "Melina Perrone", "mail": "", "wsp": "", "notas": "ENV", "observaciones": "SOLO SE FIRMAN Y SE DEJAN EN EL CENTRO", "tipo": "prestacion"}, {"id": "m56", "nombre": "Bracamonte Julieta", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "PAMI", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "SOLO SE FIRMAN, NO SE PRESENTAN", "horarios": "", "responsable": "", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m57", "nombre": "Fernandez Ulises", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSPECON", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m58", "nombre": "Santolin Luciano", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OPSA(L)", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m59", "nombre": "Guterman Benjamin", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "MUTUAL MEDICA", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m60", "nombre": "Britos Jeremias", "grupo": "OTRAS MUTUALES", "prestacion": "CET", "obraSocial": "MUTUAL MUNICIPAL", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "ENTREGA A FIN DE MES", "observaciones": "", "tipo": "prestacion"}, {"id": "m61", "nombre": "Alfonzo Zoe", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSPLYFC", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "no va mas", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m62", "nombre": "Acevedo", "grupo": "OTRAS MUTUALES", "prestacion": "CET +AUT / TT+ AUT", "obraSocial": "OSFATUN", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "DANIELA DIALE", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "m63", "nombre": "De Trueba Borja", "grupo": "OTRAS MUTUALES", "prestacion": "IE + AUT/ PS+ AUT", "obraSocial": "OSFATUN", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "PSICOPEDAGOGIA: MIE 17:15HS/ PS: MIE 18HS", "responsable": "DANIELA DIALE", "mail": "", "wsp": "", "notas": "", "observaciones": "FIRMA ACA EN KALEN/ CAMI ALCOBA-TANIA GALLARDO", "tipo": "prestacion"}, {"id": "m64", "nombre": "Zalaba Julian", "grupo": "OTRAS MUTUALES", "prestacion": "CET Y TT", "obraSocial": "OSPECOR (L)", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "becado", "observaciones": "", "tipo": "prestacion"}, {"id": "m65", "nombre": "Ledheros Joaquin", "grupo": "OTRAS MUTUALES", "prestacion": "TT", "obraSocial": "OSPECOR (L)", "nAfiliado": "", "diasXSemana": "3", "diasEspecificos": "MAR-MIE-JUE", "horarios": "DE 09 A 11 HS", "responsable": "ADMINISTRACION", "mail": "", "wsp": "", "notas": "", "observaciones": "MANDAR POR MAIL, LA DEVUELVEN POR TRANSPORTE", "tipo": "prestacion"}, {"id": "m66", "nombre": "Maria Pia Palacios Becerra", "grupo": "OTRAS MUTUALES", "prestacion": "CD Y TT", "obraSocial": "OSUTHGRA", "nAfiliado": "", "diasXSemana": "", "diasEspecificos": "", "horarios": "", "responsable": "HELIANA DEVIGILLI", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "prestacion"}, {"id": "t1", "nombre": "Bullo Vittoria Antonella", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "Lunes, Miercoles y jueves 9 a 11", "horarios": "", "responsable": "", "mail": "", "wsp": "3586548498.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t2", "nombre": "Ceballos Cristian", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585062339.0", "notas": "", "observaciones": "CON; con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t3", "nombre": "Coria Ruth Analia", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585175131.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t4", "nombre": "Cruz Julieta Victoria", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t5", "nombre": "Décima Gimena Valentina", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584846893.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t6", "nombre": "Farias Lautaro Leonel", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584304166.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t7", "nombre": "Garay Morena Abigail", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584856965.0", "notas": "", "observaciones": "CON; con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t8", "nombre": "Garcia Pamela Agostina", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES, MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t9", "nombre": "Gomez Thiago Joaquin", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "", "mail": "", "wsp": "3585486023.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t10", "nombre": "Luque Josue Leonel", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585134360.0", "notas": "", "observaciones": "CON; con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t11", "nombre": "Maldonado Claudio Yair", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "LUNES Y MIERCOLES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584833598.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t12", "nombre": "Ojeda Mateo", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "LUNES Y MIERCOLES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584206921.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t13", "nombre": "Oviedo Jeremías", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585129372.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t14", "nombre": "Peralta Nazareno Isaiah", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES , MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584365611.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t15", "nombre": "Suarez Francisco", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584288251.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t16", "nombre": "Torres Araceli", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3586004804.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t17", "nombre": "Vargas Ciro (Baja Julio 2026)", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t18", "nombre": "Zuñiga Schossow Gonzalo Damian", "grupo": "GHIGLIONE PATRICIA", "prestacion": "Transporte", "obraSocial": "GHIGLIONE PATRICIA", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584188645.0", "notas": "", "observaciones": "CON; con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t19", "nombre": "Acosta Leandro Sebastian", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "LUNES Y MIERCOLES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3517022317.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t20", "nombre": "Avila Thiago", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "MARTES. JUEVES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584399817.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t21", "nombre": "Celaye Eloy Nicolas", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585710664.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t22", "nombre": "Camargo Juan Ignacio", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "4.0", "diasEspecificos": "JUEVES", "horarios": "", "responsable": "", "mail": "", "wsp": "3584397564.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t23", "nombre": "Chiarotti Jines Franco", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "16.0", "diasEspecificos": "LUNES, MARTES, MIERCOLES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584126515.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t24", "nombre": "Cobos Thiago Ian", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585101980.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t25", "nombre": "Gatica Agustin Alejandro", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585185184.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t26", "nombre": "Gimenez Juan (3584 22-9297)", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t27", "nombre": "Godoy Montes Gustavo", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "JUEVES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584307794.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t28", "nombre": "Gonzalez Martin Dario", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "LUNES Y MIERCOLES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585182915.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t29", "nombre": "Leiva Valentin Gabriel", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585131657.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t30", "nombre": "Ojeda Giuliano Santiago", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES , MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584206921.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t31", "nombre": "Ortiz Alexander Gustavo", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "LUNES Y MIERCOLES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3586013680.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t32", "nombre": "Oviedo Angelo Matias", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES, MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585000631.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t33", "nombre": "Penna Axel Agustin", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y JUEVES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584834166.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t34", "nombre": "Penna Emanuel Isaías", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES, MIERCOLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584834166.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t35", "nombre": "Penna Tobias Benjamin", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "8.0", "diasEspecificos": "MARTES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584834166.0", "notas": "", "observaciones": "", "tipo": "transporte"}, {"id": "t36", "nombre": "Rodriguez Maico", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "MARTES, JUEVES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585179503.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t37", "nombre": "Rodriguez Facundo", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "22.0", "diasEspecificos": "TODOS LOS DIAS", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3585729486.0", "notas": "", "observaciones": "CON; con acompañante/chofer (*c)", "tipo": "transporte"}, {"id": "t38", "nombre": "Sarandon Luciano", "grupo": "KAYNES", "prestacion": "Transporte", "obraSocial": "KAYNES", "nAfiliado": "", "diasXSemana": "12.0", "diasEspecificos": "LUNES, MIEROLES Y VIERNES", "horarios": "", "responsable": "MONICA", "mail": "", "wsp": "3584119281.0", "notas": "", "observaciones": "con acompañante/chofer (*c)", "tipo": "transporte"}];

const emptyPersona = { nombre: "", grupo: "", prestacion: "", obraSocial: "", nAfiliado: "", diasXSemana: "", diasEspecificos: "", horarios: "", responsable: "", mail: "", wsp: "", notas: "", observaciones: "", tipo: "prestacion" };

const DEFAULT_CATALOGOS = {
  prestaciones: ["IE", "CET", "CD", "TT", "TCC", "CET Y TT", "CD Y TT"],
  mutuales: ["APROSS", "APROSS V", "OSECAC", "PAMI", "IOSFA", "PREVENCION SALUD", "OSPECON", "OPSA(L)", "MUTUAL MEDICA", "MUTUAL MUNICIPAL", "OSPLYFC", "OSFATUN", "OSPECOR (L)", "OSUTHGRA", "ASPURC(L)"],
  responsables: ["HELIANA DEVIGILLI", "DANIELA DIALE"],
};

const ESTADOS = [
  { key: "enviado", label: "ENV", full: "Enviado" },
  { key: "entregado", label: "ENT", full: "Entregado" },
  { key: "firmado", label: "FIR", full: "Firmado" },
  { key: "facturado", label: "FAC", full: "Facturado" },
  { key: "cobrado", label: "COB", full: "Cobrado" },
];

/* ---------- Theme (colores como CSS variables → soporta modo oscuro sin duplicar lógica) ---------- */
const INK = "var(--ink)";
const PAPER = "var(--paper)";
const CARD = "var(--card)";
const GREEN = "var(--green)";
const RED = "var(--red)";
const GOLD = "var(--gold)";
const MUTE = "var(--mute)";
const LINE = "var(--line)";
const BORDER = "var(--border)";

const ThemeCtx = createContext({ dark: false, toggle: () => {} });

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function formatFecha(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y.slice(2)}`; }
const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
function mesActual() {
  const d = new Date();
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function mesesDisponibles() {
  // Desde 1 mes atrás hasta diciembre 2026 inclusive
  const d = new Date();
  const opts = [];
  let y = d.getFullYear();
  let m = d.getMonth() - 1;
  if (m < 0) { m = 11; y -= 1; }
  while (y < 2026 || (y === 2026 && m <= 11)) {
    opts.push(`${MESES[m]} ${y}`);
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return opts;
}

const baseStyles = `
  :root {
    --paper: #EFEAE0; --ink: #232320; --card: #F7F4EC;
    --green: #3E6259; --red: #B4472B; --gold: #B08A2E;
    --mute: #7A7364; --line: #D8D2C4; --border: #B0A996;
  }
  .dark {
    --paper: #1C1C18; --ink: #ECE7DA; --card: #26261F;
    --green: #6FAE9B; --red: #E38A67; --gold: #D9BC72;
    --mute: #A69C87; --line: #3A392F; --border: #4C4A3B;
  }
  @keyframes stampIn { 0% { transform: scale(2.2) rotate(-8deg); opacity: 0; } 60% { transform: scale(0.95) rotate(-8deg); opacity: 1; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
  .stamp { animation: stampIn 0.35s ease-out; }
  .row-hover { transition: background 0.15s ease; cursor: pointer; }
  .row-hover:hover { background: rgba(128,128,128,0.08); }
  input, textarea, select { font-family: 'Georgia', serif; }
  input:focus, textarea:focus, select:focus { outline: 2px solid ${GREEN}; outline-offset: 1px; }
  button:focus-visible { outline: 2px solid ${GREEN}; outline-offset: 2px; }
  ::placeholder { color: ${MUTE}; opacity: 0.7; }
`;

/* ---------- Campo de ficha reutilizable ---------- */
function Campo({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", color: MUTE, fontFamily: "'Courier New', monospace", marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 15, color: INK }}>{value}</div>
    </div>
  );
}

/* ---------- Ficha individual (detalle + historial + editar + baja) ---------- */
function Ficha({ persona, onClose, onEdit, onBaja, historial, onAddHistorial }) {
  const [nota, setNota] = useState("");
  const esBaja = persona._baja;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.55)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAPER, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", borderRadius: "10px 10px 0 0", borderTop: `4px solid ${GOLD}` }}
      >
        <div style={{ position: "sticky", top: 0, background: INK, color: PAPER, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: PAPER, cursor: "pointer", padding: 4, display: "flex" }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: GOLD, fontFamily: "'Courier New', monospace" }}>FICHA {esBaja ? "· DE BAJA" : ""}</div>
            <div style={{ fontSize: 18 }}>{persona.nombre}</div>
          </div>
          <button onClick={() => onEdit(persona)} title="Editar" style={{ background: "none", border: `1px solid ${PAPER}`, color: PAPER, cursor: "pointer", padding: "6px 8px", borderRadius: 2, display: "flex" }}>
            <Pencil size={15} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, padding: "3px 8px", border: `1px solid ${INK}`, borderRadius: 2 }}>{persona.tipo === "transporte" ? "Transporte" : "Prestación"}</span>
            {persona.prestacion && <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, padding: "3px 8px", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: 2 }}>{persona.prestacion}</span>}
          </div>
          <Campo label="Obra social / mutual" value={persona.obraSocial} />
          <Campo label="Grupo / transportista" value={persona.grupo} />
          <Campo label="N° afiliado" value={persona.nAfiliado} />
          <Campo label="Días por semana" value={persona.diasXSemana} />
          <Campo label="Días específicos" value={persona.diasEspecificos} />
          <Campo label="Horarios" value={persona.horarios} />
          <Campo label="Responsable / contacto" value={persona.responsable} />
          <Campo label="Mail" value={persona.mail} />
          <Campo label="WhatsApp / teléfono" value={persona.wsp} />
          <Campo label="Notas" value={persona.notas} />
          <Campo label="Observaciones" value={persona.observaciones} />

          <div style={{ marginTop: 20, borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: MUTE, fontFamily: "'Courier New', monospace", marginBottom: 8 }}>HISTORIAL</div>
            {historial.length === 0 && <div style={{ fontSize: 13, color: MUTE, fontStyle: "italic", marginBottom: 10 }}>Sin entradas todavía.</div>}
            {historial.map((h) => (
              <div key={h.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MUTE }}>{formatFecha(h.date)}</div>
                <div style={{ fontSize: 14 }}>{h.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Agregar nota al historial..." style={{ flex: 1, padding: "8px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 2, background: "#0000", color: INK }} />
              <button onClick={() => { if (nota.trim()) { onAddHistorial(nota.trim()); setNota(""); } }} style={{ background: GREEN, color: "#fff", border: "none", padding: "8px 12px", borderRadius: 2, cursor: "pointer" }}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          <button
            onClick={() => onBaja(persona)}
            style={{ width: "100%", marginTop: 20, background: "transparent", border: `1px solid ${esBaja ? GREEN : RED}`, color: esBaja ? GREEN : RED, padding: "10px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {esBaja ? <><ArchiveRestore size={14} /> Reactivar concurrente</> : <><Archive size={14} /> Dar de baja</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Combo con catálogo (input + datalist, permite valor libre) ---------- */
function ComboCatalogo({ value, onChange, options, placeholder, listId, style }) {
  return (
    <>
      <input list={listId} value={value} onChange={onChange} placeholder={placeholder} style={style} />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}

/* ---------- Formulario agregar / editar concurrente ---------- */
function FormPersona({ initial, onSave, onCancel, catalogos }) {
  const [form, setForm] = useState(initial || emptyPersona);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const inputStyle = { width: "100%", padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, marginBottom: 10, boxSizing: "border-box", background: "transparent", color: INK };
  const labelStyle = { fontSize: 10, letterSpacing: "0.08em", color: MUTE, fontFamily: "'Courier New', monospace", marginBottom: 3, display: "block" };

  return (
    <div style={{ border: `1px solid ${INK}`, padding: 16, background: CARD }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE }}>{initial ? "EDITAR CONCURRENTE" : "NUEVO CONCURRENTE"}</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE }}><X size={18} /></button>
      </div>

      <label style={labelStyle}>TIPO</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {["prestacion", "transporte"].map((t) => (
          <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{ flex: 1, padding: "8px", fontSize: 13, fontFamily: "'Courier New', monospace", border: `1px solid ${INK}`, background: form.tipo === t ? INK : "transparent", color: form.tipo === t ? PAPER : INK, cursor: "pointer", borderRadius: 2 }}>
            {t === "prestacion" ? "Prestación" : "Transporte"}
          </button>
        ))}
      </div>

      <label style={labelStyle}>NOMBRE Y APELLIDO *</label>
      <input autoFocus value={form.nombre} onChange={set("nombre")} placeholder="Nombre completo" style={inputStyle} />

      <label style={labelStyle}>{form.tipo === "transporte" ? "TRANSPORTISTA" : "GRUPO"}</label>
      <input value={form.grupo} onChange={set("grupo")} placeholder={form.tipo === "transporte" ? "Ej: GHIGLIONE PATRICIA" : "Ej: APROSS"} style={inputStyle} />

      {form.tipo === "prestacion" && (
        <>
          <label style={labelStyle}>PRESTACIÓN</label>
          <ComboCatalogo listId="cat-prestaciones" value={form.prestacion} onChange={set("prestacion")} options={catalogos.prestaciones} placeholder="Ej: IE, CET, CD..." style={inputStyle} />
        </>
      )}

      <label style={labelStyle}>OBRA SOCIAL / MUTUAL</label>
      <ComboCatalogo listId="cat-mutuales" value={form.obraSocial} onChange={set("obraSocial")} options={catalogos.mutuales} placeholder="" style={inputStyle} />

      {form.tipo === "prestacion" && (
        <>
          <label style={labelStyle}>N° AFILIADO</label>
          <input value={form.nAfiliado} onChange={set("nAfiliado")} style={inputStyle} />
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DÍAS X SEMANA</label>
          <input value={form.diasXSemana} onChange={set("diasXSemana")} style={inputStyle} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>DÍAS ESPECÍFICOS</label>
          <input value={form.diasEspecificos} onChange={set("diasEspecificos")} placeholder="Ej: LUN-MIE-VIE" style={inputStyle} />
        </div>
      </div>

      {form.tipo === "prestacion" && (
        <>
          <label style={labelStyle}>HORARIOS</label>
          <input value={form.horarios} onChange={set("horarios")} style={inputStyle} />
        </>
      )}

      <label style={labelStyle}>RESPONSABLE / CONTACTO</label>
      <ComboCatalogo listId="cat-responsables" value={form.responsable} onChange={set("responsable")} options={catalogos.responsables} placeholder="" style={inputStyle} />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>MAIL</label>
          <input value={form.mail} onChange={set("mail")} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>WSP / TELÉFONO</label>
          <input value={form.wsp} onChange={set("wsp")} style={inputStyle} />
        </div>
      </div>

      <label style={labelStyle}>NOTAS</label>
      <textarea value={form.notas} onChange={set("notas")} rows={2} style={{ ...inputStyle, resize: "vertical" }} />

      <label style={labelStyle}>OBSERVACIONES</label>
      <textarea value={form.observaciones} onChange={set("observaciones")} rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }} />

      <button
        onClick={() => form.nombre.trim() && onSave(form)}
        disabled={!form.nombre.trim()}
        style={{ width: "100%", background: form.nombre.trim() ? GREEN : BORDER, color: "#fff", border: "none", padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: form.nombre.trim() ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        {initial ? "Guardar cambios" : "Guardar concurrente"} <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ================= TAB: INICIO (dashboard) ================= */
function TabInicio({ people, status, tasks, fechas, mensajes, onGoTab }) {
  const [q, setQ] = useState("");

  const pendientesTareas = tasks.filter((t) => t.status !== "hecho").length;
  const vencidasTareas = tasks.filter((t) => t.due && t.due < todayISO() && t.status !== "hecho").length;
  const fechasProximas = fechas.filter((f) => f.date >= todayISO() && f.date <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const faltaEnviar = people.filter((p) => !status[p.id]?.enviado).length;
  const consultasPendientes = mensajes.filter((m) => m.estado === "pendiente").length;

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const term = q.trim().toLowerCase();
    return {
      personas: people.filter((p) => p.nombre.toLowerCase().includes(term) || (p.obraSocial || "").toLowerCase().includes(term)).slice(0, 8),
      tareas: tasks.filter((t) => t.title.toLowerCase().includes(term)).slice(0, 8),
      fechas: fechas.filter((f) => f.title.toLowerCase().includes(term)).slice(0, 8),
    };
  }, [q, people, tasks, fechas]);

  const cardStyle = { border: `1px solid ${INK}`, padding: 14, background: CARD, borderRadius: 2, cursor: "pointer" };

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search size={14} style={{ position: "absolute", left: 8, top: 12, color: MUTE }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en todo el panel: concurrentes, tareas, fechas..."
          style={{ width: "100%", padding: "10px 8px 10px 28px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, boxSizing: "border-box", background: "transparent", color: INK }}
        />
      </div>

      {results ? (
        <div>
          {results.personas.length === 0 && results.tareas.length === 0 && results.fechas.length === 0 && (
            <div style={{ color: MUTE, fontSize: 14 }}>Sin resultados para "{q}".</div>
          )}
          {results.personas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MUTE, marginBottom: 6 }}>CONCURRENTES</div>
              {results.personas.map((p) => (
                <div key={p.id} onClick={() => onGoTab("planilla")} className="row-hover" style={{ padding: "8px 10px", border: `1px solid ${LINE}`, borderRadius: 2, marginBottom: 4 }}>
                  {p.nombre} <span style={{ color: MUTE, fontSize: 12 }}>· {p.obraSocial}</span>
                </div>
              ))}
            </div>
          )}
          {results.tareas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MUTE, marginBottom: 6 }}>TAREAS</div>
              {results.tareas.map((t) => (
                <div key={t.id} onClick={() => onGoTab("tareas")} className="row-hover" style={{ padding: "8px 10px", border: `1px solid ${LINE}`, borderRadius: 2, marginBottom: 4 }}>
                  {t.title}
                </div>
              ))}
            </div>
          )}
          {results.fechas.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MUTE, marginBottom: 6 }}>FECHAS</div>
              {results.fechas.map((f) => (
                <div key={f.id} onClick={() => onGoTab("fechas")} className="row-hover" style={{ padding: "8px 10px", border: `1px solid ${LINE}`, borderRadius: 2, marginBottom: 4 }}>
                  {formatFecha(f.date)} — {f.title}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={cardStyle} onClick={() => onGoTab("tareas")}>
              <div style={{ fontSize: 26, fontFamily: "'Courier New', monospace" }}>{pendientesTareas}</div>
              <div style={{ fontSize: 12, color: MUTE }}>tareas pendientes</div>
            </div>
            <div style={{ ...cardStyle, borderColor: vencidasTareas > 0 ? RED : INK }} onClick={() => onGoTab("tareas")}>
              <div style={{ fontSize: 26, fontFamily: "'Courier New', monospace", color: vencidasTareas > 0 ? RED : INK }}>{vencidasTareas}</div>
              <div style={{ fontSize: 12, color: MUTE }}>tareas vencidas</div>
            </div>
            <div style={{ ...cardStyle, borderColor: fechasProximas.length > 0 ? RED : INK }} onClick={() => onGoTab("fechas")}>
              <div style={{ fontSize: 26, fontFamily: "'Courier New', monospace", color: fechasProximas.length > 0 ? RED : INK }}>{fechasProximas.length}</div>
              <div style={{ fontSize: 12, color: MUTE }}>fechas en 3 días</div>
            </div>
            <div style={cardStyle} onClick={() => onGoTab("planilla")}>
              <div style={{ fontSize: 26, fontFamily: "'Courier New', monospace" }}>{faltaEnviar}</div>
              <div style={{ fontSize: 12, color: MUTE }}>sin enviar este mes</div>
            </div>
            <div style={{ ...cardStyle, borderColor: consultasPendientes > 0 ? RED : INK }} onClick={() => onGoTab("mensajes")}>
              <div style={{ fontSize: 26, fontFamily: "'Courier New', monospace", color: consultasPendientes > 0 ? RED : INK }}>{consultasPendientes}</div>
              <div style={{ fontSize: 12, color: MUTE }}>consultas sin responder</div>
            </div>
          </div>

          {(vencidasTareas > 0 || fechasProximas.length > 0) && (
            <div style={{ border: `1px solid ${RED}`, borderRadius: 2, padding: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: RED, marginBottom: 8 }}>ALERTAS</div>
              {vencidasTareas > 0 && <div style={{ fontSize: 14, marginBottom: 4 }}>Tenés {vencidasTareas} tarea(s) vencida(s).</div>}
              {fechasProximas.map((f) => (
                <div key={f.id} style={{ fontSize: 14 }}>{formatFecha(f.date)} — {f.title}</div>
              ))}
            </div>
          )}

          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MUTE, marginBottom: 8 }}>ACCESOS RÁPIDOS</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "planilla", label: "Planilla" },
              { key: "turnero", label: "Turnero" },
              { key: "mensajes", label: "Mensajes" },
              { key: "tareas", label: "Tareas" },
              { key: "fechas", label: "Fechas" },
              { key: "config", label: "Catálogos" },
              { key: "ayuda", label: "Ayuda" },
            ].map((t) => (
              <button key={t.key} onClick={() => onGoTab(t.key)} style={{ border: `1px solid ${INK}`, background: "transparent", color: INK, padding: "8px 14px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2 }}>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= TAB: PLANILLA MENSUAL ================= */
function TabPlanilla({ catalogos }) {
  const [mes, setMes] = useState(mesActual());
  const [status, setStatus] = useState({});
  const [extra, setExtra] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [bajas, setBajas] = useState({});
  const [historiales, setHistoriales] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [ficha, setFicha] = useState(null);
  const [editando, setEditando] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const key = `planilla:${mes}`;

  useEffect(() => {
    (async () => {
      try {
        const [rExtra, rOv, rBajas] = await Promise.all([
          window.storage.get("planilla:personas-nuevas", false).catch(() => null),
          window.storage.get("planilla:overrides", false).catch(() => null),
          window.storage.get("planilla:bajas", false).catch(() => null),
        ]);
        setExtra(rExtra && rExtra.value ? JSON.parse(rExtra.value) : []);
        setOverrides(rOv && rOv.value ? JSON.parse(rOv.value) : {});
        setBajas(rBajas && rBajas.value ? JSON.parse(rBajas.value) : {});
      } catch (e) {}
    })();
  }, []);

  const PEOPLE = useMemo(() => {
    const combined = [...PEOPLE_BASE, ...extra].map((p) => ({ ...p, ...(overrides[p.id] || {}), _baja: !!bajas[p.id] }));
    return combined;
  }, [extra, overrides, bajas]);

  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        setStatus(res && res.value ? JSON.parse(res.value) : {});
      } catch (e) {
        setStatus({});
      } finally {
        setLoaded(true);
      }
    })();
  }, [key]);

  const persist = useCallback(async (next) => {
    setStatus(next);
    try { await window.storage.set(key, JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [key]);

  const persistExtra = useCallback(async (next) => {
    setExtra(next);
    try { await window.storage.set("planilla:personas-nuevas", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, []);

  const persistOverrides = useCallback(async (next) => {
    setOverrides(next);
    try { await window.storage.set("planilla:overrides", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, []);

  const persistBajas = useCallback(async (next) => {
    setBajas(next);
    try { await window.storage.set("planilla:bajas", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, []);

  async function cargarHistorial(id) {
    if (historiales[id]) return historiales[id];
    try {
      const res = await window.storage.get(`historial:${id}`, false);
      const list = res && res.value ? JSON.parse(res.value) : [];
      setHistoriales((h) => ({ ...h, [id]: list }));
      return list;
    } catch (e) {
      setHistoriales((h) => ({ ...h, [id]: [] }));
      return [];
    }
  }

  async function addHistorial(id, texto) {
    const actual = historiales[id] || [];
    const next = [{ id: uid(), date: todayISO(), text: texto }, ...actual];
    setHistoriales((h) => ({ ...h, [id]: next }));
    try { await window.storage.set(`historial:${id}`, JSON.stringify(next), false); } catch (e) { console.error(e); }
  }

  function agregarConcurrente(form) {
    const nueva = { ...form, id: "x" + uid() };
    persistExtra([...extra, nueva]);
    setShowAdd(false);
  }

  function guardarEdicion(form) {
    const id = editando.id;
    const esExtra = id.startsWith("x");
    if (esExtra) {
      persistExtra(extra.map((p) => (p.id === id ? { ...form, id } : p)));
    } else {
      persistOverrides({ ...overrides, [id]: form });
    }
    setEditando(null);
    setFicha(null);
  }

  function toggleBaja(persona) {
    const next = { ...bajas };
    if (next[persona.id]) delete next[persona.id];
    else next[persona.id] = true;
    persistBajas(next);
    setFicha(null);
  }

  function toggle(id, campo, e) {
    e.stopPropagation();
    const cur = status[id] || {};
    const next = { ...status, [id]: { ...cur, [campo]: !cur[campo] } };
    persist(next);
  }

  function exportarExcel() {
    import("xlsx").then((XLSX) => {
      const rows = PEOPLE.filter((p) => !p._baja).map((p) => {
        const st = status[p.id] || {};
        const row = { Nombre: p.nombre, Tipo: p.tipo === "transporte" ? "Transporte" : "Prestación", Prestacion: p.prestacion, ObraSocial: p.obraSocial, Responsable: p.responsable };
        ESTADOS.forEach((e) => { row[e.full] = st[e.key] ? "SI" : "NO"; });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, mes.slice(0, 31));
      XLSX.writeFile(wb, `planilla_${mes.replace(" ", "_")}.xlsx`);
    });
  }

  const filtered = useMemo(() => {
    let list = PEOPLE;
    if (filtro === "prestacion") list = list.filter((p) => p.tipo === "prestacion" && !p._baja);
    else if (filtro === "transporte") list = list.filter((p) => p.tipo === "transporte" && !p._baja);
    else if (filtro === "bajas") list = list.filter((p) => p._baja);
    else list = list.filter((p) => !p._baja);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      list = list.filter((p) => p.nombre.toLowerCase().includes(q) || (p.obraSocial || "").toLowerCase().includes(q));
    }
    return list;
  }, [filtro, busqueda, PEOPLE]);

  const activos = PEOPLE.filter((p) => !p._baja);
  const totalEnviado = activos.filter((p) => status[p.id]?.enviado).length;
  const totalEntregado = activos.filter((p) => status[p.id]?.entregado).length;

  function abrirFicha(p) {
    setFicha(p);
    cargarHistorial(p.id);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ fontFamily: "'Courier New', monospace", fontSize: 13, padding: "6px 8px", border: `1px solid ${INK}`, borderRadius: 2, background: "transparent", color: INK }}>
          {mesesDisponibles().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: MUTE }}>
          Enviado {totalEnviado}/{activos.length} · Entregado {totalEntregado}/{activos.length}
        </div>
        <button onClick={exportarExcel} title="Exportar a Excel" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, border: `1px solid ${INK}`, background: "transparent", color: INK, padding: "6px 10px", fontSize: 12, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2 }}>
          <Download size={13} /> Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "todos", label: `Activos (${activos.length})` },
          { key: "prestacion", label: "Prestaciones" },
          { key: "transporte", label: "Transporte" },
          { key: "bajas", label: `Bajas (${PEOPLE.filter((p) => p._baja).length})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{ border: `1px solid ${INK}`, background: filtro === f.key ? INK : "transparent", color: filtro === f.key ? PAPER : INK, padding: "6px 10px", fontSize: 12, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2 }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} style={{ position: "absolute", left: 8, top: 10, color: MUTE }} />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar nombre u obra social..." style={{ width: "100%", padding: "8px 8px 8px 28px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, boxSizing: "border-box", background: "transparent", color: INK }} />
      </div>

      {!loaded ? (
        <p style={{ color: MUTE }}>Cargando…</p>
      ) : (
        <div style={{ border: `1px solid ${INK}` }}>
          {filtered.map((p, i) => {
            const st = status[p.id] || {};
            return (
              <div key={p.id} className="row-hover" onClick={() => abrirFicha(p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: i < filtered.length - 1 ? `1px solid ${LINE}` : "none", opacity: p._baja ? 0.5 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: MUTE, fontFamily: "'Courier New', monospace", marginTop: 2 }}>{p.prestacion} · {p.obraSocial}</div>
                </div>
                {!p._baja && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 160 }}>
                    {ESTADOS.map((e) => (
                      <button key={e.key} onClick={(ev) => toggle(p.id, e.key, ev)} title={e.full}
                        style={{ fontFamily: "'Courier New', monospace", fontSize: 9, padding: "3px 5px", border: `1px solid ${st[e.key] ? GREEN : RED}`, background: st[e.key] ? GREEN : "transparent", color: st[e.key] ? "#fff" : RED, borderRadius: 2, cursor: "pointer" }}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: MUTE, fontSize: 14 }}>Sin resultados.</div>}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{ width: "100%", background: "transparent", color: INK, border: `1px dashed ${BORDER}`, padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 2 }}>
            <User size={15} /> Agregar concurrente nuevo
          </button>
        ) : (
          <FormPersona catalogos={catalogos} onSave={agregarConcurrente} onCancel={() => setShowAdd(false)} />
        )}
      </div>

      {ficha && !editando && (
        <Ficha
          persona={ficha}
          onClose={() => setFicha(null)}
          onEdit={(p) => setEditando(p)}
          onBaja={toggleBaja}
          historial={historiales[ficha.id] || []}
          onAddHistorial={(texto) => addHistorial(ficha.id, texto)}
        />
      )}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setEditando(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto" }}>
            <FormPersona initial={editando} catalogos={catalogos} onSave={guardarEdicion} onCancel={() => setEditando(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= TAB: TAREAS DEL DÍA ================= */
const PRIORITIES = [
  { key: "alta", label: "Alta", color: RED },
  { key: "media", label: "Media", color: GOLD },
  { key: "baja", label: "Baja", color: GREEN },
];
const STATUSES = [
  { key: "pendiente", label: "Pendiente", icon: Circle },
  { key: "curso", label: "En curso", icon: Clock },
  { key: "hecho", label: "Hecho", icon: Check },
];

function TabTareas({ tasks, setTasks, loaded }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todas");
  const [form, setForm] = useState({ title: "", priority: "media", due: todayISO(), notes: "" });

  const persist = useCallback(async (next) => {
    setTasks(next);
    try { await window.storage.set("bitacora:tasks", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [setTasks]);

  function addTask() {
    if (!form.title.trim()) return;
    const next = [...tasks, { id: uid(), title: form.title.trim(), priority: form.priority, due: form.due, notes: form.notes.trim(), status: "pendiente", created: todayISO() }];
    persist(next);
    setForm({ title: "", priority: "media", due: todayISO(), notes: "" });
    setShowForm(false);
  }
  function cycleStatus(id) {
    const order = ["pendiente", "curso", "hecho"];
    persist(tasks.map((t) => t.id === id ? { ...t, status: order[(order.indexOf(t.status) + 1) % order.length] } : t));
  }
  function removeTask(id) { persist(tasks.filter((t) => t.id !== id)); }
  const overdue = (t) => t.due && t.due < todayISO() && t.status !== "hecho";

  const visible = tasks
    .filter((t) => (filter === "todas" ? true : t.status === filter))
    .sort((a, b) => {
      if (a.status !== b.status) { const order = { pendiente: 0, curso: 1, hecho: 2 }; return order[a.status] - order[b.status]; }
      return (a.due || "").localeCompare(b.due || "");
    });
  const counts = {
    pendiente: tasks.filter((t) => t.status === "pendiente").length,
    curso: tasks.filter((t) => t.status === "curso").length,
    hecho: tasks.filter((t) => t.status === "hecho").length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ key: "todas", label: "Todas", count: tasks.length }, ...STATUSES.map((s) => ({ ...s, count: counts[s.key] }))].map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            style={{ border: `1px solid ${INK}`, background: filter === s.key ? INK : "transparent", color: filter === s.key ? PAPER : INK, padding: "6px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2 }}>
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {!loaded ? <p style={{ color: MUTE }}>Cargando…</p> : visible.length === 0 ? (
        <div style={{ border: `1px dashed ${BORDER}`, padding: "32px 20px", textAlign: "center", color: MUTE, fontSize: 15 }}>
          No hay tareas acá todavía.
        </div>
      ) : (
        <div style={{ border: `1px solid ${INK}` }}>
          {visible.map((t, i) => {
            const pr = PRIORITIES.find((p) => p.key === t.priority);
            const StatusIcon = STATUSES.find((s) => s.key === t.status)?.icon || Circle;
            return (
              <div key={t.id} className="row-hover" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px", borderBottom: i < visible.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <button onClick={() => cycleStatus(t.id)} style={{ background: "none", border: `1.5px solid ${t.status === "hecho" ? GREEN : INK}`, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2, color: t.status === "hecho" ? GREEN : INK }}>
                  <StatusIcon size={14} strokeWidth={2.5} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, textDecoration: t.status === "hecho" ? "line-through" : "none", color: t.status === "hecho" ? MUTE : INK, wordBreak: "break-word" }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, padding: "1px 6px", border: `1px solid ${pr.color}`, color: pr.color, borderRadius: 2 }}>{pr.label}</span>
                    {t.due && <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: overdue(t) ? RED : MUTE, fontWeight: overdue(t) ? "bold" : "normal" }}>{overdue(t) ? "vencida · " : ""}{formatFecha(t.due)}</span>}
                  </div>
                  {t.notes && <div style={{ fontSize: 13, color: MUTE, marginTop: 4, fontStyle: "italic" }}>{t.notes}</div>}
                </div>
                {t.status === "hecho" && <div className="stamp" style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: GREEN, border: `2px solid ${GREEN}`, borderRadius: 4, padding: "2px 5px", transform: "rotate(-8deg)", letterSpacing: "0.05em", flexShrink: 0 }}>HECHO</div>}
                <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", color: BORDER, cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{ width: "100%", background: INK, color: PAPER, border: "none", padding: "14px", fontSize: 15, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 2 }}>
            <Plus size={16} /> Nueva tarea
          </button>
        ) : (
          <div style={{ border: `1px solid ${INK}`, padding: 16, background: CARD }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE }}>NUEVA ENTRADA</span>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE }}><X size={18} /></button>
            </div>
            <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="¿Qué hay que hacer?" style={{ width: "100%", padding: "10px 8px", fontSize: 16, border: `1px solid ${BORDER}`, borderRadius: 2, marginBottom: 10, boxSizing: "border-box", background: "transparent", color: INK }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <label style={{ fontSize: 11, color: MUTE, fontFamily: "'Courier New', monospace" }}>PRIORIDAD</label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {PRIORITIES.map((p) => (
                    <button key={p.key} onClick={() => setForm({ ...form, priority: p.key })} style={{ flex: 1, padding: "6px 4px", fontSize: 12, fontFamily: "'Courier New', monospace", border: `1px solid ${p.color}`, background: form.priority === p.key ? p.color : "transparent", color: form.priority === p.key ? "#fff" : p.color, cursor: "pointer", borderRadius: 2 }}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={{ fontSize: 11, color: MUTE, fontFamily: "'Courier New', monospace" }}>FECHA</label>
                <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} style={{ width: "100%", padding: "6px 8px", marginTop: 4, border: `1px solid ${BORDER}`, borderRadius: 2, fontSize: 13, boxSizing: "border-box", background: "transparent", color: INK }} />
              </div>
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)" rows={2} style={{ width: "100%", padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, marginBottom: 12, boxSizing: "border-box", resize: "vertical", background: "transparent", color: INK }} />
            <button onClick={addTask} disabled={!form.title.trim()} style={{ width: "100%", background: form.title.trim() ? GREEN : BORDER, color: "#fff", border: "none", padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: form.title.trim() ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              Guardar tarea <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= TAB: PRÓXIMAS FECHAS ================= */
function TabFechas({ fechas, setFechas, loaded }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", date: todayISO(), notes: "" });

  const persist = useCallback(async (next) => {
    setFechas(next);
    try { await window.storage.set("panel:fechas", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [setFechas]);

  function addFecha() {
    if (!form.title.trim()) return;
    const next = [...fechas, { id: uid(), title: form.title.trim(), date: form.date, notes: form.notes.trim() }].sort((a, b) => a.date.localeCompare(b.date));
    persist(next);
    setForm({ title: "", date: todayISO(), notes: "" });
    setShowForm(false);
  }
  function removeFecha(id) { persist(fechas.filter((f) => f.id !== id)); }
  const isPast = (d) => d < todayISO();
  const isSoon = (d) => !isPast(d) && d <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  return (
    <div>
      {!loaded ? <p style={{ color: MUTE }}>Cargando…</p> : fechas.length === 0 ? (
        <div style={{ border: `1px dashed ${BORDER}`, padding: "32px 20px", textAlign: "center", color: MUTE, fontSize: 15, marginBottom: 20 }}>
          No hay fechas cargadas. Sumá vencimientos, entregas o trámites importantes.
        </div>
      ) : (
        <div style={{ border: `1px solid ${INK}`, marginBottom: 20 }}>
          {fechas.map((f, i) => (
            <div key={f.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < fechas.length - 1 ? `1px solid ${LINE}` : "none", opacity: isPast(f.date) ? 0.5 : 1 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: "bold", color: isSoon(f.date) ? RED : INK, minWidth: 56 }}>{formatFecha(f.date)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15 }}>{f.title}</div>
                {f.notes && <div style={{ fontSize: 13, color: MUTE, fontStyle: "italic", marginTop: 2 }}>{f.notes}</div>}
              </div>
              <button onClick={() => removeFecha(f.id)} style={{ background: "none", border: "none", color: BORDER, cursor: "pointer", padding: 4 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", background: INK, color: PAPER, border: "none", padding: "14px", fontSize: 15, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 2 }}>
          <Plus size={16} /> Nueva fecha
        </button>
      ) : (
        <div style={{ border: `1px solid ${INK}`, padding: 16, background: CARD }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE }}>NUEVA FECHA</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE }}><X size={18} /></button>
          </div>
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="¿Qué vence o hay que entregar?" style={{ width: "100%", padding: "10px 8px", fontSize: 16, border: `1px solid ${BORDER}`, borderRadius: 2, marginBottom: 10, boxSizing: "border-box", background: "transparent", color: INK }} />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: 10, border: `1px solid ${BORDER}`, borderRadius: 2, fontSize: 14, boxSizing: "border-box", background: "transparent", color: INK }} />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)" rows={2} style={{ width: "100%", padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, marginBottom: 12, boxSizing: "border-box", resize: "vertical", background: "transparent", color: INK }} />
          <button onClick={addFecha} disabled={!form.title.trim()} style={{ width: "100%", background: form.title.trim() ? GREEN : BORDER, color: "#fff", border: "none", padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: form.title.trim() ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Guardar fecha <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= TAB: CONFIGURACIÓN (catálogos) ================= */
function TabConfig({ catalogos, setCatalogos }) {
  const [nuevo, setNuevo] = useState({ prestaciones: "", mutuales: "", responsables: "" });

  const persist = useCallback(async (next) => {
    setCatalogos(next);
    try { await window.storage.set("catalogos", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [setCatalogos]);

  function agregar(campo) {
    const val = nuevo[campo].trim();
    if (!val || catalogos[campo].includes(val)) return;
    persist({ ...catalogos, [campo]: [...catalogos[campo], val] });
    setNuevo({ ...nuevo, [campo]: "" });
  }
  function quitar(campo, val) {
    persist({ ...catalogos, [campo]: catalogos[campo].filter((v) => v !== val) });
  }

  const secciones = [
    { key: "prestaciones", label: "Prestaciones" },
    { key: "mutuales", label: "Mutuales / obras sociales" },
    { key: "responsables", label: "Responsables" },
  ];

  return (
    <div>
      {secciones.map((s) => (
        <div key={s.key} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE, marginBottom: 8 }}>{s.label.toUpperCase()}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {catalogos[s.key].map((v) => (
              <span key={v} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${BORDER}`, borderRadius: 2, padding: "4px 8px", fontSize: 13 }}>
                {v}
                <button onClick={() => quitar(s.key, v)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE, display: "flex" }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={nuevo[s.key]} onChange={(e) => setNuevo({ ...nuevo, [s.key]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && agregar(s.key)} placeholder={`Agregar a ${s.label.toLowerCase()}...`} style={{ flex: 1, padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, background: "transparent", color: INK }} />
            <button onClick={() => agregar(s.key)} style={{ background: GREEN, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 2, cursor: "pointer" }}><Plus size={15} /></button>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 13, color: MUTE, fontStyle: "italic" }}>Estas listas alimentan las sugerencias al cargar o editar un concurrente. Podés escribir un valor que no esté en la lista igual — se guarda tal cual lo tipees.</p>
    </div>
  );
}

/* ================= TAB: AYUDA ================= */
function TabAyuda() {
  const Sec = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: GOLD, marginBottom: 6, letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
  return (
    <div>
      <Sec title="¿QUÉ ES ESTE PANEL?">
        Es tu sistema de trabajo diario: seguimiento mensual de envío/entrega de cada concurrente, tareas pendientes y fechas importantes. Todo se guarda solo, asociado a tu cuenta de Claude — no hace falta guardar archivos ni instalar nada.
      </Sec>
      <Sec title="INICIO">
        Resumen del día: cuántas tareas tenés pendientes o vencidas, fechas próximas y concurrentes sin enviar este mes. El buscador de arriba busca en concurrentes, tareas y fechas al mismo tiempo.
      </Sec>
      <Sec title="PLANILLA">
        Elegí el mes arriba (hasta diciembre 2026). Tocá el nombre de un concurrente para abrir su ficha completa, editarla, agregar una nota al historial, o darlo de baja (queda en la pestaña "Bajas", no se borra el historial). Los botones ENV/ENT/FIR/FAC/COB marcan el estado de cada etapa del mes. "Agregar concurrente nuevo" lo suma a la lista para siempre. El botón "Excel" descarga la planilla del mes actual a tu celular o PC.
      </Sec>
      <Sec title="TURNERO">
        Calendario mensual de turnos de admisión y valoración. Cargás fecha, hora, tipo, nombre y contacto de quien pide el turno; queda agrupado por día dentro del mes elegido.
      </Sec>
      <Sec title="MENSAJES">
        Registro manual de consultas que te llegan (por WhatsApp u otro medio). No se conecta solo a WhatsApp — la vas cargando vos — pero te ordena qué quedó pendiente de responder y qué ya respondiste.
      </Sec>
      <Sec title="TAREAS Y FECHAS">
        Tareas es tu lista de pendientes del día a día (pendiente → en curso → hecho). Fechas es para vencimientos y entregas importantes — recordá que esto no manda notificaciones si no tenés la app abierta; para avisos automáticos seguís usando el calendario de tu celular.
      </Sec>
      <Sec title="CATÁLOGOS">
        Ahí cargás las prestaciones, mutuales y responsables que después aparecen como sugerencia al agregar o editar un concurrente. Podés sumar o sacar valores cuando quieras.
      </Sec>
      <Sec title="LIMITACIONES A TENER EN CUENTA">
        No guarda archivos adjuntos (DNI, historia clínica escaneada, etc.), no manda notificaciones push con el celular cerrado, y no tiene login separado para varias personas — todo queda bajo tu cuenta de Claude. Para eso hace falta una aplicación con servidor propio, distinta de este panel.
      </Sec>
    </div>
  );
}


/* ================= TAB: TURNERO MENSUAL (admisiones y valoraciones) ================= */
const TIPOS_TURNO = [
  { key: "admision", label: "Admisión", color: GOLD },
  { key: "valoracion", label: "Valoración", color: GREEN },
];

function TabTurnero() {
  const [mes, setMes] = useState(mesActual());
  const [turnos, setTurnos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fecha: todayISO(), hora: "09:00", tipo: "admision", nombre: "", contacto: "", obraSocial: "", notas: "" });

  const key = `turnero:${mes}`;

  useEffect(() => {
    setLoaded(false);
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        setTurnos(res && res.value ? JSON.parse(res.value) : []);
      } catch (e) {
        setTurnos([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [key]);

  const persist = useCallback(async (next) => {
    setTurnos(next);
    try { await window.storage.set(key, JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [key]);

  function addTurno() {
    if (!form.nombre.trim()) return;
    const next = [...turnos, { id: uid(), ...form, nombre: form.nombre.trim() }]
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    persist(next);
    setForm({ fecha: form.fecha, hora: "09:00", tipo: "admision", nombre: "", contacto: "", obraSocial: "", notas: "" });
    setShowForm(false);
  }
  function removeTurno(id) { persist(turnos.filter((t) => t.id !== id)); }

  // Agrupar por día
  const porDia = useMemo(() => {
    const map = {};
    turnos.forEach((t) => {
      if (!map[t.fecha]) map[t.fecha] = [];
      map[t.fecha].push(t);
    });
    return Object.keys(map).sort().map((fecha) => ({ fecha, items: map[fecha] }));
  }, [turnos]);

  const inputStyle = { padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, boxSizing: "border-box", background: "transparent", color: INK };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...inputStyle, fontFamily: "'Courier New', monospace", fontSize: 13, border: `1px solid ${INK}` }}>
          {mesesDisponibles().map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: MUTE }}>{turnos.length} turno(s) este mes</div>
      </div>

      {!loaded ? <p style={{ color: MUTE }}>Cargando…</p> : porDia.length === 0 ? (
        <div style={{ border: `1px dashed ${BORDER}`, padding: "32px 20px", textAlign: "center", color: MUTE, fontSize: 15, marginBottom: 20 }}>
          No hay turnos cargados este mes.
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {porDia.map(({ fecha, items }) => (
            <div key={fecha} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: MUTE, marginBottom: 6, borderBottom: `1px solid ${LINE}`, paddingBottom: 4 }}>
                {new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
              </div>
              {items.map((t) => {
                const tipo = TIPOS_TURNO.find((x) => x.key === t.tipo);
                return (
                  <div key={t.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${LINE}` }}>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: "bold", minWidth: 48 }}>{t.hora}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15 }}>{t.nombre}</div>
                      <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>
                        {t.contacto}{t.obraSocial ? ` · ${t.obraSocial}` : ""}
                      </div>
                      {t.notas && <div style={{ fontSize: 13, color: MUTE, fontStyle: "italic", marginTop: 2 }}>{t.notas}</div>}
                    </div>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, padding: "3px 6px", border: `1px solid ${tipo.color}`, color: tipo.color, borderRadius: 2, flexShrink: 0 }}>{tipo.label}</span>
                    <button onClick={() => removeTurno(t.id)} style={{ background: "none", border: "none", color: BORDER, cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", background: INK, color: PAPER, border: "none", padding: "14px", fontSize: 15, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 2 }}>
          <Plus size={16} /> Nuevo turno
        </button>
      ) : (
        <div style={{ border: `1px solid ${INK}`, padding: 16, background: CARD }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE }}>NUEVO TURNO</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE }}><X size={18} /></button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {TIPOS_TURNO.map((t) => (
              <button key={t.key} onClick={() => setForm({ ...form, tipo: t.key })} style={{ flex: 1, padding: "8px", fontSize: 13, fontFamily: "'Courier New', monospace", border: `1px solid ${t.color}`, background: form.tipo === t.key ? t.color : "transparent", color: form.tipo === t.key ? "#fff" : t.color, cursor: "pointer", borderRadius: 2 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre y apellido" style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Contacto / WSP" style={{ ...inputStyle, flex: 1 }} />
            <input value={form.obraSocial} onChange={(e) => setForm({ ...form, obraSocial: e.target.value })} placeholder="Obra social" style={{ ...inputStyle, flex: 1 }} />
          </div>
          <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 12 }} />
          <button onClick={addTurno} disabled={!form.nombre.trim()} style={{ width: "100%", background: form.nombre.trim() ? GREEN : BORDER, color: "#fff", border: "none", padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: form.nombre.trim() ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Guardar turno <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= TAB: MENSAJES / CONSULTAS WSP ================= */
function TabMensajes({ mensajes, setMensajes, loaded }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("pendiente");
  const [form, setForm] = useState({ nombre: "", motivo: "", fecha: todayISO(), notas: "" });

  const persist = useCallback(async (next) => {
    setMensajes(next);
    try { await window.storage.set("mensajes:consultas", JSON.stringify(next), false); } catch (e) { console.error(e); }
  }, [setMensajes]);

  function addMensaje() {
    if (!form.nombre.trim()) return;
    const next = [{ id: uid(), ...form, nombre: form.nombre.trim(), estado: "pendiente" }, ...mensajes];
    persist(next);
    setForm({ nombre: "", motivo: "", fecha: todayISO(), notas: "" });
    setShowForm(false);
  }
  function toggleEstado(id) {
    persist(mensajes.map((m) => m.id === id ? { ...m, estado: m.estado === "pendiente" ? "respondida" : "pendiente" } : m));
  }
  function removeMensaje(id) { persist(mensajes.filter((m) => m.id !== id)); }

  const visibles = mensajes.filter((m) => filter === "todas" ? true : m.estado === filter);
  const pendientes = mensajes.filter((m) => m.estado === "pendiente").length;

  const inputStyle = { padding: "8px", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 2, boxSizing: "border-box", background: "transparent", color: INK };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "pendiente", label: `Pendientes (${pendientes})` },
          { key: "respondida", label: "Respondidas" },
          { key: "todas", label: `Todas (${mensajes.length})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ border: `1px solid ${INK}`, background: filter === f.key ? INK : "transparent", color: filter === f.key ? PAPER : INK, padding: "6px 12px", fontSize: 12, fontFamily: "'Courier New', monospace", cursor: "pointer", borderRadius: 2 }}>
            {f.label}
          </button>
        ))}
      </div>

      {!loaded ? <p style={{ color: MUTE }}>Cargando…</p> : visibles.length === 0 ? (
        <div style={{ border: `1px dashed ${BORDER}`, padding: "32px 20px", textAlign: "center", color: MUTE, fontSize: 15, marginBottom: 20 }}>
          No hay consultas cargadas acá.
        </div>
      ) : (
        <div style={{ border: `1px solid ${INK}`, marginBottom: 20 }}>
          {visibles.map((m, i) => (
            <div key={m.id} className="row-hover" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderBottom: i < visibles.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <button onClick={() => toggleEstado(m.id)} title="Cambiar estado" style={{ background: "none", border: `1.5px solid ${m.estado === "respondida" ? GREEN : RED}`, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2, color: m.estado === "respondida" ? GREEN : RED }}>
                {m.estado === "respondida" ? <Check size={13} /> : <PhoneCall size={12} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15 }}>{m.nombre}</div>
                {m.motivo && <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>{m.motivo}</div>}
                <div style={{ fontSize: 11, color: MUTE, fontFamily: "'Courier New', monospace", marginTop: 3 }}>{formatFecha(m.fecha)}</div>
                {m.notas && <div style={{ fontSize: 13, color: MUTE, fontStyle: "italic", marginTop: 2 }}>{m.notas}</div>}
              </div>
              <button onClick={() => removeMensaje(m.id)} style={{ background: "none", border: "none", color: BORDER, cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", background: INK, color: PAPER, border: "none", padding: "14px", fontSize: 15, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 2 }}>
          <Plus size={16} /> Nueva consulta
        </button>
      ) : (
        <div style={{ border: `1px solid ${INK}`, padding: 16, background: CARD }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: "0.1em", color: MUTE }}>NUEVA CONSULTA</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTE }}><X size={18} /></button>
          </div>
          <input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="¿Quién consulta?" style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo de la consulta" style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
          <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 12 }} />
          <button onClick={addMensaje} disabled={!form.nombre.trim()} style={{ width: "100%", background: form.nombre.trim() ? GREEN : BORDER, color: "#fff", border: "none", padding: "12px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: form.nombre.trim() ? "pointer" : "default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Guardar consulta <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= APP ================= */
export default function PanelLaboral() {
  const [tab, setTab] = useState("inicio");
  const [dark, setDark] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [fechas, setFechas] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [catalogos, setCatalogos] = useState(DEFAULT_CATALOGOS);
  const [loadedGlobal, setLoadedGlobal] = useState(false);
  const [planillaSnapshot, setPlanillaSnapshot] = useState({ people: [], status: {} });

  useEffect(() => {
    (async () => {
      try {
        const [rTasks, rFechas, rCat, rTema, rMensajes] = await Promise.all([
          window.storage.get("bitacora:tasks", false).catch(() => null),
          window.storage.get("panel:fechas", false).catch(() => null),
          window.storage.get("catalogos", false).catch(() => null),
          window.storage.get("panel:tema", false).catch(() => null),
          window.storage.get("mensajes:consultas", false).catch(() => null),
        ]);
        setTasks(rTasks && rTasks.value ? JSON.parse(rTasks.value) : []);
        setFechas(rFechas && rFechas.value ? JSON.parse(rFechas.value) : []);
        setCatalogos(rCat && rCat.value ? JSON.parse(rCat.value) : DEFAULT_CATALOGOS);
        setDark(rTema && rTema.value === "dark");
        setMensajes(rMensajes && rMensajes.value ? JSON.parse(rMensajes.value) : []);
      } catch (e) {}
      finally { setLoadedGlobal(true); }
    })();
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    window.storage.set("panel:tema", next ? "dark" : "light", false).catch(() => {});
  }

  // Para el dashboard: snapshot liviano de personas + estado del mes actual
  useEffect(() => {
    (async () => {
      try {
        const [rExtra, rOv, rBajas, rStatus] = await Promise.all([
          window.storage.get("planilla:personas-nuevas", false).catch(() => null),
          window.storage.get("planilla:overrides", false).catch(() => null),
          window.storage.get("planilla:bajas", false).catch(() => null),
          window.storage.get(`planilla:${mesActual()}`, false).catch(() => null),
        ]);
        const extra = rExtra && rExtra.value ? JSON.parse(rExtra.value) : [];
        const overrides = rOv && rOv.value ? JSON.parse(rOv.value) : {};
        const bajas = rBajas && rBajas.value ? JSON.parse(rBajas.value) : {};
        const status = rStatus && rStatus.value ? JSON.parse(rStatus.value) : {};
        const people = [...PEOPLE_BASE, ...extra].map((p) => ({ ...p, ...(overrides[p.id] || {}) })).filter((p) => !bajas[p.id]);
        setPlanillaSnapshot({ people, status });
      } catch (e) {}
    })();
  }, [tab]);

  const tabs = [
    { key: "inicio", label: "Inicio", icon: Home },
    { key: "planilla", label: "Planilla", icon: ClipboardList },
    { key: "turnero", label: "Turnero", icon: CalendarCheck },
    { key: "mensajes", label: "Mensajes", icon: MessageCircle },
    { key: "tareas", label: "Tareas", icon: ListChecks },
    { key: "fechas", label: "Fechas", icon: CalendarClock },
    { key: "config", label: "Catálogos", icon: Settings },
    { key: "ayuda", label: "Ayuda", icon: HelpCircle },
  ];

  return (
    <ThemeCtx.Provider value={{ dark, toggle: toggleDark }}>
      <div className={dark ? "dark" : ""} style={{ minHeight: "100vh", background: PAPER, fontFamily: "'Georgia', 'Iowan Old Style', serif", color: INK }}>
        <style>{baseStyles}</style>

        <div style={{ background: INK, color: PAPER, padding: "28px 20px 0", borderBottom: `6px double ${GOLD}` }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, fontFamily: "'Courier New', monospace", marginBottom: 6 }}>
                Panel laboral · {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button onClick={toggleDark} title="Modo oscuro" style={{ background: "none", border: `1px solid ${PAPER}`, color: PAPER, cursor: "pointer", padding: "4px 6px", borderRadius: 2, display: "flex" }}>
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
            <h1 style={{ fontSize: 26, margin: "0 0 18px", fontWeight: 400, letterSpacing: "-0.01em" }}>APROSS / Mutuales y Transporte</h1>
            <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      flex: "1 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      padding: "10px 8px", fontSize: 12, fontFamily: "'Courier New', monospace", whiteSpace: "nowrap",
                      background: active ? PAPER : "transparent", color: active ? INK : PAPER,
                      border: "none", borderRadius: "3px 3px 0 0", cursor: "pointer",
                    }}>
                    <Icon size={13} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px" }}>
          {tab === "inicio" && <TabInicio people={planillaSnapshot.people} status={planillaSnapshot.status} tasks={tasks} fechas={fechas} mensajes={mensajes} onGoTab={setTab} />}
          {tab === "planilla" && <TabPlanilla catalogos={catalogos} />}
          {tab === "tareas" && <TabTareas tasks={tasks} setTasks={setTasks} loaded={loadedGlobal} />}
          {tab === "turnero" && <TabTurnero />}
          {tab === "mensajes" && <TabMensajes mensajes={mensajes} setMensajes={setMensajes} loaded={loadedGlobal} />}
          {tab === "fechas" && <TabFechas fechas={fechas} setFechas={setFechas} loaded={loadedGlobal} />}
          {tab === "config" && <TabConfig catalogos={catalogos} setCatalogos={setCatalogos} />}
          {tab === "ayuda" && <TabAyuda />}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
