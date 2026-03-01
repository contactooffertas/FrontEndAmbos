"use client";
// components/footer.tsx

import Link from "next/link";
import {
  ShoppingCart,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Monitor,
  Shirt,
  Home,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-logo">
            <Link href="/" className="navbar-logo">
               {/* "Off" en círculo rojo con texto blanco */}
          <span className="navbar-logo-badge">Off</span>
          {/* "ertas" en color secundario */}
          <span className="navbar-logo-suffix">ertas</span>
          <span className="navbar-logo-dot" />
            </Link>
          </div>
          <p>
            La plataforma donde encontrás las mejores ofertas de negocios
            cercanos a vos. Ofertas reales, negocios verificados, entrega
            rápida.
          </p>
        {/* Contenedor principal de los íconos sociales del footer */}
<div className="footer-social">

  {/* Enlace a Facebook */}
  {/* 
     href="#" → ahora mismo no lleva a ningún lado.
     Deberías reemplazarlo por la URL real, por ejemplo:
     https://facebook.com/offertas
     
     aria-label="Facebook" → mejora accesibilidad.
     Permite que lectores de pantalla identifiquen el botón.
  */}
    {/* 
  <a href="#" aria-label="Facebook">
       Ícono de Facebook usando Lucide React.
       size={16} → tamaño del ícono en px.
       strokeWidth={1.75} → grosor del trazo (más fino = más moderno).
    <Facebook size={16} strokeWidth={1.75} />
  </a>

  {/* Enlace a Instagram */}
   {/*<a href="#" aria-label="Instagram">
    <Instagram size={16} strokeWidth={1.75} />
  </a> */}

  {/* Enlace a Twitter (X ahora 👀) */}
  {/* <a href="#" aria-label="Twitter">
    <Twitter size={16} strokeWidth={1.75} />
  </a> */}

  {/* Enlace a WhatsApp */}
 {/*  <a href="#" aria-label="WhatsApp">
    
       MessageCircle se usa como representación de WhatsApp.
       Si querés algo más preciso podrías usar el ícono específico de WhatsApp.
   
    <MessageCircle size={16} strokeWidth={1.75} />
  </a> */}

</div>
        </div>

        <div className="footer-col">
          <h4>Cuenta</h4>
          <ul>
            <li>
              <Link href="/login">Iniciar sesión</Link>
            </li>
            <li>
              <Link href="/register">Registrarse</Link>
            </li>
            <li>
              <Link href="/profile">Mi perfil</Link>
            </li>
            <li>
              <Link href="/mis-productos">Mis productos</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Empresa</h4>
          <ul>
            <li>
              <Link href="/nosotros">Acerca de nosotros</Link>
            </li>
            <li>
              <Link href="/login">Vender en Off-ertas</Link>
            </li>
           
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>
            © {new Date().getFullYear()} MarketPlace. Todos los derechos
            reservados.
          </p>
          <div className="footer-bottom-links">
            <Link href="#">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="#">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
