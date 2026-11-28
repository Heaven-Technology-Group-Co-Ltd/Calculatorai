"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./FormField.module.css";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function FormField({ id, label, hint, error, className, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const descriptions = [hint ? hintId : null, error ? errorId : null, inputProps["aria-describedby"]]
    .filter(Boolean)
    .join(" ");
  const inputClassName = [className, error ? styles.inputError : ""].filter(Boolean).join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        className={inputClassName}
        aria-invalid={error ? true : inputProps["aria-invalid"]}
        aria-describedby={descriptions || undefined}
      />
      {hint && <div className={styles.hint} id={hintId}>{hint}</div>}
      {error && <div className={styles.error} id={errorId} role="alert">{error}</div>}
    </div>
  );
}
