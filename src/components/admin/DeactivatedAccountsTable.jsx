import React from 'react';
import { UserX, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_REASON_ES = {
  'self_deactivated': 'Desactivada por el usuario',
  'admin_deactivated': 'Desactivada por un administrador',
  'inactivity': 'Inactividad prolongada',
  'policy_violation': 'Violación de políticas',
  'requested': 'Solicitada por el usuario',
};

function translateReason(reason) {
  if (!reason) return 'Sin motivo especificado';
  // Try direct key match first
  if (STATUS_REASON_ES[reason]) return STATUS_REASON_ES[reason];
  // Return as-is if it's already in Spanish or unknown
  return reason;
}

export default function DeactivatedAccountsTable({ users }) {
  const deactivated = users.filter(u => u.status === 'deactivated');

  if (deactivated.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <UserX className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Cuentas desactivadas</span>
        </div>
        <p className="text-xs text-muted-foreground">No hay cuentas desactivadas actualmente.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-destructive/20 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <UserX className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-foreground">Cuentas desactivadas</span>
        <span className="ml-auto bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full">
          {deactivated.length}
        </span>
      </div>

      <div className="space-y-2">
        {deactivated.map(u => (
          <div key={u.id} className="flex items-start gap-3 bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-destructive">
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {translateReason(u.status_reason)}
              </p>
            </div>
            {u.status_changed_at && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />
                {format(new Date(u.status_changed_at), "d MMM yy", { locale: es })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}