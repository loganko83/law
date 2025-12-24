/**
 * Accessible FormField Component
 * Provides proper aria-describedby associations for form errors
 */

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
    'aria-required': boolean;
  }) => React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  hint,
  children,
}) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (hint) describedByParts.push(hintId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-500">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': !!error,
        'aria-required': required,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  hint,
  required,
  className = '',
  ...inputProps
}) => {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      {(ariaProps) => (
        <input
          {...inputProps}
          {...ariaProps}
          className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-colors
            ${error
              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:bg-white'
              : 'border-slate-200 focus:border-blue-500 focus:bg-white'
            } ${className}`}
        />
      )}
    </FormField>
  );
};

interface TextareaFieldProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  error,
  hint,
  required,
  className = '',
  ...textareaProps
}) => {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      {(ariaProps) => (
        <textarea
          {...textareaProps}
          {...ariaProps}
          className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-colors resize-none
            ${error
              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:bg-white'
              : 'border-slate-200 focus:border-blue-500 focus:bg-white'
            } ${className}`}
        />
      )}
    </FormField>
  );
};

interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  error,
  hint,
  required,
  options,
  className = '',
  ...selectProps
}) => {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      {(ariaProps) => (
        <select
          {...selectProps}
          {...ariaProps}
          className={`w-full bg-slate-50 border rounded-xl p-3 text-sm outline-none transition-colors
            ${error
              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:bg-white'
              : 'border-slate-200 focus:border-blue-500 focus:bg-white'
            } ${className}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
};

export default FormField;
