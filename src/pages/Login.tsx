import { SignIn } from '@clerk/react';
import Logo from '../components/Logo';

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
      'focus:bg-white focus:border-[#1769a5] focus:ring-0 transition-colors',
    formButtonPrimary:
      'bg-[#1769a5] hover:bg-[#11537f] rounded-2xl py-3.5 text-base font-bold ' +
      'transition-colors shadow-sm',
    footerActionLink:     'text-[#1769a5] hover:text-[#11537f] font-medium',
    identityPreviewText:  'text-gray-700',
    formResendCodeLink:   'text-[#1769a5] hover:text-[#11537f]',
    otpCodeFieldInput:
      'border-2 border-gray-200 rounded-xl text-lg font-bold ' +
      'focus:border-[#1769a5] focus:ring-0',
  },
};

// ── Login page ────────────────────────────────────────────────────────────────

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Panel izquierdo — marca ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-[#1769a5] text-white w-80 shrink-0 p-10">
        {/* Logo */}
        <Logo variant="dark" size={36} />

        {/* Características */}
        <div className="space-y-4">
          {[
            'Captura de resultados en campo',
            'Análisis de nematodos y fitopatógenos',
            'Mapeo satelital de parcelas',
            'Comparativa pre / post tratamiento',
            'Asesor agrícola con inteligencia artificial',
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3aa935] shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] text-white/50">Culiacán, Sinaloa</p>
          <p className="text-[11px] text-white/30 mt-0.5">v1.4.0 — Fermier</p>
        </div>
      </div>

      {/* ── Panel derecho — formulario Clerk ─────────────────────────────────── */}
      <div className="flex-1 bg-[#f1f5f1] flex flex-col items-center justify-center
        p-5 sm:p-8 min-h-screen lg:min-h-0">

        {/* Logo móvil */}
        <div className="lg:hidden mb-8 flex justify-center">
          <Logo variant="light" size={30} />
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
