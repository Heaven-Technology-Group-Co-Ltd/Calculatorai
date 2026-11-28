"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./FormField.module.css";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: ReactNode;
  labelAction?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  endAdornment?: ReactNode;
  invalid?: boolean;
  describedById?: string;
  labelClassName?: string;
  fieldClassName?: string;
};

export function FormField({ id, label, labelAction, hint, error, endAdornment, invalid = false, describedById, labelClassName, fieldClassName, className, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const hasError = Boolean(error) || invalid;
  const descriptions = [hint ? hintId : null, error ? errorId : null, describedById, inputProps["aria-describedby"]]
    .filter(Boolean)
    .join(" ");
  const inputClassName = [className, hasError ? styles.inputError : ""].filter(Boolean).join(" ");

  return (
    <div className={[styles.field, fieldClassName].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <label className={[styles.label, labelClassName].filter(Boolean).join(" ")} htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className={endAdornment ? styles.inputWrap : undefined}>
        <input
          {...inputProps}
          id={id}
          className={inputClassName}
          aria-invalid={hasError ? true : inputProps["aria-invalid"]}
          aria-describedby={descriptions || undefined}
        />
        {endAdornment && <span className={styles.endAdornment}>{endAdornment}</span>}
      </div>
      {hint && <div className={styles.hint} id={hintId}>{hint}</div>}
      {error && <div className={styles.error} id={errorId} role="alert">{error}</div>}
    </div>
  );
}
