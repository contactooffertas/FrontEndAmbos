"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Clock,
  Shield,
  RefreshCw,
  House,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/authContext";
import "../styles/terminos.css";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Seccion {
  titulo: string;
  contenido: string;
}

interface TerminosData {
  _id?: string;
  fechaActualizacion: string;
  secciones: Seccion[];
}

interface Props {
  onAccept?: () => void;
}

// ── Contenido real de Offertas.com.ar ──────────────────────────────────────────
const defaultSecciones: Seccion[] = [
  {
    titulo: "Bienvenida",
    contenido:
      "¡Bienvenido a la comunidad de Offertas.com.ar! Para que todos estemos seguros y las cosas fluyan bien, acá te explicamos clarito cómo funcionamos. Leé con calma, porque al usarnos aceptás todo esto.",
  },
  {
    titulo: "¿Qué somos?",
    contenido:
      "Somos una cartelera digital simple y efectiva. Conectamos a vendedores con compradores que están cerca, en tu zona. Nada más: publicás, ofrecés y contactás. Nosotros solo ponemos el puente.",
  },
  {
    titulo: "El trato es 100% entre vos y el otro",
    contenido:
      "La compra, el pago, la entrega y cualquier arreglo se hace directo entre vendedor y comprador (por chat de la web, WhatsApp o como quieran). Offertas.com.ar NO toca un peso de las ventas, NO verifica productos, NO se hace responsable por el estado, calidad, origen o entrega de lo que se vende. Si algo sale mal (daños, retrasos, mentiras), es problema tuyo y del otro. Nosotros no intervenimos ni respondemos por eso. Usá tu criterio y protegéte siempre.",
  },
  {
    titulo: "Pagos y comisiones",
    contenido:
      "Nosotros solo cobramos la suscripción mensual a locales y el servicio de \"Destacados\" para que tus avisos brillen más. Cero comisiones por ventas. Punto final. No hay sorpresas ni cobros escondidos.",
  },
  {
    titulo: "Cero tolerancia al despelote",
    contenido:
      "Si te portás mal, estafás, subís cosas ilegales (drogas, armas, robados, piratería, lo que sea prohibido por ley), acosás, spameás o violás estas reglas, borramos tu cuenta al toque, para siempre, sin aviso ni reclamo. Podemos reportarte a autoridades si es grave. Vos asumís toda la responsabilidad legal por lo que subís o hacés.",
  },
  {
    titulo: "Devoluciones y reclamos",
    contenido:
      "Si recibís algo que no te gusta o no llega, arreglalo directo con el vendedor según lo que pactaron. Nosotros solo facilitamos un botón para marcar la orden como \"Anulada\" (sin garantía de nada). No mediamos ni resolvemos disputas. Si hay problemas, es entre ustedes.",
  },
  {
    titulo: "Protección de datos y uso",
    contenido:
      "Respetamos tu info básica (nombre, zona, contacto), pero no la vendemos ni compartimos sin tu OK. Usala con cuidado. No subas fotos o datos sensibles. Podemos usar tus avisos anónimamente para mejorar el sitio.",
  },
  {
    titulo: "Limitación de responsabilidad — Responsabilidad máxima: $0",
    contenido:
      "Offertas.com.ar es exclusivamente un intermediario tecnológico que facilita el contacto entre usuarios. En ningún caso Offertas.com.ar, sus fundadores, empleados, representantes o socios serán responsables por daños directos, indirectos, incidentales, especiales, consecuentes o punitivos de ningún tipo — incluyendo pero no limitado a: pérdida de dinero, bienes, datos, ganancias esperadas, daño moral o cualquier otro perjuicio — que surjan del uso o imposibilidad de uso de la plataforma, o de transacciones entre usuarios. La responsabilidad máxima de Offertas.com.ar frente a cualquier usuario, en cualquier circunstancia y por cualquier concepto, es de CERO PESOS ($0 ARS). Esta limitación aplica incluso si Offertas.com.ar fue advertido de la posibilidad de dichos daños.",
  },
  {
    titulo: "Operaciones fuera de la plataforma — Responsabilidad nula",
    contenido:
      "Offertas.com.ar no tiene ningún tipo de responsabilidad civil, comercial ni penal sobre transacciones, pagos, acuerdos, entregas o cualquier tipo de operación que se realice fuera de los canales oficiales de la plataforma (por ejemplo: pagos por transferencia bancaria, Mercado Pago, efectivo, WhatsApp u otras aplicaciones externas). Si un usuario acuerda o paga fuera de Offertas.com.ar y sufre un perjuicio, la responsabilidad recae exclusiva y totalmente sobre las partes involucradas en dicha operación. El hecho de que el contacto inicial haya ocurrido dentro de la plataforma no genera ninguna responsabilidad sobre Offertas.com.ar respecto del resultado de esa transacción.",
  },
  {
    titulo: "Responsabilidad exclusiva del usuario por sus actos",
    contenido:
      "Cada usuario es el único y exclusivo responsable de todo lo que publica, ofrece, vende, compra, acuerda o comunica dentro y fuera de la plataforma. Offertas.com.ar no verifica la identidad, solvencia, honestidad ni legalidad de los usuarios ni de los productos y servicios publicados. Al aceptar estos términos, el usuario reconoce que actúa bajo su propio riesgo y libera a Offertas.com.ar de toda responsabilidad derivada de sus acciones o de las acciones de terceros.",
  },
  {
    titulo: "Indemnidad — El usuario nos deja a salvo",
    contenido:
      "Al usar Offertas.com.ar, el usuario acepta indemnizar, defender y mantener indemne a Offertas.com.ar y a sus representantes frente a cualquier reclamo, demanda, pérdida, gasto (incluyendo honorarios legales) o daño que surja de: (a) su uso de la plataforma; (b) su incumplimiento de estos términos; (c) cualquier operación o conducta suya dentro o fuera de la plataforma; (d) cualquier infracción a derechos de terceros. Esto significa que si alguien nos demanda por algo que vos hiciste, vos asumís los costos.",
  },
  {
    titulo: "Aceptación expresa de estos términos como condición de uso",
    contenido:
      "El uso de la plataforma, el registro de una cuenta o la publicación de cualquier contenido implica la aceptación plena, voluntaria e informada de todos estos términos y condiciones. Esta aceptación tiene el mismo valor legal que una firma manuscrita. Si no estás de acuerdo con alguno de estos términos, debés dejar de usar la plataforma de inmediato. La aceptación queda registrada con fecha, hora y datos del dispositivo al momento del registro.",
  },
  {
    titulo: "Actualizaciones flexibles",
    contenido:
      "Para que la plataforma siga mejorando, podemos actualizar estos términos cuando sea necesario. Te avisaremos por mail o en la web para que estés al tanto. Si seguís usando Offertas.com.ar después de los cambios, significa que los aceptás.",
  },
];

