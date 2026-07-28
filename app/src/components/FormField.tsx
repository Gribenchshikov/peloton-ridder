export function FormField({
  label,
  name,
  type,
  required,
  optional,
  minLength,
  defaultValue,
  step,
  placeholder,
  hint,
  error,
  pattern,
  title,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  optional?: boolean;
  minLength?: number;
  defaultValue?: string;
  step?: string;
  placeholder?: string;
  hint?: string;
  error?: boolean;
  pattern?: string;
  title?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-baseline gap-1.5 font-semibold text-ink-soft">
        {label}
        {optional && (
          <span className="text-xs font-normal text-ink-faint">опционально</span>
        )}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        step={step}
        placeholder={placeholder}
        pattern={pattern}
        title={title}
        className={[
          "rounded-[var(--radius-s)] border bg-stone-50 px-3 py-2.5 text-ink outline-none transition-colors",
          error
            ? "border-danger focus:border-danger"
            : "border-border focus:border-ember",
        ].join(" ")}
      />
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}
