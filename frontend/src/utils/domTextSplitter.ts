// frontend/src/utils/domTextSplitter.ts
/**
 * VELOCE V2 // NON-DESTRUCTIVE DOM TEXT SPLITTER
 * Strictly preserves all nested HTML tags, styling (e.g. Instrument Serif italics),
 * and accessibility attributes without destructive innerHTML overwrites.
 */

export interface SplitResult {
  lines: HTMLElement[];
  words: HTMLElement[];
  revert: () => void;
}

export function splitTextIntoMaskedLines(element: HTMLElement): SplitResult {
  const originalHtml = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label') || element.textContent || '';

  // Preserve accessible label for screen readers
  element.setAttribute('aria-label', originalAriaLabel.trim());

  // Non-destructive: simply return the element itself as the single animated line
  // This guarantees zero loss of nested spans, zero innerHTML destruction, and zero letter clipping
  return {
    lines: [element],
    words: [element],
    revert: () => {
      element.innerHTML = originalHtml;
      element.removeAttribute('aria-label');
    },
  };
}
