import React from 'react';

/**
 * Renderitza text amb format senzill:
 * **negreta** -> <strong>negreta</strong>
 * *cursiva* -> <em>cursiva</em>
 * <u>subratllat</u> -> <u>subratllat</u>
 * salts de línia -> <br />
 */
export function renderFormattedText(text = '') {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const elements = parseLineFormatting(line);
    return (
      <React.Fragment key={lineIdx}>
        {elements}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

function parseLineFormatting(line) {
  const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>)/g;
  const parts = line.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('<u>') && part.endsWith('</u>') && part.length >= 7) {
      return <u key={idx} className="underline decoration-primary/50">{part.slice(3, -4)}</u>;
    }
    return part;
  });
}

export function generateNextProductCode(productsList = []) {
  let maxNum = 0;
  productsList.forEach(p => {
    const code = p.codi || p.id || '';
    const match = code.match(/PRDT-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  return `PRDT-${padded}`;
}

export function applyFormatToSelection(textareaRef, currentText, formatType, setTextCallback) {
  if (!textareaRef || !textareaRef.current) return;
  const input = textareaRef.current;
  const start = input.selectionStart;
  const end = input.selectionEnd;

  const selectedText = currentText.substring(start, end) || 'text';
  let formattedText = '';

  if (formatType === 'bold') {
    formattedText = `**${selectedText}**`;
  } else if (formatType === 'italic') {
    formattedText = `*${selectedText}*`;
  } else if (formatType === 'underline') {
    formattedText = `<u>${selectedText}</u>`;
  }

  const newText = currentText.substring(0, start) + formattedText + currentText.substring(end);
  setTextCallback(newText);

  setTimeout(() => {
    input.focus();
    input.setSelectionRange(start + formattedText.length, start + formattedText.length);
  }, 0);
}
