/**
 * PipelineFunnel — funil visual compacto com taxa de retorno por canal.
 * Props:
 *   stages: Array<{ stage: string, count: number, color: string }>
 *   channels: Array<{ name: string, total: number, retorno: number, taxa: number }>
 */

function PipelineBar({ stage, count, color, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const barW = Math.max(pct, count > 0 ? 3 : 0);
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs font-semibold text-gray-500 flex-shrink-0">{stage}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barW}%`, background: color }}
        />
      </div>
      <div
        className="w-6 text-right font-['Playfair_Display'] text-sm font-bold flex-shrink-0"
        style={{ color: count ? '#1A3A5C' : '#9CA3AF' }}
      >
        {count || '—'}
      </div>
    </div>
  );
}

function ChannelRow({ name, total, retorno, taxa }) {
  const cor = taxa >= 50 ? '#1A7A4A' : taxa >= 20 ? '#2E6DA4' : '#9CA3AF';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 text-xs font-medium text-gray-600 truncate">{name}</div>
      <div className="text-xs text-gray-400 flex-shrink-0">{retorno}/{total}</div>
      <div
        className="w-10 text-right text-xs font-bold flex-shrink-0"
        style={{ color: cor }}
      >
        {total >= 2 ? taxa + '%' : '—'}
      </div>
    </div>
  );
}

export function PipelineFunnel({ stages = [], channels = [] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  const total = stages.reduce((s, p) => s + p.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_4px_rgba(26,58,92,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Pipeline</h2>
        <span className="text-xs text-gray-400">{total} ativas</span>
      </div>

      <div className="space-y-3">
        {stages.map(s => (
          <PipelineBar key={s.stage} {...s} max={max} />
        ))}
      </div>

      {channels.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Retorno por Canal
          </div>
          <div className="space-y-0.5">
            {channels.map(c => <ChannelRow key={c.name} {...c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
