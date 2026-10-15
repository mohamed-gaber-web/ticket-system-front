import { useEffect, useRef, useState } from 'react';
import { textareaCls } from './builderUi';

/**
 * A textarea edited as text but stored as a list (one item per line). The text
 * is kept locally so blank lines and the caret survive typing; it re-syncs only
 * when the stored list changes from elsewhere (rebuild, new version).
 */
export default function LinesTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string[];
  onChange: (lines: string[]) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(() => value.join('\n'));
  const lastSent = useRef(value.join('\n'));

  useEffect(() => {
    const joined = value.join('\n');
    if (joined !== lastSent.current) {
      lastSent.current = joined;
      setText(joined);
    }
  }, [value]);

  return (
    <textarea
      className={textareaCls}
      rows={rows}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        setText(e.target.value);
        const lines = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
        lastSent.current = lines.join('\n');
        onChange(lines);
      }}
    />
  );
}
