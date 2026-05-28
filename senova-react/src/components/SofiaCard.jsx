/**
 * SofiaCard — cartão da conselheira Sofia na dashboard.
 * Props: message, onChat
 */
export function SofiaCard({ message, onChat }) {
  const defaultMsg =
    'Marcos, você tem 2 vagas alinhadas com seu perfil de liderança estratégica esta semana. Quer analisá-las juntos?';

  return (
    <div className="bg-gradient-to-br from-[#1A3A5C] to-blue-900 rounded-xl p-5 text-white shadow-[0_1px_4px_rgba(26,58,92,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center text-sm select-none">
          ✨
        </div>
        <div>
          <div className="font-['Playfair_Display'] text-sm font-bold text-[#C9A84C]">Sofia</div>
          <div className="text-xs text-blue-200">Conselheira de vocação</div>
        </div>
      </div>

      {/* Mensagem */}
      <p className="text-xs text-blue-100 leading-relaxed mb-4 italic">
        "{message || defaultMsg}"
      </p>

      {/* CTA */}
      <button
        onClick={onChat}
        className="w-full text-xs font-semibold bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30
                   border border-[#C9A84C]/40 text-[#C9A84C] rounded-lg py-2 transition-colors"
      >
        Conversar com a Sofia →
      </button>
    </div>
  );
}
