/** Erro de uso/validação: vira mensagem + código de saída (2 por padrão). */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 2,
  ) {
    super(message);
    this.name = "CliError";
  }
}
