import type { ToolCategory, ToolId } from '@shared/types'
import {
  FileImage,
  Images,
  FilePlus2,
  Scissors,
  Minimize2,
  RotateCw,
  Hash,
  Stamp,
  LayoutGrid,
  ImageDown,
  Film,
  type LucideIcon
} from 'lucide-react'

export type FieldValue = string | number | boolean

export type Field =
  | { type: 'segmented'; key: string; label: string; default: FieldValue; options: { value: string; label: string }[]; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'select'; key: string; label: string; default: FieldValue; options: { value: string; label: string }[]; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'number'; key: string; label: string; default: number; min?: number; max?: number; step?: number; suffix?: string; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'range'; key: string; label: string; default: number; min: number; max: number; step?: number; suffix?: string; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'text'; key: string; label: string; default?: string; placeholder?: string; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'toggle'; key: string; label: string; default: boolean; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'color'; key: string; label: string; default: string; when?: (v: Record<string, FieldValue>) => boolean }
  | { type: 'imagefile'; key: string; label: string; when?: (v: Record<string, FieldValue>) => boolean }

export interface Tool {
  id: ToolId
  name: string
  description: string
  icon: LucideIcon
  category: ToolCategory
  accept: string[]
  multiple: boolean
  minFiles: number
  editable?: boolean
  reorder?: boolean
  organize?: boolean
  /** tool renders a custom interactive stage instead of the plain file list */
  interactive?: 'watermark'
  primaryLabel: string
  fields: Field[]
}

const IMG = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'gif', 'heic', 'heif']
const VIDEO = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'wmv', 'flv']
const pos = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' }
]

