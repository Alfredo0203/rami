import React from 'react';
import { ChevronLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DataDeletion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Eliminación de Cuenta y Datos</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 prose prose-sm prose-slate max-w-none">
        <p className="text-xs text-muted-foreground mb-4">Última actualización: 11 de septiembre de 2026</p>

        <p>
          En RAmi respetamos tu privacidad. Puedes solicitar la eliminación de tu cuenta
          de usuario y de todos los datos personales asociados en cualquier momento.
        </p>

        <h2>Datos que se eliminan</h2>
        <p>Al solicitar la eliminación de tu cuenta, se borrarán:</p>
        <ul>
          <li>Nombre, correo electrónico y credenciales de acceso</li>
          <li>Direcciones de envío guardadas y número de teléfono</li>
          <li>Historial de pedidos y carrito de compras</li>
          <li>Reseñas y calificaciones de productos</li>
          <li>Lista de deseos (wishlist)</li>
        </ul>
        <p>
          Algunos datos pueden conservarse temporalmente por obligaciones legales o
          fiscales, y se eliminarán automáticamente cuando finalice el período de retención.
        </p>

        <h2>Cómo solicitar la eliminación</h2>
        <p>
          Envía un correo electrónico a <strong>somosrami@gmail.com</strong> desde la
          dirección de correo registrada en tu cuenta, con el asunto:
        </p>
        <div className="p-3 bg-muted rounded-md text-sm font-mono">
          Solicitud de eliminación de cuenta
        </div>
        <p>Incluye en el correo:</p>
        <ul>
          <li>El correo electrónico de tu cuenta en RAmi</li>
          <li>Una declaración indicando que deseas eliminar tu cuenta y todos tus datos</li>
        </ul>
        <p>
          Procesaremos tu solicitud en un plazo máximo de <strong>30 días hábiles</strong> y
          te confirmaremos por correo cuando tu cuenta y tus datos hayan sido eliminados.
        </p>

        <div className="mt-6 p-4 bg-muted rounded-lg flex items-start gap-3">
          <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Contacto</p>
            <p className="text-muted-foreground">somosrami@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}