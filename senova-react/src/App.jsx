import { useState } from 'react';
import { Sidebar }   from './components/Sidebar';
import { Dashboard } from './components/Dashboard';

const MOCK_KPIS = [
  { label: 'Pipeline Ativo', value: '12', sub: '3 novas esta semana',  icon: '🗂',  color: '#1A3A5C' },
  { label: 'Entrevistas',    value: '3',  sub: '1 amanhã — McKinsey',  icon: '🎤',  color: '#1A7A4A' },
  { label: 'Taxa de Retorno',value: '38%',sub: '↑ 6pp vs mês passado', icon: '📈',  color: '#C9A84C' },
  { label: 'Vagas Novas',    value: '7',  sub: '2 acima de 80 pts',    icon: '✨',  color: '#2E6DA4' },
];

const MOCK_SIGNALS = [
  { id: 1, icon: '📧', label: '3 e-mails novos de recrutadores',          color: '#2E6DA4', badge: '3 novos',   action: 'Ver',       type: 'email'   },
  { id: 2, icon: '🚨', label: 'Nestlé — nova vaga acima de 85 pts',       color: '#C0281E', badge: 'Lead quente',action: 'Analisar', type: 'vaga'    },
  { id: 3, icon: '⏰', label: 'Seguir up — Ambev (há 5 dias sem resposta)',color: '#B8670A', badge: 'Pendente',  action: 'Agir',      type: 'followup'},
  { id: 4, icon: '📅', label: 'Entrevista McKinsey — amanhã 15h',         color: '#1A7A4A', badge: 'Amanhã',    action: 'Preparar',  type: 'agenda'  },
];

const MOCK_PIPELINE = [
  { stage: 'Lead',        count: 5,  color: '#9CA3AF' },
  { stage: 'Aplicado',    count: 4,  color: '#2E6DA4' },
  { stage: 'Contato',     count: 2,  color: '#C9A84C' },
  { stage: 'Entrevista',  count: 3,  color: '#1A7A4A' },
  { stage: 'Proposta',    count: 1,  color: '#C9A84C' },
];

const MOCK_CHANNELS = [
  { name: 'LinkedIn',    total: 8, retorno: 3, taxa: 38 },
  { name: 'Adzuna',      total: 5, retorno: 1, taxa: 20 },
  { name: 'Recrutadores',total: 4, retorno: 3, taxa: 75 },
  { name: 'Indicação',   total: 2, retorno: 2, taxa: 100},
];

const MOCK_ACTIONS = [
  { label: 'Enviar carta para Nestlé — Director Supply Chain', due: 'Hoje',   icon: '✉️' },
  { label: 'Preparar cases McKinsey — Entrevista estruturada',  due: 'Hoje',   icon: '📋' },
  { label: 'Atualizar LinkedIn com cargo mais recente',          due: 'Amanhã', icon: '🔗' },
  { label: 'Follow-up Ambev — Diretor de Marketing',             due: 'Amanhã', icon: '📞' },
];

const MOCK_SOFIA = {
  message: 'Marcos, você tem 2 vagas alinhadas com seu perfil de liderança estratégica esta semana. Quer analisá-las juntos?',
};

const MOCK_USER = { name: 'Marcos Franco', plan: 'Executivo Pro' };

export default function App() {
  const [page, setPage] = useState('home');

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
      <Sidebar activePage={page} onNavigate={setPage} user={MOCK_USER} />
      {page === 'home' && (
        <Dashboard
          kpis={MOCK_KPIS}
          signals={MOCK_SIGNALS}
          pipeline={MOCK_PIPELINE}
          channels={MOCK_CHANNELS}
          actions={MOCK_ACTIONS}
          sofia={MOCK_SOFIA}
          onNavigate={setPage}
        />
      )}
      {page !== 'home' && (
        <div className="flex-1 flex items-center justify-center bg-[#F0F4F8]">
          <div className="text-center">
            <div className="font-['Playfair_Display'] text-2xl font-bold text-[#1A3A5C] mb-2">
              {page.charAt(0).toUpperCase() + page.slice(1)}
            </div>
            <p className="text-sm text-gray-400">Módulo em construção neste protótipo.</p>
            <button
              onClick={() => setPage('home')}
              className="mt-4 text-sm text-[#2E6DA4] hover:underline font-semibold"
            >
              ← Voltar à Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
