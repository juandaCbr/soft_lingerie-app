import { Truck, MapPin, User, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { COLOMBIA_COMPLETA } from "@/app/lib/colombia";
import { CHECKOUT_ENVIO, esCiudadEnvioLocal } from "@/app/lib/checkout-config";
import { validarNombreCompleto } from "@/app/lib/utils";
import type { CheckoutFormData } from "./checkout-types";
import { useState } from "react";

type CheckoutShippingFormProps = {
  formData: CheckoutFormData;
  ciudadesDisponibles: string[];
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  cartEmpty: boolean;
};

export function CheckoutShippingForm({
  formData,
  ciudadesDisponibles,
  onFieldChange,
  onSubmit,
  loading,
  cartEmpty,
}: CheckoutShippingFormProps) {
  // Validación visual del nombre: se evalúa on-blur y al escribir si ya hubo error.
  const [nombreTouched, setNombreTouched] = useState(false);
  const errorNombre = nombreTouched ? validarNombreCompleto(formData.nombre) : null;
  return (
    <form onSubmit={onSubmit} className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-ink"><User size={15} /></span> Datos de contacto
        </h2>

        <div className="space-y-1.5">
          <label className="ml-1 flex items-center gap-2 text-sm font-semibold text-ink/75">
            <Mail size={12} /> Correo electrónico
          </label>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
            placeholder="tu@correo.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="ml-1 flex items-center gap-2 text-sm font-semibold text-ink/75">
            <User size={12} /> Nombre y apellido
          </label>
          <input
            required
            name="nombre"
            value={formData.nombre}
            onChange={(e) => {
              onFieldChange(e);
              if (nombreTouched) {
                // revalida en vivo tras el primer blur para que el usuario vea
                // cómo el error desaparece al añadir el apellido.
              }
            }}
            onBlur={() => setNombreTouched(true)}
            className={`w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary ${
              errorNombre ? "ring-2 ring-red-400 focus:ring-red-500" : ""
            }`}
            placeholder="Ej: María Pérez (nombre y apellido)"
          />
          {errorNombre && (
            <p className="ml-1 flex items-center gap-1 text-sm font-medium text-red-600">
              {errorNombre}
            </p>
          )}
        </div>
        <input
          required
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={onFieldChange}
          className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
          placeholder="WhatsApp / Celular"
        />
        <div className="space-y-1.5">
          <label className="ml-1 text-sm font-semibold text-ink/75">
            Número de cédula/documento
          </label>
          <input
            required
            type="text"
            name="documento_cliente"
            inputMode="numeric"
            autoComplete="off"
            maxLength={15}
            value={formData.documento_cliente}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
            placeholder="Ej: 1234567890"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-ink/5 pt-8">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-ink"><MapPin size={15} /></span> Dirección de envío
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="departamento"
            value={formData.departamento}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            {Object.keys(COLOMBIA_COMPLETA)
              .sort()
              .map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
          </select>
          <select
            name="ciudad"
            value={formData.ciudad}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            {ciudadesDisponibles.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {esCiudadEnvioLocal(formData.ciudad) && (
          <div className="flex items-center gap-4 rounded-[1.5rem] bg-brand-accent/60 p-5 animate-in zoom-in duration-500">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-base font-semibold leading-none text-ink">Envío local</p>
              <p className="mt-1 text-sm text-ink/70">Recibe hoy mismo en {CHECKOUT_ENVIO.ciudadLocal}.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            name="direccion"
            value={formData.direccion}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
            placeholder="Dirección (calle y número)"
          />
          <input
            required
            name="barrio"
            value={formData.barrio}
            onChange={onFieldChange}
            className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
            placeholder="Barrio"
          />
        </div>
        <input
          name="apartamento"
          value={formData.apartamento}
          onChange={onFieldChange}
          className="w-full rounded-2xl bg-cream px-5 py-4 text-[15px] text-ink outline-none ring-1 ring-ink/10 transition placeholder:text-ink/40 focus:bg-white focus:ring-2 focus:ring-brand-primary"
          placeholder="Apto, torre o casa (opcional)"
        />
      </div>

      <button
        type="submit"
        disabled={loading || cartEmpty}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-full bg-ink text-lg font-bold text-white shadow-xl shadow-ink/25 transition-colors hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
        {loading ? "Preparando pedido..." : "Confirmar información"}
      </button>
    </form>
  );
}
