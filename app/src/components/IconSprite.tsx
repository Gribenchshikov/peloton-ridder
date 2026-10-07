// SVG-спрайт иконок, перенесено из прототипа (source/site.html <defs>).
// Рендерится один раз в layout, дальше <use href="#i-name"/> в компонентах.
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="i-mountain" viewBox="0 0 24 24">
          <path d="M2 20 L9 7 L13 13 L16 8 L22 20 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M16 8 L18.5 12 L14.5 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-drop" viewBox="0 0 24 24">
          <path d="M12 3 C15 8 18 11.2 18 14.5 A6 6 0 0 1 6 14.5 C6 11.2 9 8 12 3 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-leaf" viewBox="0 0 24 24">
          <path d="M5 19 C5 9 12 4 20 4 C20 12 15 19 5 19 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M6 18 C10 14 14 10 19 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-ski" viewBox="0 0 24 24">
          <path d="M3 19 Q5 21 7 19 L15 6 Q16 4.3 18 5 Q20 5.7 19 7.6 L11 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="16.3" cy="8.7" r="1.6" fill="currentColor" stroke="none" />
          <path d="M9 13 L14 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path d="M5 12H19M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 7.5V12L15 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-pin" viewBox="0 0 24 24">
          <path d="M12 21 C12 21 5 14 5 9.2 A7 7 0 0 1 19 9.2 C19 14 12 21 12 21 Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="9.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </symbol>
        <symbol id="i-route" viewBox="0 0 24 24">
          <path d="M4 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 15c3 0 4-9 7-9h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.6 2.6" />
        </symbol>
        <symbol id="i-user" viewBox="0 0 24 24">
          <circle cx="12" cy="8.3" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4.5 20 C5.5 15.5 8.3 13.5 12 13.5 C15.7 13.5 18.5 15.5 19.5 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-eye" viewBox="0 0 24 24">
          <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}
