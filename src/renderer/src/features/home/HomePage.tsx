import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { TOOLS, CATEGORY_LABELS } from '@/tools/registry'
import type { ToolCategory } from '@shared/types'
import { cn } from '@/lib/cn'

const CATS: (ToolCategory | 'all')[] = ['all', 'organize', 'optimize', 'convert', 'edit', 'media']

export function HomePage(): JSX.Element {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<ToolCategory | 'all'>('all')

  const tools = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TOOLS.filter((t) => cat === 'all' || t.category === cat).filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    )
  }, [query, cat])

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-center text-3xl font-bold tracking-tight">
        Every tool you need to work with files
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
        Convert, merge, split, compress, crop and edit PDFs, images and video — all offline on
        your machine.
      </p>

      <div className="relative mx-auto mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search tools…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              cat === c ? 'bg-fg text-bg' : 'bg-surface-2 text-muted hover:text-fg'
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.id}
            to={`/tool/${t.id}`}
            className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-lg"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg">
              <t.icon size={20} />
            </span>
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {!tools.length && (
        <p className="mt-16 text-center text-sm text-muted">No tools match “{query}”.</p>
      )}
    </div>
  )
}
