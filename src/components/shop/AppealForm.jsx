import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function AppealForm({ userEmail, userName }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Por favor escribe tu mensaje antes de enviar.');
      return;
    }
    try {
      setSending(true);
      await base44.functions.invoke('sendAppeal', {
        userEmail,
        userName,
        message,
      });
      toast.success('Tu apelación fue enviada. Te contactaremos pronto.');
      setMessage('');
      setOpen(false);
    } catch (err) {
      toast.error('Error al enviar la apelación. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline mx-auto"
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {open ? 'Ocultar formulario' : 'Enviar apelación / solicitar revisión'}
      </button>

      {open && (
        <div className="mt-3 bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground text-center">
            Tu mensaje será enviado a nuestro equipo de soporte.
          </p>

          {/* Email destino (readonly) */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Correo de soporte</label>
            <Input
              value="somosrami@gmail.com"
              readOnly
              className="bg-muted text-muted-foreground text-sm cursor-default"
            />
          </div>

          {/* Mensaje del usuario */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tu mensaje</label>
            <Textarea
              placeholder="Explica tu caso aquí..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="min-h-[100px] text-sm resize-none"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar apelación
          </Button>
        </div>
      )}
    </div>
  );
}