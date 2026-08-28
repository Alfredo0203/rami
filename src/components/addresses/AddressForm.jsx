import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { getDepartments, getMunicipalities } from '@/lib/territorial';
import { toast } from 'sonner';

const COUNTRY_CODE = 'SV';

// Reverse geocode GPS coordinates using OpenStreetMap Nominatim (free, no API key)
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error('No se pudo obtener la dirección');
  const data = await res.json();
  return data?.address || {};
}

// Match a string to a list of known names (case-insensitive, trimmed)
function matchName(value, names) {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  return names.find(n => n.toLowerCase() === v) || '';
}

const EMPTY_FORM = {
  label: 'Casa',
  first_name: '',
  last_name: '',
  phone: '',
  departamento: '',
  municipio: '',
  colonia: '',
  street: '',
  house_number: '',
  reference: '',
  country: 'El Salvador',
};

// Helpers
function formatPhone(raw) {
  return raw.replace(/\D/g, '').slice(0, 8);
}

function validate(form) {
  const e = {};
  if (!form.first_name.trim() || form.first_name.trim().length < 3)
    e.first_name = 'El nombre debe tener al menos 3 letras';
  if (!form.last_name.trim() || form.last_name.trim().length < 3)
    e.last_name = 'El apellido debe tener al menos 3 letras';
  if (!form.phone.trim())
    e.phone = 'El teléfono es requerido';
  else if (!/^\d{8}$/.test(form.phone.trim()))
    e.phone = 'Ingresa exactamente 8 dígitos (ej: 71234567)';
  if (!form.departamento)
    e.departamento = 'Selecciona un departamento';
  if (!form.municipio)
    e.municipio = 'Selecciona un municipio';
  if (!form.colonia.trim())
    e.colonia = 'La colonia / residencial / barrio es requerida';
  if (!form.street.trim())
    e.street = 'La calle / pasaje / avenida es requerida';
  if (!form.house_number.trim())
    e.house_number = 'El número de casa es requerido';
  return e;
}

// Field wrapper OUTSIDE component to prevent remounts on re-render
function Field({ label, error, optional, children }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {optional && <span className="text-[10px] text-muted-foreground">(opcional)</span>}
      </div>
      {children}
      {error && <p className="text-[11px] text-destructive mt-0.5">{error}</p>}
    </div>
  );
}

function SelectField({ value, onChange, disabled, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function AddressForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errors, setErrors] = useState({});
  const [locating, setLocating] = useState(false);

  const departments = getDepartments(COUNTRY_CODE);
  const departmentNames = departments.map(d => d.name);
  const municipalities = form.departamento
    ? getMunicipalities(COUNTRY_CODE, form.departamento)
    : [];

  // GPS: get coordinates and reverse-geocode to fill the address fields
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu dispositivo no soporta GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const addr = await reverseGeocode(latitude, longitude);

          // Match departamento to known SV list
          const matchedDept = matchName(addr.state, departmentNames);
          let matchedMuni = '';
          if (matchedDept) {
            const muniNames = getMunicipalities(COUNTRY_CODE, matchedDept);
            matchedMuni = matchName(addr.city || addr.town || addr.village || addr.county, muniNames);
          }

          setForm(f => ({
            ...f,
            departamento: matchedDept || f.departamento,
            municipio: matchedMuni || f.municipio,
            colonia: addr.suburb || addr.neighbourhood || addr.hamlet || addr.quarter || f.colonia,
            street: addr.road || addr.pedestrian || addr.footway || f.street,
            house_number: addr.house_number || f.house_number,
            reference: [
              addr.neighbourhood && addr.neighbourhood !== (addr.suburb || '') ? addr.neighbourhood : '',
              addr.city && addr.city !== matchedMuni ? addr.city : '',
            ].filter(Boolean).join(', ') || f.reference,
          }));
          setErrors({});
          toast.success('Ubicación detectada. Revisa los campos antes de guardar.');
        } catch (err) {
          toast.error(err.message || 'Error al obtener tu dirección');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg = err.code === 1
          ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
          : 'No se pudo obtener tu ubicación. Inténtalo de nuevo.';
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Reset municipio when departamento changes
  useEffect(() => {
    setForm(f => ({ ...f, municipio: '' }));
  }, [form.departamento]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = () => {
    const e = validate(form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, phone: `+503 ${form.phone}` });
  };

  return (
    <div className="space-y-3">

      {/* País */}
      <Field label="País">
        <Input value="El Salvador" disabled className="h-9 text-sm bg-muted" />
      </Field>

      {/* Usar mi ubicación (GPS) */}
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium active:scale-95 transition-transform touch-manipulation disabled:opacity-60"
      >
        {locating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Detectando ubicación...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            Usar mi ubicación (GPS)
          </>
        )}
      </button>

      {/* Nombre + Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" error={errors.first_name}>
          <Input
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            placeholder="Ej: María"
            className="h-9 text-sm"
          />
        </Field>
        <Field label="Apellido" error={errors.last_name}>
          <Input
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            placeholder="Ej: García"
            className="h-9 text-sm"
          />
        </Field>
      </div>

      {/* Teléfono */}
      <Field label="Número de teléfono" error={errors.phone}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground bg-muted border border-border rounded-md px-3 h-9 flex items-center select-none shrink-0">
            +503
          </span>
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
        <SelectField
          value={form.departamento}
          onChange={e => set('departamento', e.target.value)}
          placeholder="— Selecciona un departamento —"
          options={departments.map(d => d.name)}
        />
      </Field>

      {/* Municipio */}
      <Field label="Municipio" error={errors.municipio}>
        <SelectField
          value={form.municipio}
          onChange={e => set('municipio', e.target.value)}
          disabled={!form.departamento}
          placeholder={form.departamento ? '— Selecciona un municipio —' : '— Primero selecciona departamento —'}
          options={municipalities}
        />
      </Field>

      {/* Colonia / Residencial / Barrio */}
      <Field label="Colonia / Residencial / Barrio" error={errors.colonia}>
        <Input
          value={form.colonia}
          onChange={e => set('colonia', e.target.value)}
          placeholder="Ej: Col. Escalón, Res. Santa Elena, Bo. San Miguelito"
          className="h-9 text-sm"
        />
      </Field>

      {/* Calle / Pasaje / Avenida */}
      <Field label="Calle / Pasaje / Avenida" error={errors.street}>
        <Input
          value={form.street}
          onChange={e => set('street', e.target.value)}
          placeholder="Ej: Calle Los Bambúes, Pasaje 2"
          className="h-9 text-sm"
        />
      </Field>

      {/* Número de casa */}
      <Field label="Número de casa" error={errors.house_number}>
        <Input
          value={form.house_number}
          onChange={e => set('house_number', e.target.value)}
          placeholder="Ej: #23, Casa 5-B"
          className="h-9 text-sm"
        />
      </Field>

      {/* Punto de referencia (opcional) */}
      <Field label="Punto de referencia" optional error={errors.reference}>
        <Input
          value={form.reference}
          onChange={e => set('reference', e.target.value)}
          placeholder="Ej: Frente al parque, contiguo a farmacia"
          className="h-9 text-sm"
        />
      </Field>

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-primary text-primary-foreground"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar dirección'}
        </Button>
      </div>
    </div>
  );
}