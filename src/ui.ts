const paint = (code: number) => (s: string) =>
  process.stdout.isTTY && !Bun.env.NO_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s;

export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const dim = paint(2);
export const bold = paint(1);
