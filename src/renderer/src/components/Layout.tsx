import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Clock, Settings, ChevronLeft } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/cn'

export function Layout({ children }: { children: React.ReactNode }): JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <header className="drag-region flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3 pl-20">
        <div className="flex items-center gap-1 no-drag">
          <button className="btn-ghost h-8 w-8 p-0" onClick={() => navigate(-1)} title="Back">
            <ChevronLeft size={17} />
          </button>
          <NavLink to="/" className="ml-1 flex items-center gap-2 text-sm font-bold">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand text-brand-fg">P</span>
            PDF Converter
          </NavLink>
        </div>
        <nav className="flex items-center gap-1 no-drag">
          <NavItem to="/" icon={Home} label="Home" />
          <NavItem to="/history" icon={Clock} label="History" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <div className="mx-1 h-5 w-px bg-border" />
          <ThemeToggle />
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

function NavItem({
  to,
  icon: Icon,
  label
}: {
  to: string
  icon: typeof Home
  label: string
}): JSX.Element {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
          isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
        )
      }
    >
      <Icon size={14} />
      {label}
    </NavLink>
  )
}
