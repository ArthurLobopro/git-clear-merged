import type { Translation } from "./translation.ts";

export class Portuguese implements Translation {
  gitNotFound(): string {
    return "O comando 'git' não foi encontrado no PATH.";
  }

  notInRepo(): string {
    return "Este diretório não está dentro de um repositório Git.";
  }

  baseMissing(b: string): string {
    return `Branch base '${b}' não existe.`;
  }

  baseNotFound(): string {
    return "Não encontrei 'main' nem 'master'. Informe um branch com --base.";
  }

  listBranchesFailed(e: string): string {
    return `Falha ao listar branches: ${e}`;
  }

  listWorktreesFailed(e: string): string {
    return `Falha ao listar worktrees: ${e}`;
  }

  optNeedsValue(n: string): string {
    return `A opção '${n}' exige um valor.`;
  }

  optNoValue(n: string): string {
    return `A opção '${n}' não aceita valor.`;
  }

  unknownOption(n: string, help: string): string {
    return `Opção desconhecida: '${n}'.\n${help}`;
  }

  unexpectedArg(a: string, help: string): string {
    return `Argumento inesperado: '${a}'.\n${help}`;
  }

  conflictingModes(): string {
    return "Modos conflitantes: use apenas um entre --mode, -d e -D.";
  }

  invalidMode(m: string): string {
    return `Modo inválido '${m}'. Use 'd' ou 'D'.`;
  }

  skipCurrent(): string {
    return "branch atual";
  }

  skipProtected(): string {
    return "protegido";
  }

  skipWorktreeGone(p: string): string {
    return `worktree apagado manualmente ${p}`;
  }

  skipWorktreeCheckedOut(p: string): string {
    return `em checkout no worktree ${p} (use --include-worktrees para removê-lo)`;
  }

  skipWorktreeMain(p: string): string {
    return `em checkout no worktree principal ${p}`;
  }

  skipWorktreeLocked(p: string): string {
    return `worktree bloqueado ${p}`;
  }

  skipWorktreeDirty(p: string): string {
    return `worktree com alterações não commitadas ${p}`;
  }

  skipSameCommit(b: string): string {
    return `mesmo commit de '${b}' (use --include-empty para apagar)`;
  }

  detached(): string {
    return "⚠ HEAD está destacado (detached); nenhum branch será tratado como 'atual'.";
  }

  notOnBase(cur: string, base: string): string {
    return `⚠ Você está em '${cur}', não em '${base}'. Com -d, o git pode recusar ` +
    `branches sem upstream que não estejam mergeados em HEAD.`;
  }

  summaryBase(): string {
    return "Base:";
  }

  summaryMode(): string {
    return "Modo:";
  }

  summaryDryRun(): string {
    return "Dry-run:";
  }

  yes(): string {
    return "sim";
  }

  no(): string {
    return "não";
  }

  preserved(): string {
    return "Preservados:";
  }

  pruneTip(): string {
    return "Dica: para apagar worktrees deletadas manualmente, rode git worktree prune";
  }

  nothingToDelete(): string {
    return "✔ Nenhum branch para apagar.";
  }

  wouldDelete(n: number): string {
    return `Seriam apagados (${n}):`;
  }

  willDelete(n: number): string {
    return `Serão apagados (${n}):`;
  }

  dryRunNote(): string {
    return "Dry-run: nada foi alterado.";
  }

  forceWarning(): string {
    return "⚠ Modo -D ignora a checagem de merge do git. Commits exclusivos desses " +
    "branches só poderão ser recuperados pelo reflog.";
  }

  nonInteractive(): string {
    return "Sem terminal interativo para confirmar. Use --yes ou --dry-run.";
  }

  confirm(n: number, mode: string): string {
    return `Apagar ${n} branch(es) com 'git branch -${mode}'? [s/N]`;
  }

  cancelled(): string {
    return "Cancelado.";
  }

  was(sha: string): string {
    return ` (era ${sha})`;
  }

  deletedCount(n: number): string {
    return `${n} apagado(s)`;
  }

  failuresCount(n: number): string {
    return `${n} falha(s)`;
  }

  zeroFailures(): string {
    return "0 falhas";
  }

  failureDetails(): string {
    return "\nDetalhes das falhas:";
  }

  worktreeFailure(p: string, e: string): string {
    return `worktree ${p}: ${e}`;
  }

  worktreeSuffix(p: string): string {
    return ` + worktree ${p}`;
  }

  helpText(b: (s: string) => string): string {
    return `
${b("git-clean-merged")} — apaga branches locais já mergeadas no branch base

${b("Uso:")}
  git-clean-merged [opções]
  git-clean-merged settings ...   Gerencia configurações salvas (veja 'settings')

${b("Opções:")}
  -b, --base <ref>       Branch base (padrão: main, ou master se não existir)
  -m, --mode <d|D>       Modo de deleção do git (padrão: d)
  -d, --safe             Atalho para --mode d (só apaga se totalmente mergeado)
  -D, --force            Atalho para --mode D (apaga sem checar merge; perigoso)
  -n, --dry-run          Só mostra o que seria apagado, sem alterar nada
  -e, --exclude <glob>   Branch/glob a preservar (repetível, ex.: -e 'release/*')
      --include-empty    Também apaga branches no mesmo commit do base
                         (por padrão são ignorados: podem ser branches novos)
  -w, --include-worktrees
                         Também remove worktrees de branches mergeados, desde que
                         não tenham alterações não commitadas (nem arquivos novos)
  -y, --yes              Não pede confirmação
  -h, --help             Mostra esta ajuda
  -v, --version          Mostra a versão do programa

${b("Sempre preservados:")} base, main, master, develop, dev, o branch atual
e qualquer branch em checkout em algum worktree (veja --include-worktrees).
O worktree principal, worktrees bloqueados e worktrees com alterações nunca são removidos.

${b("Idioma:")} inglês (padrão) ou português, via GIT_CLEAN_MERGED_LANG=en|pt,
uma configuração salva ('settings set language pt') ou pelas variáveis de locale LC_ALL, LC_MESSAGES e LANG, nessa ordem.

${b("Códigos de saída:")} 0 ok · 1 falha ao apagar algum branch · 2 erro de uso/validação
`;
  }

  settingsUsage(b: (s: string) => string): string {
    return `
${b("Uso:")}
  git-clean-merged settings [list]
  git-clean-merged settings get <chave>
  git-clean-merged settings set <chave> <valor>
  git-clean-merged settings unset <chave>

${b("Chaves:")}
  language    Idioma da interface: en, pt (padrão: idioma do sistema, depois en)
`;
  }

  settingsUnknownKey(key: string, valid: string): string {
    return `Configuração desconhecida: '${key}'. Configurações válidas: ${valid}.`;
  }

  settingsInvalidValue(key: string, value: string, accepted: string): string {
    return `Valor inválido '${value}' para '${key}'. Valores aceitos: ${accepted}.`;
  }

  settingsMissingArgs(command: string): string {
    return `Faltam argumentos em 'settings ${command}'.`;
  }

  settingsUnknownCommand(command: string): string {
    return `Comando de settings desconhecido: '${command}'.`;
  }

  settingsSaved(key: string, value: string): string {
    return `✔ ${key} = ${value}`;
  }

  settingsRemoved(key: string): string {
    return `✔ ${key} removida (comportamento padrão restaurado).`;
  }

  settingsNotSet(): string {
    return "(não definida)";
  }

  settingsFile(path: string): string {
    return `Arquivo de configurações: ${path}`;
  }

  settingsSaveFailed(path: string, e: string): string {
    return `Não foi possível salvar as configurações em ${path}: ${e}`;
  }
}
