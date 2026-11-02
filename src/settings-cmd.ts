import { CliError } from "./errors.ts";
import { setLocale, t } from "./i18n/index.ts";
import {
  DEFINITIONS,
  SETTING_KEYS,
  isSettingKey,
  loadSettings,
  saveSettings,
  type SettingKey,
} from "./settings.ts";
import { bold, dim, green } from "./ui.ts";

type Io = { configPath: string; out: (line: string) => void };

function requireKey(key: string): SettingKey {
  if (!isSettingKey(key)) throw new CliError(t().settingsUnknownKey(key, SETTING_KEYS.join(", ")));
  return key;
}

/** `git-clean-merged settings [list|get|set|unset]`. */
export async function settingsCommand(args: string[], { configPath, out }: Io): Promise<number> {
  const [command = "list", ...rest] = args;

  switch (command) {
    case "list": {
      const settings = await loadSettings(configPath);
      for (const key of SETTING_KEYS) {
        out(`${bold(key)} = ${settings[key] ?? dim(t().settingsNotSet())}`);
      }
      out(dim(`\n${t().settingsFile(configPath)}`));
      return 0;
    }
    case "get": {
      if (rest.length !== 1) throw new CliError(t().settingsMissingArgs(command));
      const key = requireKey(rest[0]!);
      const value = (await loadSettings(configPath))[key];
      out(value ?? t().settingsNotSet());
      return 0;
    }
    case "set": {
      if (rest.length !== 2) throw new CliError(t().settingsMissingArgs(command));
      const key = requireKey(rest[0]!);
      const value = DEFINITIONS[key].parse(rest[1]!);
      if (value === null) {
        throw new CliError(t().settingsInvalidValue(key, rest[1]!, DEFINITIONS[key].accepted));
      }
      await persist(configPath, { ...(await loadSettings(configPath)), [key]: value });
      // A confirmação já sai no idioma recém-escolhido.
      if (key === "language") setLocale(value as "en" | "pt");
      out(green(t().settingsSaved(key, String(value))));
      return 0;
    }
    case "unset": {
      if (rest.length !== 1) throw new CliError(t().settingsMissingArgs(command));
      const key = requireKey(rest[0]!);
      const { [key]: _removed, ...others } = await loadSettings(configPath);
      await persist(configPath, others);
      out(green(t().settingsRemoved(key)));
      return 0;
    }
    case "help":
    case "--help":
    case "-h":
      out(t().settingsUsage(bold));
      return 0;
    default:
      throw new CliError(`${t().settingsUnknownCommand(command)}\n${t().settingsUsage(bold)}`);
  }
}

async function persist(path: string, settings: Parameters<typeof saveSettings>[1]) {
  try {
    await saveSettings(path, settings);
  } catch (e) {
    throw new CliError(t().settingsSaveFailed(path, e instanceof Error ? e.message : String(e)), 1);
  }
}
