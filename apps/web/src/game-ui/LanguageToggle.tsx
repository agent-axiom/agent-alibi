import type { Locale } from "../i18n";
import { LOCALES } from "../i18n";

type LanguageToggleProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  className?: string;
};

export function LanguageToggle({ locale, onLocaleChange, className = "" }: LanguageToggleProps) {
  return (
    <div aria-label="Language" className={`language-toggle ${className}`.trim()} role="group">
      {LOCALES.map((option) => (
        <button
          aria-label={option.name}
          aria-pressed={locale === option.code}
          className={locale === option.code ? "active" : ""}
          key={option.code}
          onClick={() => onLocaleChange(option.code)}
          title={option.name}
          type="button"
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
