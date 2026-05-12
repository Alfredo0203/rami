import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Política de Privacidad</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-slate max-w-none">
        <p className="text-xs text-muted-foreground mb-4">Última actualización: 2 de mayo de 2026</p>

        <p>RAmi es una plataforma de comercio electrónico con sede en El Salvador. Esta política describe cómo recopilamos, utilizamos y protegemos tu información personal.</p>

        <h2>Datos que recopilamos</h2>
        <ul>
          <li>Nombre completo, correo electrónico y contraseña (al crear cuenta)</li>
          <li>Dirección de envío y número de teléfono</li>
          <li>Historial de pedidos y productos comprados</li>
          <li>Reseñas y calificaciones de productos</li>
          <li>Datos de pago (procesados directamente por Stripe Inc.; nosotros no almacenamos datos de tarjetas)</li>
        </ul>

        <h2>Base legal para el tratamiento de datos</h2>
        <p>Procesamos tus datos personales para:</p>
        <ul>
          <li>Ejecutar la relación contractual (procesar compras)</li>
          <li>Cumplir obligaciones legales</li>
          <li>Mejorar nuestros servicios (interés legítimo)</li>
          <li>En ciertos casos, con tu consentimiento</li>
        </ul>

        <h2>Uso de la información</h2>
        <p>Utilizamos tu información para:</p>
        <ul>
          <li>Procesar y entregar pedidos</li>
          <li>Enviar confirmaciones y notificaciones</li>
          <li>Gestionar tu cuenta</li>
          <li>Mejorar tu experiencia en la aplicación</li>
        </ul>

        <h2>Cookies y tecnologías similares</h2>
        <p>Podemos utilizar cookies u otras tecnologías para mejorar la funcionalidad y analizar el uso de la aplicación.</p>

        <h2>Compartición con terceros</h2>
        <ul>
          <li>Proveedores de pago como Stripe para procesar transacciones</li>
          <li>No vendemos ni compartimos datos con fines publicitarios</li>
        </ul>
        <p>Algunos datos pueden ser procesados fuera de El Salvador mediante proveedores tecnológicos.</p>

        <h2>Retención de datos</h2>
        <p>Conservamos tus datos mientras tu cuenta esté activa o según lo requiera la ley.</p>

        <h2>Seguridad</h2>
        <p>Implementamos medidas de seguridad como cifrado SSL para proteger tu información.</p>

        <h2>Tus derechos</h2>
        <p>Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a: <a href="mailto:alfredotorres.niu@gmail.com" className="text-primary underline">alfredotorres.niu@gmail.com</a></p>

        <h2>Contacto</h2>
        <p><a href="mailto:alfredotorres.niu@gmail.com" className="text-primary underline">alfredotorres.niu@gmail.com</a></p>

        <hr className="my-8" />
        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          © 2026 RAmi · El Salvador
        </p>
      </div>
    </div>
  );
}