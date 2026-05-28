/**
 * Sidebar — navegação lateral principal do Senova Suite.
 * Props: activePage, onNavigate, user: { name, plan }
 */

const NAV_ITEMS = [
  { id: 'home',       icon: '🏠', label: 'Home' },
  { id: 'perfil',     icon: '👤', label: 'Perfil' },
  { id: 'analise',    icon: '📊', label: 'Análise CV' },
  { id: 'processos',  icon: '🗂',  label: 'Processos' },
  { id: 'entrevista', icon: '🎤', label: 'Entrevistas' },
  { id: 'mercado',    icon: '🌐', label: 'Mercado',   badge: 'Novo' },
  { id: 'sofia',      icon: '✨', label: 'Sofia',     badge: 'IA' },
];

function NavItem({ id, icon, label, badge, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm font-medium
        ${isActive
          ? 'bg-[#1A3A5C] text-white'
          : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      <span className="text-base select-none" aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-bold
          ${isActive ? 'bg-[#C9A84C]/30 text-[#C9A84C]' : 'bg-[#C9A84C]/10 text-[#B8670A]'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({ activePage, onNavigate, user }) {
  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="font-['Playfair_Display'] text-xl font-bold text-[#1A3A5C]">Senova</div>
        <div className="text-xs text-gray-400 mt-0.5">Suite Executiva</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            {...item}
            isActive={activePage === item.id}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1A3A5C]/10 flex items-center justify-center text-[#1A3A5C] font-bold text-sm select-none">
              {user.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-700 truncate">{user.name}</div>
              <div className="text-xs text-gray-400">{user.plan}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
