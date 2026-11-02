import { homedir } from "node:os";
import { join } from "node:path";
import { LOCALES, parseLocale, type Locale } from "./i18n/index.ts";

/** Configurações persistidas do usuário. */
export type Settings = { language?: Locale };

export type SettingKey = keyof Settings;

type Definition = {
  /** Valida e normaliza o valor informado; null se for inválido. */
  parse: (value: string) => Settings[SettingKey] | null;
  /** Valores aceitos, para mensagens de erro. */
  accepted: string;
};

export const DEFINITIONS: { [K in SettingKey]-?: Definition } = {
  language: {
    parse: (v) => parseLocale(v),
    accepted: LOCALES.join(", "),
  },
};

export const SETTING_KEYS = Object.keys(DEFINITIONS) as SettingKey[];

export const isSettingKey = (k: string): k is SettingKey => Object.hasOwn(DEFINITIONS, k);

/** $XDG_CONFIG_HOME/git-clean-merged/settings.json, ou ~/.config/git-clean-merged/settings.json. */
export function settingsPath(env: Record<string, string | undefined> = Bun.env): string {
  const base = env.XDG_CONFIG_HOME?.startsWith("/") ? env.XDG_CONFIG_HOME : join(homedir(), ".config");
  return join(base, "git-clean-merged", "settings.json");
}

/** Lê as configurações; arquivo ausente, ilegível ou com valores inválidos é ignorado. */
export async function loadSettings(path: string): Promise<Settings> {
  let raw: unknown;
  try {
    raw = await Bun.file(path).json();
  } catch {
    return {};
  }
  if (typeof raw !== "object" || raw === null) return {};

  const settings: Settings = {};
  for (const key of SETTING_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const parsed = DEFINITIONS[key].parse(value);
    if (parsed !== null) Object.assign(settings, { [key]: parsed });
  }
  return settings;
}

export async function saveSettings(path: string, settings: Settings): Promise<void> {
  await Bun.write(path, JSON.stringify(settings, null, 2) + "\n");
}
