// frontend/src/utils/domTextSplitter.ts
/**
 * PROJECT VELOCE // NON-DESTRUCTIVE RECURSIVE AST DOM TEXT SPLITTER
 * Splits text into animated character and word spans while preserving 100% of nested tags
 * (such as Instrument Serif italic spans), classes, and screen reader accessibility.
 */

export interface SplitTextResult {
  chars: HTMLElement[];
  words: HTMLElement[];
  revert: () => void;
}

export interface SplitTextOptions {
  splitMode?: 'chars' | 'words' | 'both';
  charClass?: string;
  wordClass?: string;
}

export function splitTextNonDestructive(
  container: HTMLElement,
  options: SplitTextOptions = {}
): SplitTextResult {
  const {
    splitMode = 'both',
    charClass = 'kinetic-char',
    wordClass = 'kinetic-word',
  } = options;

  // 1. Preserve original inner HTML and accessible label
  const originalHtml = container.innerHTML;
  const fullText = (container.textContent || '').trim();

  // Set accessible label for screen readers
  container.setAttribute('aria-label', fullText);

  const collectedChars: HTMLElement[] = [];
  const collectedWords: HTMLElement[] = [];

  /**
   * Recursively parses DOM nodes:
   * - Element nodes: cloned with original classes/styles, children recursively processed.
   * - Text nodes: parsed into words and characters.
   */
  function processNode(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return document.createTextNode('');

      const fragment = document.createDocumentFragment();
      // Tokenize by whitespace while preserving space characters
      const tokens = text.split(/(\s+)/);

      for (const token of tokens) {
        if (!token) continue;

        if (/^\s+$/.test(token)) {
          // Whitespace token: output pure text node to maintain natural word spacing
          fragment.appendChild(document.createTextNode(token));
          continue;
        }

        // Word wrapper span
        const wordSpan = document.createElement('span');
        wordSpan.className = `${wordClass} inline-block whitespace-nowrap`;
        wordSpan.setAttribute('aria-hidden', 'true');
        wordSpan.style.overflow = 'visible';

        if (splitMode === 'words') {
          wordSpan.textContent = token;
          collectedWords.push(wordSpan);
          fragment.appendChild(wordSpan);
          continue;
        }

        // Per-character splitting inside the word span
        for (const ch of token) {
          const charSpan = document.createElement('span');
          charSpan.className = `${charClass} inline-block`;
          charSpan.setAttribute('aria-hidden', 'true');
          charSpan.textContent = ch;
          charSpan.style.willChange = 'transform, filter, opacity';
          charSpan.style.display = 'inline-block';
          collectedChars.push(charSpan);
          wordSpan.appendChild(charSpan);
        }

        collectedWords.push(wordSpan);
        fragment.appendChild(wordSpan);
      }

      return fragment;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const clone = el.cloneNode(false) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');

      // Recursively process all children of nested elements (e.g., italic spans)
      const childNodes = Array.from(el.childNodes);
      for (const child of childNodes) {
        clone.appendChild(processNode(child));
      }

      return clone;
    }

    return node.cloneNode(true);
  }

  // Clear container and append the non-destructively split DOM tree
  const childNodes = Array.from(container.childNodes);
  container.innerHTML = '';
  for (const child of childNodes) {
    container.appendChild(processNode(child));
  }

  return {
    chars: collectedChars,
    words: collectedWords,
    revert: () => {
      container.innerHTML = originalHtml;
      container.removeAttribute('aria-label');
    },
  };
}
