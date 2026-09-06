import { cn } from '@/lib/cn'

interface Props {
  children: React.ReactNode
  /** `wide` (default) fills the workspace; `form` keeps settings-style forms readable. */
  width?: 'wide' | 'form'
  className?: string
}

/**
 * Shared page container. Centres content within the full-width <main> and gives
 * every route the same responsive gutters, so wide displays are actually used.
 */
export function Page({ children, width = 'wide', className }: Props): JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto w-full px-6 py-8 md:px-10 xl:px-14',
        width === 'wide' ? 'max-w-page' : 'max-w-4xl',
        className
      )}
    >
      {children}
    </div>
  )
}
