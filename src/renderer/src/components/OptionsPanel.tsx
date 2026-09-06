import * as Slider from '@radix-ui/react-slider'
import * as Switch from '@radix-ui/react-switch'
import { FolderOpen } from 'lucide-react'
import type { Field, FieldValue, Tool } from '@/tools/registry'
import { cn } from '@/lib/cn'

interface Props {
  tool: Tool
  values: Record<string, FieldValue>
  onChange: (key: string, value: FieldValue) => void
}

export function OptionsPanel({ tool, values, onChange }: Props): JSX.Element | null {
  const visible = tool.fields.filter((f) => !f.when || f.when(values))
  if (!visible.length) {
    return <p className="text-sm text-muted">This tool has no options — just add files and go.</p>
  }
  return (
    <div className="space-y-5">
      {visible.map((field) => (
        <FieldRow key={field.key} field={field} value={values[field.key]} onChange={onChange} />
      ))}
    </div>
  )
}

function FieldRow({
  field,
  value,
  onChange
}: {
  field: Field
  value: FieldValue
  onChange: (key: string, value: FieldValue) => void
}): JSX.Element {
  const set = (v: FieldValue): void => onChange(field.key, v)

  if (field.type === 'segmented') {
    return (
      <div>
        <div className="label mb-1.5">{field.label}</div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
          {field.options.map((o) => (
            <button
              key={o.value}
              onClick={() => set(o.value)}
              className={cn(
                'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                String(value) === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="label mb-1.5 block">{field.label}</span>
        <select className="input" value={String(value)} onChange={(e) => set(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'text') {
    return (
      <label className="block">
        <span className="label mb-1.5 block">{field.label}</span>
        <input
          className="input"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
        />
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <label className="block">
        <span className="label mb-1.5 block">{field.label}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input"
            value={Number(value)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => set(e.target.value === '' ? 0 : Number(e.target.value))}
          />
          {field.suffix && <span className="text-xs text-muted">{field.suffix}</span>}
        </div>
      </label>
    )
  }

  if (field.type === 'range') {
    return (
      <div>
        <div className="label mb-1.5 flex justify-between">
          <span>{field.label}</span>
          <span className="text-fg">
            {value}
            {field.suffix ?? ''}
          </span>
        </div>
        <Slider.Root
          className="relative flex h-5 w-full items-center"
          value={[Number(value)]}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onValueChange={([v]) => set(v)}
        >
          <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-surface-2">
            <Slider.Range className="absolute h-full rounded-full bg-brand" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border border-border bg-surface shadow" />
        </Slider.Root>
      </div>
    )
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between">
        <span className="label">{field.label}</span>
        <Switch.Root
          checked={Boolean(value)}
          onCheckedChange={(v) => set(v)}
          className="relative h-6 w-10 rounded-full bg-surface-2 transition-colors data-[state=checked]:bg-brand"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
        </Switch.Root>
      </div>
    )
  }

  if (field.type === 'color') {
    return (
      <label className="flex items-center justify-between">
        <span className="label">{field.label}</span>
        <input
          type="color"
          value={String(value)}
          onChange={(e) => set(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
        />
      </label>
    )
  }

  // imagefile
  return (
    <div>
      <div className="label mb-1.5">{field.label}</div>
      <button
        className="btn-outline w-full"
        onClick={async () => {
          const picked = await window.api.pickFiles([
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
          ])
          if (picked[0]) set(picked[0])
        }}
      >
        <FolderOpen size={15} />
        {value ? String(value).split(/[/\\]/).pop() : 'Choose image…'}
      </button>
    </div>
  )
}
