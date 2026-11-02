/**
 * i18n minimalista. O idioma padrão é inglês; português (Brasil) é selecionado via
 * GIT_CLEAN_MERGED_LANG ou pelas variáveis de locale do sistema (LC_ALL, LC_MESSAGES, LANG).
 *
 * Para adicionar um idioma: crie uma classe que estenda `English` e sobrescreva (`override`)
 * apenas os métodos já traduzidos; o que faltar cai automaticamente no inglês. Depois registre
 * a classe em `translations` e o código do idioma em `Locale`/`parseLocale`.
 */
import { English } from "./en.ts";
import { Portuguese } from "./pt.ts";
import type { Translation } from "./translation.ts";

export type { Translation } from "./translation.ts";

export type Locale = "pt" | "en";

const translations: Record<Locale, Translation> = {
  en: new English(),
  pt: new Portuguese(),
};

let current: Locale = "en";

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Mensagens no idioma ativo. */
export const t = (): Translation => translations[current];

/** Converte um valor de locale ("en_US.UTF-8", "pt-BR", "en") em Locale, ou null se não reconhecido. */
export function parseLocale(value: string | undefined): Locale | null {
  const v = value?.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("pt")) return "pt";
  if (v.startsWith("en")) return "en";
  return null;
}

/** GIT_CLEAN_MERGED_LANG tem prioridade; depois LC_ALL, LC_MESSAGES e LANG. Padrão: en. */
export function detectLocale(env: Record<string, string | undefined> = Bun.env): Locale {
  for (const key of ["GIT_CLEAN_MERGED_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) {
    const value = env[key];
    if (!value || value === "C" || value === "POSIX") continue;
    const locale = parseLocale(value);
    if (locale) return locale;
  }
  return "en";
}
