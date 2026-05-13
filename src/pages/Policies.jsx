import React, { useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    id: 'privacy',
    title: 'Política de Privacidad',
    content: (
      <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-xs text-muted-foreground">Última actualización: 2 de mayo de 2026</p>
        <p>RAmi es una plataforma de comercio electrónico con sede en El Salvador. Esta política describe cómo recopilamos, utilizamos y protegemos tu información personal.</p>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Datos que recopilamos</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nombre completo, correo electrónico y contraseña (al crear cuenta)</li>
            <li>Dirección de envío y número de teléfono</li>
            <li>Historial de pedidos y productos comprados</li>
            <li>Reseñas y calificaciones de productos</li>
            <li>Datos de pago (procesados directamente por Stripe Inc.; nosotros no almacenamos datos de tarjetas)</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Base legal para el tratamiento de datos</h3>
          <p>Procesamos tus datos personales para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Ejecutar la relación contractual (procesar compras)</li>
            <li>Cumplir obligaciones legales</li>
            <li>Mejorar nuestros servicios (interés legítimo)</li>
            <li>En ciertos casos, con tu consentimiento</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Uso de la información</h3>
          <p>Utilizamos tu información para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Procesar y entregar pedidos</li>
            <li>Enviar confirmaciones y notificaciones</li>
            <li>Gestionar tu cuenta</li>
            <li>Mejorar tu experiencia en la aplicación</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Cookies y tecnologías similares</h3>
          <p>Podemos utilizar cookies u otras tecnologías para mejorar la funcionalidad y analizar el uso de la aplicación.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Compartición con terceros</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Proveedores de pago como Stripe para procesar transacciones</li>
            <li>No vendemos ni compartimos datos con fines publicitarios</li>
          </ul>
          <p className="mt-2">Algunos datos pueden ser procesados fuera de El Salvador mediante proveedores tecnológicos.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Retención de datos</h3>
          <p>Conservamos tus datos mientras tu cuenta esté activa o según lo requiera la ley.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Seguridad</h3>
          <p>Implementamos medidas de seguridad como cifrado SSL para proteger tu información.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Tus derechos</h3>
           <p>Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a: <a href="mailto:somosrami@gmail.com" className="text-primary underline">somosrami@gmail.com</a></p>
          </div>

          <div>
           <h3 className="font-semibold text-foreground mb-1">Contacto</h3>
           <a href="mailto:somosrami@gmail.com" className="text-primary underline">somosrami@gmail.com</a>
        </div>
      </div>
    ),
  },
  {
    id: 'terms',
    title: 'Términos y Condiciones de Uso',
    content: (
      <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-xs text-muted-foreground">Última actualización: 2 de mayo de 2026</p>
        <p>Al utilizar la aplicación RAmi, aceptas los siguientes términos:</p>

        <div>
          <h3 className="font-semibold text-foreground mb-1">1. Uso de la aplicación</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>La app está disponible para usuarios mayores de 18 años residentes en El Salvador.</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta.</li>
            <li>Nos reservamos el derecho de suspender o cancelar cuentas en caso de uso indebido.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">2. Pedidos y precios</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Los precios están en dólares estadounidenses (USD)</li>
            <li>Nos reservamos el derecho de cancelar pedidos por errores de precio, falta de stock o situaciones excepcionales</li>
            <li>En caso de cancelación por nuestra parte, se realizará el reembolso correspondiente</li>
          </ul>
          <p className="mt-2 font-medium text-foreground">Confirmación de pedidos:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Pagos con tarjeta: el pedido se confirma tras el pago exitoso</li>
            <li>Pago en efectivo: el pedido se confirma al momento de realizar la orden, sujeto a disponibilidad de stock y zona de entrega</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">3. Pagos</h3>
          <p>Aceptamos:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Tarjeta de crédito/débito (procesado por Stripe)</li>
            <li>Pago en efectivo al recibir (según disponibilidad de zona)</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">4. Cancelación de pedidos</h3>

          <p className="font-medium text-foreground">Pago en efectivo:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Puedes cancelar mientras el pedido esté en estado <em>Pendiente</em> o <em>En proceso</em></li>
            <li>Una vez enviado, no se permite la cancelación directa</li>
            <li>En casos de rechazos reiterados, podremos limitar el uso de este método de pago</li>
          </ul>

          <p className="font-medium text-foreground mt-3">Pago con tarjeta de crédito/débito:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Puedes cancelar dentro de las <strong>primeras 24 horas</strong> desde tu compra, mientras el pedido esté en estado <em>Pendiente</em> o <em>En proceso</em></li>
            <li>El reembolso se procesa automáticamente a tu tarjeta y puede tardar <strong>5 a 10 días hábiles</strong> según tu banco</li>
            <li>Pasadas las 24 horas, no se permite cancelar desde la app. Cualquier solicitud de cancelación después de este plazo queda a discreción del negocio y no está garantizada</li>
          </ul>

          <p className="font-medium text-foreground mt-3">Después del envío (cualquier método):</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>No se permite cancelación directa</li>
            <li>Puedes gestionar una devolución según nuestra política de devoluciones</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">5. Envíos</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Los tiempos y costos de envío se muestran en el checkout</li>
            <li>No nos responsabilizamos por retrasos derivados de terceros o causas fuera de nuestro control</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">6. Reseñas</h3>
          <p>Las reseñas deben ser honestas y respetuosas. Nos reservamos el derecho de eliminar contenido inapropiado.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">7. Propiedad intelectual</h3>
          <p>Todo el contenido de la aplicación (logos, diseño, textos, imágenes) es propiedad de RAmi y no puede ser utilizado sin autorización.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">8. Limitación de responsabilidad</h3>
          <p>RAmi no será responsable por daños indirectos, pérdidas económicas o perjuicios derivados del uso de la aplicación o de retrasos fuera de nuestro control razonable.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">9. Modificaciones</h3>
          <p>Podemos actualizar estos términos en cualquier momento. El uso continuo de la app implica aceptación de los cambios.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">10. Ley aplicable</h3>
          <p>Estos términos se rigen por las leyes de El Salvador.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Contacto</h3>
          <a href="mailto:somosrami@gmail.com" className="text-primary underline">somosrami@gmail.com</a>
        </div>
        </div>
        ),
        },
        {
        id: 'returns',
    title: 'Política de Devoluciones y Reembolsos',
    content: (
      <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
        <p className="text-xs text-muted-foreground">Última actualización: 2 de mayo de 2026</p>
        <p>En RAmi buscamos que tengas una buena experiencia de compra, manteniendo condiciones justas para ambas partes.</p>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Devoluciones</h3>
          <p>Puedes solicitar una devolución dentro de <strong>7 días calendario</strong> desde la entrega. El producto debe estar:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Sin uso</li>
            <li>En su empaque original</li>
            <li>Con todos sus accesorios</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Motivos de devolución</h3>
          <p>Aceptamos devoluciones cuando:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>El producto es defectuoso</li>
            <li>Recibiste un producto incorrecto</li>
            <li>El producto no cumple tus expectativas (sin uso, en empaque original; el cliente cubre el costo de envío)</li>
          </ul>
          <p className="mt-2 font-medium text-foreground">No aplican devoluciones para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Productos de uso personal o higiene (cuando aplique)</li>
            <li>Productos dañados por mal uso</li>
            <li>Productos incompletos o sin empaque</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Costos de devolución</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Por preferencia del cliente → el cliente cubre el envío</li>
            <li>Por error nuestro o producto defectuoso → nosotros cubrimos el envío</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Evaluación</h3>
          <p>Todas las devoluciones serán revisadas antes de aprobar el reembolso. El proceso puede tardar entre 2 a 5 días hábiles.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Reembolsos</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pagos con tarjeta → 5 a 10 días hábiles (según el banco)</li>
            <li>Pago en efectivo → reembolso mediante transferencia bancaria o acuerdo con soporte</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Productos defectuosos</h3>
          <p>Debes reportarlo dentro de <strong>48 horas</strong> después de recibir el pedido, incluyendo evidencia (fotos).</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-1">Uso responsable</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Podemos rechazar devoluciones que no cumplan las condiciones</li>
            <li>En casos de uso excesivo o sospechoso, podremos limitar futuras devoluciones</li>
          </ul>
        </div>
      </div>
    ),
  },
];

function PolicyAccordion({ section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4 bg-card text-left gap-3"
      >
        <span className="font-semibold text-foreground text-sm">{section.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-5 pt-2 bg-card border-t border-border">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function Policies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Políticas legales</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <p className="text-sm text-muted-foreground pb-1">
          Toca cada sección para leer los detalles completos.
        </p>
        {SECTIONS.map(section => (
          <PolicyAccordion key={section.id} section={section} />
        ))}
        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          © 2026 RAmi · El Salvador
        </p>
      </div>
    </div>
  );
}