import type { Branch } from "./git.ts";

export type Skipped = { name: string; reason: string };

export type Classification = { toDelete: Branch[]; skipped: Skipped[] };

export type ClassifyInput = {
  branches: Branch[];
  base: string;
  baseSha: string;
  current: string | null;
  exclude: string[];
  includeEmpty: boolean;
};

/** Branches sempre preservados, além dos informados em --exclude. */
export function protectedPatterns(base: string, exclude: string[]): string[] {
  return [base, base.split("/").pop() ?? base, "main", "master", "develop", "dev", ...exclude];
}

/** Separa os branches mergeados entre os que serão apagados e os preservados (com motivo). */
export function classify(input: ClassifyInput): Classification {
  const { branches, base, baseSha, current, exclude, includeEmpty } = input;
  const globs = protectedPatterns(base, exclude).map((p) => new Bun.Glob(p));

  const toDelete: Branch[] = [];
  const skipped: Skipped[] = [];

  for (const b of branches) {
    if (b.name === current) {
      skipped.push({ name: b.name, reason: "branch atual" });
    } else if (b.worktree) {
      skipped.push({ name: b.name, reason: `em checkout no worktree ${b.worktree}` });
    } else if (globs.some((g) => g.match(b.name))) {
      skipped.push({ name: b.name, reason: "protegido" });
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
