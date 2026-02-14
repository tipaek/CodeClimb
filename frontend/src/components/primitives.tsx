import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

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
