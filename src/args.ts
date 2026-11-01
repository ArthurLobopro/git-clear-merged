import { CliError } from "./errors.ts";
import { help } from "./help.ts";

export type Options = {
  base?: string;
  mode?: string;
  safe: boolean;
  force: boolean;
  dryRun: boolean;
  exclude: string[];
  includeEmpty: boolean;
  yes: boolean;
  help: boolean;
};

export type DeleteMode = "d" | "D";

const LONG_BY_SHORT: Record<string, string> = {
  b: "base",
  m: "mode",
  d: "safe",
  D: "force",
  n: "dry-run",
  e: "exclude",
  y: "yes",
  h: "help",
};
const VALUE_OPTIONS = new Set(["base", "mode", "exclude"]);

/** Parser mínimo: --opt, --opt=valor, --opt valor, -x, -xvalor, -xyz (flags agrupadas). */
export function parseArgs(argv: string[]): Options {
  const opts: Options = {
    safe: false,
    force: false,
    dryRun: false,
    exclude: [],
    includeEmpty: false,
    yes: false,
    help: false,
  };

  let i = 0;

  const apply = (name: string, inlineValue?: string) => {
    let value: string | undefined;
    if (VALUE_OPTIONS.has(name)) {
      value = inlineValue ?? argv[++i];
      if (value === undefined || value === "") {
        throw new CliError(`A opção '${name}' exige um valor.`);
      }
    } else if (inlineValue !== undefined) {
      throw new CliError(`A opção '${name}' não aceita valor.`);
    }

    switch (name) {
      case "base": opts.base = value; break;
      case "mode": opts.mode = value; break;
      case "exclude": opts.exclude.push(value!); break;
      case "safe": opts.safe = true; break;
      case "force": opts.force = true; break;
      case "dry-run": opts.dryRun = true; break;
      case "include-empty": opts.includeEmpty = true; break;
      case "yes": opts.yes = true; break;
      case "help": opts.help = true; break;
      default: throw new CliError(`Opção desconhecida: '${name}'.\n${help()}`);
    }
  };

  for (; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) apply(arg.slice(2));
      else apply(arg.slice(2, eq), arg.slice(eq + 1));
    } else if (arg.startsWith("-") && arg.length > 1) {
      for (let j = 1; j < arg.length; j++) {
        const long = LONG_BY_SHORT[arg[j]!];
        if (!long) throw new CliError(`Opção desconhecida: '-${arg[j]}'.\n${help()}`);
        if (VALUE_OPTIONS.has(long)) {
          // o resto do argumento (se houver) é o valor: -bmain
          const rest = arg.slice(j + 1);
          apply(long, rest || undefined);
          break;
        }
        apply(long);
      }
    } else {
      throw new CliError(`Argumento inesperado: '${arg}'.\n${help()}`);
    }
  }

  return opts;
}

/** Resolve o modo (-d / -D), recusando pedidos conflitantes ou inválidos. */
export function resolveMode(opts: Pick<Options, "mode" | "safe" | "force">): DeleteMode {
  const requested = new Set<string>();
  if (opts.mode) requested.add(opts.mode);
  if (opts.safe) requested.add("d");
  if (opts.force) requested.add("D");
  if (requested.size > 1) {
    throw new CliError("Modos conflitantes: use apenas um entre --mode, -d e -D.");
  }
  const mode = [...requested][0] ?? "d";
  if (mode !== "d" && mode !== "D") {
    throw new CliError(`Modo inválido '${mode}'. Use 'd' ou 'D'.`);
  }
  return mode;
}
