import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`cc-card ${className}`.trim()}>{children}</section>;
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'secondary' }) {
  return <button className={`cc-button cc-button--${variant} ${className}`.trim()} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`cc-input ${className}`.trim()} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', ...props },
  ref,
) {
  return <select ref={ref} className={`cc-select ${className}`.trim()} {...props} />;
});

export function ComboBox({
  className = '',
  options,
  value,
  onChange,
  placeholder = 'Select or type...',
}: {
  className?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = inputValue
    ? options.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputValue('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectOption(val: string) {
    onChange(val);
    setOpen(false);
    setInputValue('');
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        selectOption(filtered[highlightIndex]);
      } else if (inputValue.trim()) {
        selectOption(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setInputValue('');
      setHighlightIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className={`cc-combobox ${className}`.trim()}>
      <input
        ref={inputRef}
        className="cc-combobox__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={highlightIndex >= 0 ? `${listId}-opt-${highlightIndex}` : undefined}
        value={open ? inputValue : value}
        placeholder={value || placeholder}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => { setOpen(true); setInputValue(''); }}
        onKeyDown={handleKeyDown}
      />
      {value && !open && (
        <button
          type="button"
          className="cc-combobox__clear"
          aria-label="Clear"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          tabIndex={-1}
        >
          ×
        </button>
      )}
      {open && (
        <ul id={listId} className="cc-combobox__list" role="listbox">
          {filtered.map((option, i) => (
            <li
              key={option}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={option === value}
              className={`cc-combobox__option${i === highlightIndex ? ' cc-combobox__option--highlight' : ''}${option === value ? ' cc-combobox__option--selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectOption(option); }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {option}
            </li>
          ))}
          {filtered.length === 0 && inputValue.trim() && (
            <li
              className={`cc-combobox__option cc-combobox__option--highlight`}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); selectOption(inputValue.trim()); }}
            >
              Use &ldquo;{inputValue.trim()}&rdquo;
            </li>
          )}
          {filtered.length === 0 && !inputValue.trim() && (
            <li className="cc-combobox__empty">No options</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' }) {
  return <span className={`cc-pill cc-pill--${tone}`}>{children}</span>;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="cc-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-modal-title"
        aria-describedby={description ? 'cc-modal-description' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cc-modal-title">{title}</h2>
        {description ? <p id="cc-modal-description">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
