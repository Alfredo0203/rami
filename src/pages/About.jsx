import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { goBack } from '@/lib/navigation';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => goBack(navigate)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Acerca de RAmi</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-slate max-w-none">
        <p className="text-xs text-muted-foreground mb-4">Última actualización: 2 de mayo de 2026</p>

        <p>
          RAmi es una plataforma de comercio electrónico con sede en El Salvador, dedicada a
          entregar productos esenciales premium directamente a la puerta de nuestros clientes.
          Combinamos precios accesibles, una experiencia de compra sencilla y un servicio al
          cliente cercano para democratizar el acceso a productos de calidad.
        </p>

        <h2>Qué hacemos</h2>
        <p>
          Operamos un catálogo curado que abarca desde artículos para el hogar hasta tecnología y
          accesorios. Gestionamos todo el ciclo de compra: navegación del catálogo, carrito, pago
          seguro con tarjeta o contra entrega, y entrega final en la dirección que elijas dentro de
          El Salvador. También trabajamos con vendedores externos que publican sus propios productos
          en la plataforma.
        </p>

        <h2>Para quién es RAmi</h2>
        <p>
          RAmi está diseñado para cualquier persona en El Salvador que busque una forma rápida,
          confiable y transparente de comprar desde su teléfono. Ya seas un cliente nuevo o un
          comprador frecuente que aprovecha nuestras ofertas y cupones, la app se adapta a ti.
        </p>

        <h2>Quiénes somos</h2>
        <p>
          RAmi es construido y mantenido por Alfred Torres y Raquel, un equipo comprometido con
          crear tecnología que mejore la vida de las personas en El Salvador. Nuestra
          infraestructura de pago está respaldada por proveedores certificados como Stripe, y
          nunca almacenamos los datos de tu tarjeta.
        </p>

        <h2>Nuestros valores</h2>
        <ul>
          <li><strong>Transparencia:</strong> precios claros, sin sorpresas.</li>
          <li><strong>Calidad:</strong> productos seleccionados que cumplen nuestros estándares.</li>
          <li><strong>Cercanía:</strong> soporte humano cuando lo necesites.</li>
          <li><strong>Seguridad:</strong> tus datos y pagos protegidos con cifrado.</li>
        </ul>

        <hr className="my-8" />
        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          © 2026 RAmi · El Salvador
        </p>
      </div>
    </div>
  );
}