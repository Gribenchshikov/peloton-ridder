export function SelectField({
  label,
  name,
  required,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink-soft">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="rounded-[var(--radius-s)] border border-border bg-stone-50 px-3 py-2.5 text-ink outline-none focus:border-ember"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
