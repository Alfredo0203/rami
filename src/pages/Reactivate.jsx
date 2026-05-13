import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Reactivate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token no válido');
      return;
    }

    const reactivate = async () => {
      try {
        await base44.functions.invoke('reactivateAccount', { token });
        setStatus('success');
        setMessage('Tu cuenta ha sido reactivada exitosamente.');
        toast.success('Cuenta reactivada');
        setTimeout(() => navigate('/'), 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.error || 'Error al reactivar la cuenta');
      }
    };

    reactivate();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card rounded-xl p-6 shadow-lg text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-foreground font-medium">Reactivando tu cuenta...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">¡Listo!</h2>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <p className="text-xs text-muted-foreground">Redirigiendo en 3 segundos...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Error</h2>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Volver al inicio
            </Button>
          </>
        )}
      </div>
    </div>
  );
}