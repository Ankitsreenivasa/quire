import type { ToolId } from '../../shared/types'
import type { JobRunner } from './types'
import { imagesToPdf } from './pdf/imagesToPdf'
import { pdfToImages } from './pdf/pdfToImages'
import { mergePdf } from './pdf/merge'
import { splitPdf } from './pdf/split'
import { compressPdf } from './pdf/compress'
import { rotatePdf } from './pdf/rotate'
import { pageNumbersPdf } from './pdf/pageNumbers'
import { watermarkPdf } from './pdf/watermark'
import { organizePdf } from './pdf/organize'
import { cropPdf } from './pdf/cropPdf'
import { signPdf } from './pdf/signPdf'
import { protectPdf } from './pdf/protectPdf'
import { unlockPdf } from './pdf/unlockPdf'
import { editPdf } from './pdf/editPdf'
import { imageCompress } from './media/imageCompress'
import { videoCompress } from './media/videoCompress'

export const RUNNERS: Record<ToolId, JobRunner> = {
  'images-to-pdf': imagesToPdf,
  'pdf-to-image': pdfToImages,
  'merge-pdf': mergePdf,
  'split-pdf': splitPdf,
  'compress-pdf': compressPdf,
  'rotate-pdf': rotatePdf,
  'page-numbers': pageNumbersPdf,
  'watermark-pdf': watermarkPdf,
  'organize-pdf': organizePdf,
  'crop-pdf': cropPdf,
  'sign-pdf': signPdf,
  'protect-pdf': protectPdf,
  'unlock-pdf': unlockPdf,
  'edit-pdf': editPdf,
  'image-compress': imageCompress,
  'video-compress': videoCompress
}

export const TOOL_NAMES: Record<ToolId, string> = {
  'images-to-pdf': 'Image to PDF',
  'pdf-to-image': 'PDF to Image',
  'merge-pdf': 'Merge PDF',
  'split-pdf': 'Split PDF',
  'compress-pdf': 'Compress PDF',
  'rotate-pdf': 'Rotate PDF',
  'page-numbers': 'Page Numbers',
  'watermark-pdf': 'Watermark',
  'organize-pdf': 'Organize PDF',
  'crop-pdf': 'Crop PDF',
  'sign-pdf': 'Sign PDF',
  'protect-pdf': 'Protect PDF',
  'unlock-pdf': 'Unlock PDF',
  'edit-pdf': 'Edit PDF',
  'image-compress': 'Compress Image',
  'video-compress': 'Compress Video'
}
