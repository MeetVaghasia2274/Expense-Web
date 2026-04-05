import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/',        label: 'Home',   icon: '🏠' },
  { to: '/trends',  label: 'Trends', icon: '📊' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          aria-label={label}
        >
          <span className="nav-icon">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
