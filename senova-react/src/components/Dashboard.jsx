/**
 * Dashboard — página Home do Senova Suite.
 * Redesenho U10: KPIs compactos + novidades do dia + ações + funil.
 *
 * Props:
 *   kpis     — array de KPIs
 *   signals  — central de sinais (emails, alertas, etc.)
 *   pipeline — estágios do funil
 *   channels — taxa de retorno por canal
 *   actions  — ações do dia
 *   sofia    — { message } para o card da Sofia
 *   onNavigate — callback de navegação
 */

import { KpiCard }       from './KpiCard';
import { SignalRow }     from './SignalRow';
import { PipelineFunnel }from './PipelineFunnel';
import { ActionsList }   from './ActionsList';
import { SofiaCard }     from './SofiaCard';

function TopBar({ onNewProcess }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div>
        <h1 className="font-['Playfair_Display'] text-xl font-bold text-[#1A3A5C]">
          Bom dia, Marcos 👋
        </h1>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{today}</p>
      </div>
      <button
        onClick={onNewProcess}
        className="flex items-center gap-2 bg-[#1A3A5C] hover:bg-blue-900 text-white
                   text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
      >
        <span aria-hidden>+</span> Novo Processo
      </button>
    </div>
  );
}

export function Dashboard({
  kpis = [],
  signals = [],
  pipeline = [],
  channels = [],
  actions = [],
  sofia = {},
  onNavigate = () => {},
}) {
  return (
    <div className="flex-1 overflow-auto bg-[#F0F4F8]">
      <TopBar onNewProcess={() => onNavigate('processos')} />

      <div className="px-8 py-6 space-y-6 max-w-7xl">

        {/* ── 1. KPIs ─────────────────────────────────── */}
        <section aria-label="KPIs do pipeline">
          <div className="grid grid-cols-4 gap-4">
            {kpis.map(kpi => (
              <KpiCard
                key={kpi.label}
                {...kpi}
                onClick={() => onNavigate('processos')}
              />
            ))}
          </div>
        </section>

        {/* ── 2. Central de Sinais ────────────────────── */}
        <section aria-label="Novidades de hoje">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Novidades de Hoje
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-[0_1px_4px_rgba(26,58,92,0.08)]">
            {signals.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma novidade por enquanto.</p>
            ) : (
              signals.map(s => (
                <SignalRow
                  key={s.id}
                  {...s}
                  onClick={() => onNavigate(s.type === 'email' ? 'home' : 'home')}
                />
              ))
            )}
          </div>
        </section>

        {/* ── 3. Pipeline + Ações ─────────────────────── */}
        <section className="grid grid-cols-5 gap-6" aria-label="Pipeline e ações">
          <div className="col-span-2">
            <PipelineFunnel stages={pipeline} channels={channels} />
          </div>

          <div className="col-span-3 space-y-4">
            <ActionsList
              actions={actions}
              onViewAll={() => onNavigate('processos')}
            />
            <SofiaCard
              message={sofia.message}
              onChat={() => onNavigate('sofia')}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
