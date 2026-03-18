import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getDepartments, getMunicipalities } from '@/lib/territorial';

const COUNTRY_CODE = 'SV';

const EMPTY_FORM = {
  label: 'Casa',
  full_name: '',
  phone: '',
  departamento: '',
  municipio: '',
  street: '',
  house_number: '',
  dui: '',
  country: 'El Salvador',
};

function validatePhone(phone) {
  return /^\d{8}$/.test(phone.trim());
}

function validateDUI(dui) {
  return /^\d{8}-\d$/.test(dui.trim());
}

function formatPhone(raw) {
  return raw.replace(/\D/g, '').slice(0, 8);
}

function formatDUI(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length > 8) return `${digits.slice(0, 8)}-${digits[8]}`;
  return digits;
}

// Field wrapper defined OUTSIDE component to avoid remounts on each render
function Field({ label, error, children }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive mt-0.5">{error}</p>}
    </div>
  );
}

export default function AddressForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState({});

  const departments = getDepartments(COUNTRY_CODE);
  const municipalities = form.departamento
    ? getMunicipalities(COUNTRY_CODE, form.departamento)
    : [];

  // Reset municipio when departamento changes
  useEffect(() => {
    setForm(f => ({ ...f, municipio: '' }));
  }, [form.departamento]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'El nombre es requerido';
    if (!form.phone.trim()) e.phone = 'El teléfono es requerido';
    else if (!validatePhone(form.phone)) e.phone = 'Formato inválido. Ingresa 8 dígitos (ej: 71234567)';
    if (!form.departamento) e.departamento = 'Selecciona un departamento';
    if (!form.municipio) e.municipio = 'Selecciona un municipio';
    if (!form.street.trim()) e.street = 'La calle o avenida es requerida';
    if (!form.house_number.trim()) e.house_number = 'El número de casa es requerido';
    if (!form.dui.trim()) e.dui = 'El DUI es requerido';
    else if (!validateDUI(form.dui)) e.dui = 'Formato inválido. Ej: 12345678-9';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, phone: `+503 ${form.phone}` });
  };

  return (
    <div className="space-y-3">
      {/* País — read-only */}
      <Field label="País">
        <Input value="El Salvador" disabled className="h-9 text-sm bg-muted" />
      </Field>

      {/* Nombre completo */}
      <Field label="Nombre completo" error={errors.full_name}>
        <Input
          value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          placeholder="Ej: María García"
          className="h-9 text-sm"
        />
      </Field>

      {/* Teléfono */}
      <Field label="Número de teléfono" error={errors.phone}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground bg-muted border border-border rounded-md px-3 h-9 flex items-center select-none">+503</span>
          <Input
            value={form.phone}
            onChange={e => set('phone', formatPhone(e.target.value))}
            placeholder="71234567"
            maxLength={8}
            inputMode="numeric"
            className="h-9 text-sm flex-1"
          />
        </div>
      </Field>

      {/* Departamento */}
      <Field label="Departamento" error={errors.departamento}>
        <select
          value={form.departamento}
          onChange={e => set('departamento', e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Selecciona un departamento —</option>
          {departments.map(d => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
      </Field>

      {/* Municipio */}
      <Field label="Municipio" error={errors.municipio}>
        <select
          value={form.municipio}
          onChange={e => set('municipio', e.target.value)}
          disabled={!form.departamento}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          <option value="">— Selecciona un municipio —</option>
          {municipalities.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      {/* Calle o avenida */}
      <Field label="Calle o avenida" error={errors.street}>
        <Input
          value={form.street}
          onChange={e => set('street', e.target.value)}
          placeholder="Ej: Calle Principal, Col. San Benito"
          className="h-9 text-sm"
        />
      </Field>

      {/* Número de casa */}
      <Field label="Número de casa" error={errors.house_number}>
        <Input
          value={form.house_number}
          onChange={e => set('house_number', e.target.value)}
          placeholder="Ej: #15, Pasaje 3"
          className="h-9 text-sm"
        />
      </Field>

      {/* DUI */}
      <Field label="Número de DUI" error={errors.dui}>
        <Input
          value={form.dui}
          onChange={e => set('dui', formatDUI(e.target.value))}
          placeholder="12345678-9"
          maxLength={10}
          inputMode="numeric"
          className="h-9 text-sm"
        />
      </Field>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button size="sm" className="flex-1 bg-primary text-primary-foreground" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}