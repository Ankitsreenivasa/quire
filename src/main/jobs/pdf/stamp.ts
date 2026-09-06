import { degrees } from '@cantoo/pdf-lib'
import type { Color, PDFFont, PDFImage, PDFPage } from '@cantoo/pdf-lib'

/** Rotate an offset (dx,dy) about a point, so a stamp spins about its own centre. */
export function rotateAbout(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  }
}

interface ImageStamp {
  cx: number
  cy: number
  width: number
  height: number
  angle?: number
  opacity?: number
}

/** Draw an image centred on (cx,cy) in PDF-point space. */
export function drawImageStamp(page: PDFPage, image: PDFImage, s: ImageStamp): void {
  const angle = s.angle ?? 0
  const o = rotateAbout(s.cx, s.cy, -s.width / 2, -s.height / 2, angle)
  page.drawImage(image, {
    x: o.x,
    y: o.y,
    width: s.width,
    height: s.height,
    opacity: s.opacity ?? 1,
    rotate: degrees(angle)
  })
}

interface TextStamp {
  cx: number
  cy: number
  size: number
  angle?: number
  opacity?: number
  color: Color
}

/** Draw text centred on (cx,cy) in PDF-point space. */
export function drawTextStamp(page: PDFPage, text: string, font: PDFFont, s: TextStamp): void {
  const angle = s.angle ?? 0
  const tw = font.widthOfTextAtSize(text, s.size)
  const o = rotateAbout(s.cx, s.cy, -tw / 2, -s.size * 0.32, angle)
  page.drawText(text, {
    x: o.x,
    y: o.y,
    size: s.size,
    font,
    color: s.color,
    opacity: s.opacity ?? 1,
    rotate: degrees(angle)
  })
}
