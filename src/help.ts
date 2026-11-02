import { bold } from "./ui.ts";

export const help = () => `
${bold("git-clean-merged")} — apaga branches locais já mergeadas no branch base

${bold("Uso:")}
  git-clean-merged [opções]

${bold("Opções:")}
  -b, --base <ref>       Branch base (padrão: main, ou master se não existir)
  -m, --mode <d|D>       Modo de deleção do git (padrão: d)
  -d, --safe             Atalho para --mode d (só apaga se totalmente mergeado)
  -D, --force            Atalho para --mode D (apaga sem checar merge; perigoso)
  -n, --dry-run          Só mostra o que seria apagado, sem alterar nada
  -e, --exclude <glob>   Branch/glob a preservar (repetível, ex.: -e 'release/*')
      --include-empty    Também apaga branches no mesmo commit do base
                         (por padrão são ignorados: podem ser branches novos)
  -y, --yes              Não pede confirmação
  -h, --help             Mostra esta ajuda
  -v, --version          Mostra a versão do programa

${bold("Sempre preservados:")} base, main, master, develop, dev, o branch atual
e qualquer branch em checkout em algum worktree.

${bold("Códigos de saída:")} 0 ok · 1 falha ao apagar algum branch · 2 erro de uso/validação
`;
