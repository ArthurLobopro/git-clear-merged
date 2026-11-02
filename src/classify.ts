import type { Branch, WorktreeState } from "./git.ts";

/** `warn`: o motivo merece destaque (ex.: worktree apagado à mão). */
export type Skipped = { name: string; reason: string; warn?: boolean };

export type Classification = { toDelete: Branch[]; skipped: Skipped[] };

export type ClassifyInput = {
  branches: Branch[];
  base: string;
  baseSha: string;
  current: string | null;
  exclude: string[];
  includeEmpty: boolean;
  /** Presente apenas com --include-worktrees. */
  worktrees?: WorktreeState;
  /** Worktrees cujo diretório foi apagado à mão; só é possível preservá-los até `git worktree prune`. */
  prunable?: Set<string>;
};

/** Branches sempre preservados, além dos informados em --exclude. */
export function protectedPatterns(base: string, exclude: string[]): string[] {
  return [base, base.split("/").pop() ?? base, "main", "master", "develop", "dev", ...exclude];
}

/** Separa os branches mergeados entre os que serão apagados e os preservados (com motivo). */
export function classify(input: ClassifyInput): Classification {
  const { branches, base, baseSha, current, exclude, includeEmpty, worktrees, prunable } = input;
  const globs = protectedPatterns(base, exclude).map((p) => new Bun.Glob(p));

  const toDelete: Branch[] = [];
  const skipped: Skipped[] = [];

  for (const b of branches) {
    const worktreeReason = b.worktree ? skipReasonForWorktree(b.worktree, worktrees, prunable) : null;
    const gone = b.worktree !== "" && prunable?.has(b.worktree);
    if (b.name === current) {
      skipped.push({ name: b.name, reason: "branch atual" });
    } else if (globs.some((g) => g.match(b.name))) {
      skipped.push({ name: b.name, reason: "protegido" });
    } else if (worktreeReason) {
      skipped.push({ name: b.name, reason: worktreeReason, ...(gone && { warn: true }) });
    } else if (!includeEmpty && b.sha === baseSha) {
      skipped.push({
        name: b.name,
        reason: `mesmo commit de '${base}' (use --include-empty para apagar)`,
      });
    } else {
      toDelete.push(b);
    }
  }

  return { toDelete, skipped };
}

/** Motivo para preservar um branch em checkout num worktree, ou null se o worktree pode ser removido. */
function skipReasonForWorktree(
  path: string,
  state?: WorktreeState,
  prunable?: Set<string>,
): string | null {
  if (prunable?.has(path)) return `worktree apagado manualmente ${path}`;
  if (!state) return `em checkout no worktree ${path} (use --include-worktrees para removê-lo)`;
  if (path === state.main) return `em checkout no worktree principal ${path}`;
  if (state.locked.has(path)) return `worktree bloqueado ${path}`;
  if (!state.clean.has(path)) return `worktree com alterações não commitadas ${path}`;
  return null;
}
