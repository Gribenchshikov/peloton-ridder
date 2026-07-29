// Только относительные пути внутри приложения — "/foo", не "//evil.com" или абсолютный URL.
// (Auth.js сам по умолчанию тоже ограничивает redirect тем же origin — доп. явная проверка
// нужна там, где callbackUrl используется вне Auth.js, например в обычном Server Action redirect().)
export function safeRelativePath(value: FormDataEntryValue | null): string | null {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  ) {
    return value;
  }
  return null;
}
