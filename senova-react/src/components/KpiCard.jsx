/**
 * KpiCard — cartão compacto de KPI para a dashboard Home.
 * Props: label, value, sub, icon, color, onClick
 */
export function KpiCard({ label, value, sub, icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4
                 shadow-[0_1px_4px_rgba(26,58,92,0.08)] hover:shadow-md transition-shadow text-left w-full"
    >
      <span className="text-2xl select-none" aria-hidden>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
          {label}
        </div>
        <div
          className="font-['Playfair_Display'] text-3xl font-bold leading-none"
          style={{ color }}
        >
          {value}
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate">{sub}</div>
      </div>
    </button>
  );
}
