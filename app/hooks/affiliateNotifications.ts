"use client";
// app/hooks/affiliateNotifications.ts


type CountedSection = "pendingApplications" | "acceptedOffers" | "pendingSales" | "urgentSales";

const KEYS: Record<CountedSection, string> = {
  pendingApplications: "aff_buyer_seen_pending_applications_v1",
  acceptedOffers: "aff_buyer_seen_accepted_offers_v1",
  pendingSales: "aff_buyer_seen_pending_sales_v1", // tab "Ganancias" del dashboard
  urgentSales: "aff_buyer_seen_urgent_sales_v1",   // badge del perfil (dato del backend)
};

function readNumber(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(key);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(value));
}

/**
 * ¿Hay actividad nueva en esta sección? Compara el conteo actual contra el
 * último conteo que el usuario "vio" (marcado con markSectionSeen). No hay
 * reloj de por medio: si nunca se marcó nada, cualquier conteo > 0 cuenta
 * como nuevo, y se queda así indefinidamente hasta que el usuario entre.
 */
export function isSectionNew(section: CountedSection, currentCount: number): boolean {
  return currentCount > readNumber(KEYS[section]);
}

/** Marca la sección como vista con el conteo actual (el chip "Nuevo" desaparece). */
export function markSectionSeen(section: CountedSection, currentCount: number) {
  writeNumber(KEYS[section], currentCount);
}

/**
 * Fuerza "hay algo nuevo" en esta sección sin esperar al próximo polling.
 * Pensado para llamarse desde un evento de socket en tiempo real: baja el
 * "último visto" un escalón para que la próxima comparación (aunque el
 * conteo real todavía no se haya vuelto a pedir al backend) ya dé "nuevo".
 */
export function bumpSectionNew(section: CountedSection) {
  if (typeof window === "undefined") return;
  const seen = readNumber(KEYS[section]);
  writeNumber(KEYS[section], Math.max(0, seen - 1));
}

/* ─────────────────────────────────────────────────────────────────────────
 * Tiendas nuevas: bandera "pegajosa" a nivel general (perfil + tab Tiendas)
 *
 * No se apaga sola con el tiempo. Se prende apenas hay señal de tiendas
 * nuevas (polling o socket) y solo se apaga cuando el usuario entra de
 * verdad a la tab Tiendas.
 * ────────────────────────────────────────────────────────────────────── */

const NEW_STORES_STICKY_KEY = "aff_buyer_new_stores_unseen_v1";

export function noteNewStoresSignal(newStoresCount: number) {
  if (typeof window === "undefined") return;
  if (newStoresCount > 0) localStorage.setItem(NEW_STORES_STICKY_KEY, "1");
}

/** Igual que noteNewStoresSignal pero sin depender de un conteo (para sockets). */
export function markNewStoreSignalSticky() {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEW_STORES_STICKY_KEY, "1");
}

export function hasUnseenNewStores(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NEW_STORES_STICKY_KEY) === "1";
}

export function markNewStoresSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEW_STORES_STICKY_KEY, "0");
}

/* ─────────────────────────────────────────────────────────────────────────
 * Tag "Nuevo" por tienda individual (tarjetas del listado)
 *
 * SIN VENTANA DE TIEMPO. Una tienda es candidata a "Nuevo" si se unió
 * después de la "marca de agua" (el momento en que este usuario empezó a
 * usar la sección, o la última vez que ya tenía todo visto). Una vez que el
 * usuario la ve en la lista, queda marcada como vista PARA SIEMPRE: no hay
 * ventana de 24hs, no expira sola, y no vuelve a aparecer.
 *
 * Esto reemplaza el enfoque anterior (24hs desde creación / 24hs desde
 * vista) y elimina el caso límite: si el usuario no abre la app en varios
 * días, cuando entre va a seguir viendo "Nuevo" en las tiendas que todavía
 * no vio, sin importar cuánto tiempo pasó.
 * ────────────────────────────────────────────────────────────────────── */

const SEEN_STORE_IDS_KEY = "aff_buyer_seen_store_ids_v2";
const STORES_HIGH_WATER_MARK_KEY = "aff_buyer_stores_hwm_v2";

function loadSeenStoreIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_STORE_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenStoreIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_STORE_IDS_KEY, JSON.stringify([...ids]));
}

function getHighWaterMark(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORES_HIGH_WATER_MARK_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function setHighWaterMark(ts: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORES_HIGH_WATER_MARK_KEY, String(ts));
}

/**
 * Llamar cada vez que se carga la lista de tiendas (tab "Tiendas" activo).
 * Devuelve un mapa sellerId -> mostrarNuevo. Las tiendas que se muestran acá
 * como nuevas quedan marcadas como vistas inmediatamente después de este
 * llamado, así que el tag se apaga apenas el usuario "entró y las vio".
 */
export function trackStoresAndGetNewMap(
  stores: { sellerId: string; joinedAt: string }[]
): Record<string, boolean> {
  const seen = loadSeenStoreIds();
  let hwm = getHighWaterMark();

  // Primera vez que este usuario usa la sección: no le mostramos como
  // "nuevas" tiendas que ya existían antes de que entrara por primera vez.
  if (hwm === 0) {
    hwm = Date.now();
    setHighWaterMark(hwm);
  }

  const result: Record<string, boolean> = {};
  let changed = false;

  for (const store of stores) {
    const joinedMs = new Date(store.joinedAt).getTime();
    const isCandidate = Number.isFinite(joinedMs) && joinedMs > hwm;

    if (!isCandidate) {
      result[store.sellerId] = false;
      continue;
    }

    if (seen.has(store.sellerId)) {
      result[store.sellerId] = false;
    } else {
      result[store.sellerId] = true; // se la mostramos esta vez...
      seen.add(store.sellerId);      // ...y a partir de acá queda vista para siempre
      changed = true;
    }
  }

  if (changed) saveSeenStoreIds(seen);
  return result;
}

/** Marca una tienda puntual como vista aunque no haya pasado por la lista
 * (ej. entró directo al detalle desde un link o notificación). */
export function markStoreSeen(sellerId: string) {
  const seen = loadSeenStoreIds();
  if (seen.has(sellerId)) return;
  seen.add(sellerId);
  saveSeenStoreIds(seen);
}
