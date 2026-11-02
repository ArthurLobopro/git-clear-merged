import type { Translation } from "./translation.ts";

export class English implements Translation {
  gitNotFound(): string {
    return "The 'git' command was not found in PATH.";
  }

  notInRepo(): string {
    return "This directory is not inside a Git repository.";
  }

  baseMissing(b: string): string {
    return `Base branch '${b}' does not exist.`;
  }

  baseNotFound(): string {
    return "Could not find 'main' or 'master'. Specify a branch with --base.";
  }

  listBranchesFailed(e: string): string {
    return `Failed to list branches: ${e}`;
  }

  listWorktreesFailed(e: string): string {
    return `Failed to list worktrees: ${e}`;
  }

  optNeedsValue(n: string): string {
    return `Option '${n}' requires a value.`;
  }

  optNoValue(n: string): string {
    return `Option '${n}' does not accept a value.`;
  }

  unknownOption(n: string, help: string): string {
    return `Unknown option: '${n}'.\n${help}`;
  }

  unexpectedArg(a: string, help: string): string {
    return `Unexpected argument: '${a}'.\n${help}`;
  }

  conflictingModes(): string {
    return "Conflicting modes: use only one of --mode, -d and -D.";
  }

  invalidMode(m: string): string {
    return `Invalid mode '${m}'. Use 'd' or 'D'.`;
  }

  skipCurrent(): string {
    return "current branch";
  }

  skipProtected(): string {
    return "protected";
  }

  skipWorktreeGone(p: string): string {
    return `worktree deleted manually ${p}`;
  }

  skipWorktreeCheckedOut(p: string): string {
    return `checked out in worktree ${p} (use --include-worktrees to remove it)`;
  }

  skipWorktreeMain(p: string): string {
    return `checked out in main worktree ${p}`;
  }

  skipWorktreeLocked(p: string): string {
    return `locked worktree ${p}`;
  }

  skipWorktreeDirty(p: string): string {
    return `worktree with uncommitted changes ${p}`;
  }

  skipSameCommit(b: string): string {
    return `same commit as '${b}' (use --include-empty to delete)`;
  }

  detached(): string {
    return "⚠ HEAD is detached; no branch will be treated as 'current'.";
  }

  notOnBase(cur: string, base: string): string {
    return `⚠ You are on '${cur}', not '${base}'. With -d, git may refuse ` +
    `branches without an upstream that are not merged into HEAD.`;
  }

  summaryBase(): string {
    return "Base:";
  }

  summaryMode(): string {
    return "Mode:";
  }

  summaryDryRun(): string {
    return "Dry-run:";
  }

  yes(): string {
    return "yes";
  }

  no(): string {
    return "no";
  }

  preserved(): string {
    return "Preserved:";
  }

  pruneTip(): string {
    return "Tip: to remove manually deleted worktrees, run git worktree prune";
  }

  nothingToDelete(): string {
    return "✔ No branches to delete.";
  }

  wouldDelete(n: number): string {
    return `Would be deleted (${n}):`;
  }

  willDelete(n: number): string {
    return `Will be deleted (${n}):`;
  }

  dryRunNote(): string {
    return "Dry-run: nothing was changed.";
  }

  forceWarning(): string {
    return "⚠ Mode -D skips git's merge check. Commits unique to these " +
    "branches can only be recovered through the reflog.";
  }

  nonInteractive(): string {
    return "No interactive terminal to confirm. Use --yes or --dry-run.";
  }

  confirm(n: number, mode: string): string {
    return `Delete ${n} branch(es) with 'git branch -${mode}'? [y/N]`;
  }

  cancelled(): string {
    return "Cancelled.";
  }

  was(sha: string): string {
    return ` (was ${sha})`;
  }

  deletedCount(n: number): string {
    return `${n} deleted`;
  }

  failuresCount(n: number): string {
    return `${n} failure(s)`;
  }

  zeroFailures(): string {
    return "0 failures";
  }

  failureDetails(): string {
    return "\nFailure details:";
  }

  worktreeFailure(p: string, e: string): string {
    return `worktree ${p}: ${e}`;
  }

  worktreeSuffix(p: string): string {
    return ` + worktree ${p}`;
  }

  helpText(b: (s: string) => string): string {
    return `
${b("git-clean-merged")} — deletes local branches already merged into the base branch

${b("Usage:")}
  git-clean-merged [options]
  git-clean-merged settings ...   Manage saved settings (see 'settings')

${b("Options:")}
  -b, --base <ref>       Base branch (default: main, or master if it does not exist)
  -m, --mode <d|D>       Git deletion mode (default: d)
  -d, --safe             Shortcut for --mode d (only deletes if fully merged)
  -D, --force            Shortcut for --mode D (deletes without merge check; dangerous)
  -n, --dry-run          Only show what would be deleted, changing nothing
  -e, --exclude <glob>   Branch/glob to preserve (repeatable, e.g. -e 'release/*')
      --include-empty    Also delete branches at the same commit as the base
                         (ignored by default: they may be brand-new branches)
  -w, --include-worktrees
                         Also remove worktrees of merged branches, as long as
                         they have no uncommitted changes (nor untracked files)
  -y, --yes              Do not ask for confirmation
  -h, --help             Show this help
  -v, --version          Show the program version

${b("Always preserved:")} base, main, master, develop, dev, the current branch
and any branch checked out in a worktree (see --include-worktrees).
The main worktree, locked worktrees and worktrees with changes are never removed.

${b("Language:")} English (default) or Portuguese, via GIT_CLEAN_MERGED_LANG=en|pt,
a saved setting ('settings set language pt') or the LC_ALL, LC_MESSAGES and LANG locale variables, in that order.

${b("Exit codes:")} 0 ok · 1 failed to delete some branch · 2 usage/validation error
`;
  }

  settingsUsage(b: (s: string) => string): string {
    return `
${b("Usage:")}
  git-clean-merged settings [list]
  git-clean-merged settings get <key>
  git-clean-merged settings set <key> <value>
  git-clean-merged settings unset <key>

${b("Keys:")}
  language    Interface language: en, pt (default: system locale, then en)
`;
  }

  settingsUnknownKey(key: string, valid: string): string {
    return `Unknown setting: '${key}'. Valid settings: ${valid}.`;
  }

  settingsInvalidValue(key: string, value: string, accepted: string): string {
    return `Invalid value '${value}' for '${key}'. Accepted values: ${accepted}.`;
  }

  settingsMissingArgs(command: string): string {
    return `'settings ${command}' is missing arguments.`;
  }

  settingsUnknownCommand(command: string): string {
    return `Unknown settings command: '${command}'.`;
  }

  settingsSaved(key: string, value: string): string {
    return `✔ ${key} = ${value}`;
  }

  settingsRemoved(key: string): string {
    return `✔ ${key} removed (default behavior restored).`;
  }

  settingsNotSet(): string {
    return "(not set)";
  }

  settingsFile(path: string): string {
    return `Settings file: ${path}`;
  }

  settingsSaveFailed(path: string, e: string): string {
    return `Could not save settings to ${path}: ${e}`;
  }
}
