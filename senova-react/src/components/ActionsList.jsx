/**
 * ActionsList — lista de ações do dia para a dashboard.
 * Props:
 *   actions: Array<{ label: string, due: string, icon: string, priority: 'alta'|'media'|'baixa' }>
 *   onViewAll: () => void
 */

function ActionItem({ label, due, icon }) {
  const dueCls =
    due === 'Hoje'   ? 'bg-red-50 text-red-600' :
    due === 'Amanhã' ? 'bg-amber-50 text-amber-700' :
                       'bg-gray-100 text-gray-500';
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-base mt-0.5 select-none" aria-hidden>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug truncate">{label}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${dueCls}`}>
        {due}
      </span>
    </div>
  );
}

export function ActionsList({ actions = [], onViewAll }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_4px_rgba(26,58,92,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Ações do Dia</h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-[#1A3A5C] font-semibold hover:underline"
          >
            Ver todas →
          </button>
        )}
      </div>
      <div>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma ação pendente para hoje.</p>
        ) : (
          actions.map((a, i) => <ActionItem key={i} {...a} />)
        )}
      </div>
    </div>
  );
}
