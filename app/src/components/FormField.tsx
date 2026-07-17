export function FormField({
  label,
  name,
  type,
  required,
  minLength,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink-soft">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className="rounded-[var(--radius-s)] border border-border bg-stone-50 px-3 py-2.5 text-ink outline-none focus:border-ember"
      />
    </label>
  );
}
