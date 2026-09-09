import Link from "next/link";
import {
  ArrowLeft, BadgeDollarSign, CheckCircle2, Handshake, ShieldCheck,
  Store, Users, Wallet, AlertTriangle,
} from "lucide-react";
import "../../styles/affiliate-terms.css";

const sections = [
  {
    icon: <Handshake size={20} />,
    title: "1. Cómo funciona el programa",
    text: "El Programa de Afiliados conecta comercios de Rosario Market con usuarios que desean promocionar sus productos. El afiliado solicita participar y cada comercio decide si acepta o rechaza esa solicitud. La aceptación en una tienda no obliga a otras tiendas a aceptar al mismo afiliado.",
  },
  {
    icon: <BadgeDollarSign size={20} />,
    title: "2. Comisión y atribución de ventas",
    text: "Cada comercio define el porcentaje de comisión de sus oportunidades. La comisión se genera únicamente cuando una venta atribuida al enlace o código del afiliado queda confirmada. Ventas anuladas, inválidas, duplicadas, fraudulentas o que no puedan atribuirse correctamente no generan comisión.",
  },
  {
    icon: <Wallet size={20} />,
    title: "3. Pago de las comisiones",
    text: "Rosario Market registra y organiza la información del programa, pero no recibe ni paga las comisiones. El pago se realiza directamente entre el comercio y el afiliado. El comercio puede trabajar con un ciclo de pago de 15 o 30 días según la configuración disponible en su panel, y es responsable de cumplir los pagos que correspondan.",
  },
  {
    icon: <Users size={20} />,
    title: "4. Responsabilidades del afiliado",
    text: "El afiliado debe promocionar productos de forma clara y honesta, sin inventar precios, beneficios, stock o condiciones. No puede hacer spam, suplantar al comercio o a Rosario Market, usar prácticas engañosas ni publicar contenido ilegal. Sus enlaces y códigos son personales y deben utilizarse de buena fe.",
  },
  {
    icon: <Store size={20} />,
    title: "5. Responsabilidades del comercio",
    text: "El comercio es responsable por la información de sus productos, precios, stock, atención, entrega, aceptación o rechazo de afiliados y pago de las comisiones generadas. También debe mantener actualizadas las oportunidades que ofrece dentro del programa.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "6. Rol de Rosario Market",
    text: "Rosario Market brinda la infraestructura para publicar oportunidades, registrar solicitudes, enlaces, ventas, estados y pagos informados. No garantiza ingresos, cantidad de ventas ni continuidad de una relación entre comercio y afiliado. La plataforma puede limitar o suspender usos abusivos, fraudulentos o contrarios a estos términos.",
  },
  {
    icon: <AlertTriangle size={20} />,
    title: "7. Diferencias y reclamos",
    text: "Ante una diferencia por una venta o una comisión, las partes deben revisar la información registrada y resolver el pago directamente entre sí. Los comprobantes, estados e historial de Rosario Market pueden servir como referencia operativa, pero no convierten a la plataforma en pagador ni garante de la obligación.",
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: "8. Aceptación y relación con los términos generales",
    text: "Estos términos específicos complementan los Términos y Condiciones generales de Rosario Market. Al aceptar el Programa de Afiliados, el usuario reconoce estas reglas para su rol y acepta que la participación puede actualizarse si el programa incorpora nuevas funciones o controles.",
  },
];

export default function AffiliateTermsPage() {
  return (
    <main className="affiliate-terms-page">
      <section className="affiliate-terms-hero">
        <div className="affiliate-terms-hero-inner">
          <Link href="/programa-afiliados" className="affiliate-terms-back">
            <ArrowLeft size={16} /> Volver al panel
          </Link>
          <span className="affiliate-terms-eyebrow">Rosario Market · Programa de Afiliados</span>
          <h1>Términos del Programa de Afiliados</h1>
          <p>
            Reglas claras para comercios y afiliados: cómo se generan las comisiones,
            quién paga, qué registra Rosario Market y qué responsabilidad tiene cada parte.
          </p>
        </div>
      </section>

      <section className="affiliate-terms-content">
        <div className="affiliate-terms-summary">
          <strong>En pocas palabras</strong>
          <p>
            El comercio decide con quién trabaja y cuánto paga de comisión. El afiliado promociona.
            Rosario Market registra la actividad y organiza el flujo, pero el dinero de las comisiones
            se paga directamente entre comercio y afiliado.
          </p>
        </div>

        <div className="affiliate-terms-grid">
          {sections.map((section) => (
            <article className="affiliate-terms-card" key={section.title}>
              <div className="affiliate-terms-icon">{section.icon}</div>
              <div>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="affiliate-terms-footer-card">
          <div>
            <strong>También aplican los términos generales de Rosario Market.</strong>
            <p>Podés consultarlos cuando quieras desde la sección general de Términos y Condiciones.</p>
          </div>
          <Link href="/terminos">Ver términos generales</Link>
        </div>
      </section>
    </main>
  );
}
