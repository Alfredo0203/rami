import React, { useState } from 'react';
import { ChevronLeft, Mail, MessageCircle, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { goBack } from '@/lib/navigation';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const SUPPORT_EMAIL = 'alfredotorres.niu@gmail.com';
const WHATSAPP_NUMBER = '+50370000000';

export default function Contact() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke('sendGmailEmail', {
        to: SUPPORT_EMAIL,
        subject: `Nuevo mensaje de contacto — ${name}`,
        body: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
      });
      toast.success('¡Mensaje enviado! Te responderemos pronto.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('No se pudo enviar el mensaje. Intenta de nuevo o escríbenos por WhatsApp.');
    } finally {
      setSending(false);
    }
  };

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda con RAmi')}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => goBack(navigate)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base">Contacto</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground mb-6">
          ¿Tienes preguntas, sugerencias o necesitas ayuda con un pedido? Estamos aquí para ayudarte.
        </p>

        {/* Contact methods */}
        <div className="space-y-3 mb-8">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm hover:bg-secondary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Correo electrónico</p>
              <p className="text-xs text-muted-foreground truncate">{SUPPORT_EMAIL}</p>
            </div>
          </a>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm hover:bg-secondary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">WhatsApp</p>
              <p className="text-xs text-muted-foreground">{WHATSAPP_NUMBER}</p>
            </div>
          </a>
        </div>

        {/* Contact form */}
        <div className="bg-card rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-base mb-4">Envíanos un mensaje</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mensaje</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="¿En qué podemos ayudarte?"
                rows={4}
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-8 pb-8">
          © 2026 RAmi · El Salvador
        </p>
      </div>
    </div>
  );
}