// ── Componente ─────────────────────────────────────────────────────────────────
export default function Terminos({ onAccept }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [abiertas, setAbiertas]       = useState<number[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [guardando, setGuardando]     = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [aceptado, setAceptado]       = useState(false);
  const [mensaje, setMensaje]         = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  const [datos, setDatos] = useState<TerminosData>({
    fechaActualizacion: new Date().toISOString(),
    secciones: defaultSecciones,
  });
  const [edicion, setEdicion] = useState<TerminosData>(datos);

  // ── Fetch backend ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/terminos");
        if (res.ok) {
          const json: TerminosData = await res.json();
          setDatos(json);
          setEdicion(json);
        }
      } catch {
        // usa defaults si no hay conexión
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // ── Acordeón ───────────────────────────────────────────────────────────────
  const toggleSeccion = (idx: number) =>
    setAbiertas((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );

  // ── Guardar (admin) ────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const token  = localStorage.getItem("marketplace_token");
      const method = datos._id ? "PUT" : "POST";
      const url    = datos._id
        ? `http://localhost:5000/api/terminos/${datos._id}`
        : "http://localhost:5000/api/terminos";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...edicion,
          fechaActualizacion: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error();

      const json: TerminosData = await res.json();
      setDatos(json);
      setEdicion(json);
      setModoEdicion(false);
      setMensaje({ tipo: "ok", texto: "Términos actualizados correctamente." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error al guardar. Intentá nuevamente." });
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    setEdicion(datos);
    setModoEdicion(false);
    setMensaje(null);
  };

  // ── Helpers edición ────────────────────────────────────────────────────────
  const editarSeccion = (idx: number, campo: keyof Seccion, valor: string) => {
    const secciones = [...edicion.secciones];
    secciones[idx]  = { ...secciones[idx], [campo]: valor };
    setEdicion({ ...edicion, secciones });
  };

  const agregarSeccion = () =>
    setEdicion({
      ...edicion,
      secciones: [
        ...edicion.secciones,
        { titulo: `${edicion.secciones.length + 1}. Nueva sección`, contenido: "" },
      ],
    });

  const eliminarSeccion = (idx: number) =>
    setEdicion({
      ...edicion,
      secciones: edicion.secciones.filter((_, i) => i !== idx),
    });

  const fechaFormateada = new Date(datos.fechaActualizacion).toLocaleDateString(
    "es-AR",
    { day: "numeric", month: "long", year: "numeric" }
  );

  const seccionesActivas = modoEdicion ? edicion.secciones : datos.secciones;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="tyc-loading">
        <RefreshCw size={32} className="tyc-spin" />
        <p>Cargando términos...</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="tyc-wrapper">

      {/* ── Header ── */}
      <div className="tyc-header">
        <div className="tyc-header-icon">
          <FileText size={26} />
        </div>
        <div className="tyc-header-text">
          <h1>Términos y Condiciones</h1>
          <span className="tyc-fecha">
            <Clock size={13} />
            Última actualización: {fechaFormateada}
          </span>
        </div>
        {/* Casita — volver al inicio */}
        <Link href="/" className="tyc-btn-home" title="Volver al inicio">
          <House size={18} />
        </Link>

        {isAdmin && !modoEdicion && (
          <button className="tyc-btn-edit" onClick={() => setModoEdicion(true)}>
            <Edit3 size={15} />
            Editar
          </button>
        )}
      </div>

      {/* ── Feedback ── */}
      {mensaje && (
        <div className={`tyc-mensaje tyc-mensaje--${mensaje.tipo}`}>
          {mensaje.tipo === "ok"
            ? <CheckCircle2 size={15} />
            : <AlertTriangle size={15} />}
          {mensaje.texto}
        </div>
      )}

      {/* ── Barra admin ── */}
      {isAdmin && modoEdicion && (
        <div className="tyc-admin-bar">
          <span className="tyc-admin-badge">
            <Shield size={13} /> Modo Admin
          </span>
          <div className="tyc-admin-actions">
            <button className="tyc-btn-agregar" onClick={agregarSeccion}>
              <Plus size={14} /> Agregar
            </button>
            <button
              className="tyc-btn-guardar"
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando
                ? <RefreshCw size={14} className="tyc-spin" />
                : <Save size={14} />}
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button className="tyc-btn-cancelar" onClick={cancelarEdicion}>
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="tyc-body">

        {/* Intro visible siempre */}
        <div className="tyc-intro">
          <p>
            Leé nuestros términos antes de usar la plataforma. Al registrarte o
            continuar usando <strong>Offertas.com.ar</strong>, aceptás todo lo
            que figura acá abajo.
          </p>
        </div>

        {/* ── Secciones — siempre visibles ── */}
        <div className="tyc-secciones">
          {seccionesActivas.map((sec, idx) =>
            modoEdicion ? (

              // ── Admin: edición inline ──────────────────────────────────
              <div key={idx} className="tyc-seccion">
                <div className="tyc-seccion-edit">
                  <div className="tyc-edit-header">
                    <span className="tyc-edit-num">#{idx + 1}</span>
                    <button
                      className="tyc-btn-delete"
                      onClick={() => eliminarSeccion(idx)}
                      title="Eliminar sección"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    className="tyc-input-titulo"
                    value={sec.titulo}
                    onChange={(e) => editarSeccion(idx, "titulo", e.target.value)}
                    placeholder="Título de la sección"
                  />
                  <textarea
                    className="tyc-textarea-contenido"
                    value={sec.contenido}
                    onChange={(e) => editarSeccion(idx, "contenido", e.target.value)}
                    placeholder="Contenido de la sección…"
                    rows={4}
                  />
                </div>
              </div>

            ) : (

              // ── Todos: acordeón de lectura ─────────────────────────────
              <div key={idx} className="tyc-seccion">
                <button
                  className="tyc-seccion-header"
                  onClick={() => toggleSeccion(idx)}
                >
                  <span className="tyc-seccion-titulo">{sec.titulo}</span>
                  {abiertas.includes(idx)
                    ? <ChevronUp size={15} />
                    : <ChevronDown size={15} />}
                </button>
                {abiertas.includes(idx) && (
                  <div className="tyc-seccion-contenido">
                    <p>{sec.contenido}</p>
                  </div>
                )}
              </div>

            )
          )}
        </div>

        {/* ── Área de aceptación (solo cuando viene de registro) ── */}
        {!modoEdicion && onAccept && (
          <div className="tyc-accept-area">
            <label className="tyc-checkbox-label">
              <input
                type="checkbox"
                className="tyc-checkbox-input"
                checked={aceptado}
                onChange={(e) => setAceptado(e.target.checked)}
              />
              <span className="tyc-checkbox-custom">
                {aceptado && <CheckCircle2 size={13} />}
              </span>
              <span className="tyc-checkbox-text">
                Leí y acepto los <strong>Términos y Condiciones</strong> de
                Offertas.com.ar. Entiendo que la plataforma no intermedia
                transacciones, que no es responsable por operaciones realizadas
                fuera de la misma, y que su responsabilidad máxima frente a
                cualquier reclamo es de <strong>$0 (cero pesos)</strong>.
              </span>
            </label>

            <button
              className={`tyc-btn-continuar${aceptado ? " tyc-btn-continuar--active" : ""}`}
              disabled={!aceptado}
              onClick={() => aceptado && onAccept()}
            >
              {aceptado
                ? <><CheckCircle2 size={17} /> Acepté — Continuar Registro</>
                : <><AlertTriangle size={17} /> Debés aceptar los términos</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
