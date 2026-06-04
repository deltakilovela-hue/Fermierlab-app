import { SignIn } from '@clerk/react';
import { Leaf } from 'lucide-react';

// ── Apariencia personalizada de Clerk para que combine con la app ─────────────

const clerkAppearance = {
  elements: {
    rootBox:              'w-full max-w-md',
    card:                 'rounded-3xl shadow-xl bg-white border-0 w-full py-2',
    headerTitle:          'text-xl font-bold text-gray-800',
    headerSubtitle:       'text-sm text-gray-500',
    socialButtonsBlockButton:
      'border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-colors font-medium',
    dividerLine:          'bg-gray-200',
    dividerText:          'text-gray-400 text-xs',
    formFieldLabel:       'text-xs font-bold text-gray-500 uppercase tracking-wider',
    formFieldInput:
      'border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base bg-gray-50 ' +
      'focus:bg-white focus:border-[#1a3320] focus:ring-0 transition-colors',
    formButtonPrimary:
      'bg-[#1a3320] hover:bg-[#254830] rounded-2xl py-3.5 text-base font-bold ' +
      'transition-colors shadow-sm',
    footerActionLink:     'text-[#1a3320] hover:text-[#254830] font-medium',
    identityPreviewText:  'text-gray-700',
    formResendCodeLink:   'text-[#1a3320] hover:text-[#254830]',
    otpCodeFieldInput:
      'border-2 border-gray-200 rounded-xl text-lg font-bold ' +
      'focus:border-[#1a3320] focus:ring-0',
  },
};

// ── Login page ────────────────────────────────────────────────────────────────

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Panel izquierdo — marca ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-[#1a3320] text-white w-80 shrink-0 p-10">
        {/* Logo */}
        <div>
          <div className="w-14 h-14 rounded-2xl bg-green-400/20 flex items-center justify-center mb-5">
            <Leaf size={28} className="text-green-300" />
          </div>
          <h1 className="text-2xl font-bold leading-tight">Fermier Lab</h1>
          <p className="text-green-300 mt-1 text-sm">Sistema de Muestreo Agrícola</p>
        </div>

        {/* Características */}
        <div className="space-y-4">
          {[
            'Captura de resultados en campo',
            'Análisis de nematodos y fitopatógenos',
            'Mapeo satelital de parcelas',
            'Comparativa pre / post tratamiento',
            'Asesor agrícola con inteligencia artificial',
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm text-green-100/80">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] text-green-400/60">Culiacán, Sinaloa</p>
          <p className="text-[11px] text-white/30 mt-0.5">v1.3.0 — Fase 4</p>
        </div>
      </div>

      {/* ── Panel derecho — formulario Clerk ─────────────────────────────────── */}
      <div className="flex-1 bg-[#f1f5f1] flex flex-col items-center justify-center
        p-5 sm:p-8 min-h-screen lg:min-h-0">

        {/* Logo móvil */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1a3320] flex items-center justify-center mx-auto mb-3">
            <Leaf size={26} className="text-green-300" />
          </div>
          <h1 className="text-xl font-bold text-[#1a3320]">Fermier Lab</h1>
          <p className="text-sm text-gray-500">Sistema de Muestreo Agrícola</p>
        </div>

        {/* Componente de inicio de sesión de Clerk
            → Muestra automáticamente: correo+contraseña, Google, passkeys
              según lo que tengas activado en el Dashboard                    */}
        <SignIn
          routing="hash"
          appearance={clerkAppearance}
          signUpUrl="/sign-up"
        />

        <p className="mt-6 text-xs text-gray-400">
          Culiacán, Sinaloa · v1.3.0 · Fase 4
        </p>
      </div>
    </div>
  );
}
