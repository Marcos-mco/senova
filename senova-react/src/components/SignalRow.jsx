/**
 * SignalRow — linha da Central de Sinais (emails, alertas, vagas, inativos).
 * Props: icon, label, color, badge, action, onClick
 */
export function SignalRow({ icon, label, color, badge, action, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group text-left"
    >
      <span className="text-lg" aria-hidden>{icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: color + '18', color }}
      >
        {badge}
      </span>
      <span
        className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color }}
      >
        {action} →
      </span>
    </button>
  );
}