export const TOOLS: Tool[] = [
  {
    id: 'images-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, HEIC, WEBP and more into a PDF. Crop, rotate and resize each image.',
    icon: FileImage,
    category: 'convert',
    accept: IMG,
    multiple: true,
    minFiles: 1,
    editable: true,
    reorder: true,
    primaryLabel: 'Convert to PDF',
    fields: [
      { type: 'segmented', key: 'mode', label: 'Output', default: 'single', options: [{ value: 'single', label: 'One PDF' }, { value: 'per-file', label: 'One PDF per image' }] },
      { type: 'select', key: 'pageSize', label: 'Page size', default: 'fit', options: [{ value: 'fit', label: 'Fit to image' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }] },
      { type: 'select', key: 'orientation', label: 'Orientation', default: 'auto', when: (v) => v.pageSize !== 'fit', options: [{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }] },
      { type: 'number', key: 'margin', label: 'Margin', default: 0, min: 0, max: 120, step: 2, suffix: 'pt' }
    ]
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Turn each PDF page into a high-quality JPG or PNG image.',
    icon: Images,
    category: 'convert',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Convert to images',
    fields: [
      { type: 'segmented', key: 'format', label: 'Format', default: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }] },
      { type: 'select', key: 'dpi', label: 'Resolution', default: 150, options: [{ value: '96', label: 'Screen (96 DPI)' }, { value: '150', label: 'Good (150 DPI)' }, { value: '300', label: 'Print (300 DPI)' }] },
      { type: 'range', key: 'quality', label: 'JPG quality', default: 85, min: 40, max: 100, when: (v) => v.format === 'jpg', suffix: '%' },
      { type: 'text', key: 'pages', label: 'Pages (blank = all)', placeholder: 'e.g. 1-3, 5', default: '' },
      { type: 'toggle', key: 'zip', label: 'Package as ZIP', default: false }
    ]
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one. Drag to set the order.',
    icon: FilePlus2,
    category: 'organize',
    accept: ['pdf'],
    multiple: true,
    minFiles: 2,
    reorder: true,
    primaryLabel: 'Merge PDF',
    fields: []
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Split a PDF by page ranges, in fixed-size chunks, or extract selected pages.',
    icon: Scissors,
    category: 'organize',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Split PDF',
    fields: [
      { type: 'segmented', key: 'mode', label: 'Method', default: 'every', options: [{ value: 'every', label: 'Every N pages' }, { value: 'ranges', label: 'Custom ranges' }, { value: 'extract', label: 'Extract pages' }] },
      { type: 'number', key: 'every', label: 'Pages per file', default: 1, min: 1, max: 500, when: (v) => v.mode === 'every' },
      { type: 'text', key: 'ranges', label: 'Ranges (separate files with ";")', placeholder: '1-3; 4-6; 7-10', default: '', when: (v) => v.mode === 'ranges' },
      { type: 'text', key: 'extract', label: 'Pages to extract', placeholder: '1, 3, 5-8', default: '', when: (v) => v.mode === 'extract' }
    ]
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Shrink PDF file size with adjustable quality presets.',
    icon: Minimize2,
    category: 'optimize',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Compress PDF',
    fields: [
      { type: 'segmented', key: 'preset', label: 'Level', default: 'ebook', options: [{ value: 'screen', label: 'Strong' }, { value: 'ebook', label: 'Balanced' }, { value: 'printer', label: 'Light' }, { value: 'custom', label: 'Custom' }] },
      { type: 'number', key: 'dpi', label: 'Image DPI', default: 150, min: 36, max: 300, step: 6, when: (v) => v.preset === 'custom' },
      { type: 'range', key: 'quality', label: 'Image quality', default: 72, min: 30, max: 95, suffix: '%', when: (v) => v.preset === 'custom' }
    ]
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate all or selected pages of a PDF.',
    icon: RotateCw,
    category: 'organize',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Rotate PDF',
    fields: [
      { type: 'segmented', key: 'angle', label: 'Rotation', default: '90', options: [{ value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }] },
      { type: 'text', key: 'pages', label: 'Pages (blank = all)', placeholder: 'e.g. 2, 4-6', default: '' }
    ]
  },
  {
    id: 'page-numbers',
    name: 'Page Numbers',
    description: 'Add customizable page numbers to a PDF.',
    icon: Hash,
    category: 'edit',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Add page numbers',
    fields: [
      { type: 'select', key: 'position', label: 'Position', default: 'bottom-center', options: pos },
      { type: 'text', key: 'format', label: 'Format', default: '{n}', placeholder: '{n} or {n}/{total}' },
      { type: 'number', key: 'fontSize', label: 'Font size', default: 11, min: 6, max: 48 },
      { type: 'number', key: 'startAt', label: 'Start at', default: 1, min: 0, max: 99999 },
      { type: 'number', key: 'margin', label: 'Margin', default: 24, min: 4, max: 120, suffix: 'pt' },
      { type: 'color', key: 'color', label: 'Colour', default: '#333333' },
      { type: 'text', key: 'pages', label: 'Pages (blank = all)', placeholder: 'e.g. 2-20', default: '' }
    ]
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark',
    description: 'Stamp text or an image over your PDF with opacity, angle and position.',
    icon: Stamp,
    category: 'edit',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    interactive: 'watermark',
    primaryLabel: 'Add watermark',
    fields: [
      { type: 'segmented', key: 'type', label: 'Type', default: 'text', options: [{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }] },
      { type: 'text', key: 'text', label: 'Text', default: 'CONFIDENTIAL', when: (v) => v.type === 'text' },
      { type: 'color', key: 'color', label: 'Colour', default: '#888888', when: (v) => v.type === 'text' },
      { type: 'imagefile', key: 'imagePath', label: 'Watermark image', when: (v) => v.type === 'image' },
      { type: 'range', key: 'opacity', label: 'Opacity', default: 0.3, min: 0.05, max: 1, step: 0.05 },
      { type: 'range', key: 'angle', label: 'Angle', default: 45, min: -90, max: 90, step: 1, suffix: '°' },
      { type: 'toggle', key: 'tile', label: 'Tile across page', default: false },
      { type: 'text', key: 'pages', label: 'Pages (blank = all)', placeholder: 'e.g. 1-5', default: '' },
      // driven by the interactive stage
      { type: 'number', key: 'fontSize', label: 'Text size', default: 48, min: 8, max: 400, suffix: 'pt', when: (v) => v.type === 'text' && !!v.tile },
      { type: 'range', key: 'scale', label: 'Image size', default: 0.4, min: 0.05, max: 1, step: 0.01, when: (v) => v.type === 'image' && !!v.tile }
    ]
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Reorder, rotate and delete pages. Add pages from other PDFs.',
    icon: LayoutGrid,
    category: 'organize',
    accept: ['pdf'],
    multiple: true,
    minFiles: 1,
    organize: true,
    primaryLabel: 'Save PDF',
    fields: []
  },
  {
    id: 'image-compress',
    name: 'Compress Image',
    description: 'Reduce image file size. Convert format, cap dimensions, strip metadata. Batch friendly.',
    icon: ImageDown,
    category: 'media',
    accept: IMG,
    multiple: true,
    minFiles: 1,
    editable: true,
    primaryLabel: 'Compress images',
    fields: [
      { type: 'select', key: 'format', label: 'Output format', default: 'keep', options: [{ value: 'keep', label: 'Keep original' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WEBP' }, { value: 'avif', label: 'AVIF' }, { value: 'png', label: 'PNG' }] },
      { type: 'range', key: 'quality', label: 'Quality', default: 70, min: 20, max: 95, suffix: '%', when: (v) => v.format !== 'png' },
      { type: 'number', key: 'maxDimension', label: 'Max width/height (0 = keep)', default: 0, min: 0, max: 12000, step: 100, suffix: 'px' },
      { type: 'toggle', key: 'stripMetadata', label: 'Strip metadata', default: true }
    ]
  },
  {
    id: 'video-compress',
    name: 'Compress Video',
    description: 'Shrink video files. Choose codec, quality, resolution and trim.',
    icon: Film,
    category: 'media',
    accept: VIDEO,
    multiple: true,
    minFiles: 1,
    primaryLabel: 'Compress video',
    fields: [
      { type: 'segmented', key: 'codec', label: 'Codec', default: 'h264', options: [{ value: 'h264', label: 'H.264' }, { value: 'h265', label: 'H.265' }, { value: 'vp9', label: 'VP9' }] },
      { type: 'range', key: 'crf', label: 'Quality (lower = better)', default: 28, min: 18, max: 40 },
      { type: 'select', key: 'resolution', label: 'Resolution', default: 'keep', options: [{ value: 'keep', label: 'Keep original' }, { value: '2160', label: '2160p' }, { value: '1440', label: '1440p' }, { value: '1080', label: '1080p' }, { value: '720', label: '720p' }, { value: '480', label: '480p' }] },
      { type: 'number', key: 'fps', label: 'Frame rate (0 = keep)', default: 0, min: 0, max: 120 },
      { type: 'toggle', key: 'mute', label: 'Remove audio', default: false },
      { type: 'number', key: 'trimStart', label: 'Trim start', default: 0, min: 0, max: 100000, suffix: 's' },
      { type: 'number', key: 'trimEnd', label: 'Trim end (0 = end)', default: 0, min: 0, max: 100000, suffix: 's' }
    ]
  }
]

export const CATEGORY_LABELS: Record<ToolCategory | 'all', string> = {
  all: 'All tools',
  organize: 'Organize',
  optimize: 'Optimize',
  convert: 'Convert',
  edit: 'Edit',
  media: 'Media'
}

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function defaultOptions(tool: Tool): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const f of tool.fields) {
    if ('default' in f && f.default !== undefined) out[f.key] = f.default as FieldValue
    else if (f.type === 'text') out[f.key] = f.default ?? ''
  }
  return out
}
