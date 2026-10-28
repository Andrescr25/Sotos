import { theme } from '@/shared/theme';

/** CSS exclusivo del ticket. Se incluye en un documento separado del sistema. */
export function receiptStyles(paperWidth) {
  const { printing, colors, spacing, radius } = theme;
  return `
    @page { size: auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: ${colors.background}; color: ${printing.ink}; font: ${printing.fontSize}px/${printing.lineHeight} Arial, sans-serif; }
    .toolbar { max-width: ${theme.layout.sheetMaxWidth}px; margin: ${spacing.lg}px auto; padding: ${spacing.lg}px; font-size: ${theme.fontSizes.body}px; }
    .toolbar button { min-height: ${theme.sizes.touchTarget}px; padding: ${spacing.md}px ${spacing.xl}px; border: 0; border-radius: ${radius.md}px; color: ${colors.textInverse}; background: ${colors.primary}; font: inherit; font-weight: bold; cursor: pointer; }
    .toolbar p { color: ${colors.textSecondary}; }
    button:focus-visible { outline: 2px solid ${colors.primary}; outline-offset: 3px; }
    .receipt { width: ${printing.contentWidths[paperWidth]}mm; max-width: 100%; margin: 0 auto; padding: ${printing.pagePaddingMm}mm 0; background: ${printing.paper}; overflow-wrap: anywhere; }
    h1, h2, p { margin: 0; }
    h1 { font-size: ${printing.titleFontSize}px; }
    h2 { font-size: ${printing.totalFontSize}px; }
    header, footer { text-align: center; }
    header { padding-bottom: ${spacing.md}px; }
    .small { font-size: ${printing.smallFontSize}px; }
    .meta { border-top: 1px dashed; border-bottom: 1px dashed; padding: ${spacing.sm}px 0; margin-bottom: ${spacing.sm}px; }
    .line { padding: ${spacing.sm}px 0; break-inside: avoid; }
    .amount, .total { display: flex; justify-content: space-between; align-items: baseline; gap: ${spacing.md}px; }
    .amount span:first-child { min-width: 0; }
    .amount span:last-child, .total strong { white-space: nowrap; flex-shrink: 0; }
    .detail { padding-left: ${spacing.sm}px; }
    .payment { padding-top: ${spacing.sm}px; }
    .note { white-space: pre-wrap; margin-top: ${spacing.sm}px; }
    .total { border-top: 1px dashed; padding-top: ${spacing.md}px; margin-top: ${spacing.sm}px; font-size: ${printing.totalFontSize}px; font-weight: bold; }
    footer { border-top: 1px dashed; margin-top: ${spacing.md}px; padding-top: ${spacing.md}px; }
    @media print {
      html, body { height: auto; overflow: visible; background: ${printing.paper}; }
      .toolbar { display: none !important; }
      .receipt { margin: 0 auto; }
    }
  `;
}
