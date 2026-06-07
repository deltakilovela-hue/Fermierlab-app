import { UserProfile } from '@clerk/react';

// Apariencia personalizada para que combine con el tema verde de Fermier
const appearance = {
  elements: {
    rootBox:                    'w-full max-w-3xl',
    card:                       'rounded-3xl shadow-lg border-0',
    navbar:                     'rounded-l-3xl bg-white',
    navbarButton:               'text-gray-600 hover:text-[#1769a5] hover:bg-green-50 rounded-xl',
    navbarButton__active:       'text-[#1769a5] bg-green-50 font-semibold rounded-xl',
    pageScrollBox:              'p-6',
    profileSectionTitleText:    'text-gray-800 font-bold',
    formButtonPrimary:
      'bg-[#1769a5] hover:bg-[#11537f] rounded-xl font-semibold transition-colors',
    formFieldInput:
      'border-2 border-gray-200 rounded-xl focus:border-[#1769a5] focus:ring-0 transition-colors',
    badge:                      'bg-green-100 text-green-800',
  },
};

export default function Perfil() {
  return (
    <div className="flex items-start justify-center p-8 min-h-full bg-[#f1f5f1]">
      <UserProfile routing="hash" appearance={appearance} />
    </div>
  );
}
