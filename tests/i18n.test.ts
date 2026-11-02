import { English } from "../src/i18n/en.ts";
import { afterEach, expect, test } from "bun:test";
import { detectLocale, parseLocale, setLocale, t } from "../src/i18n/index.ts";
import { run } from "../src/cli.ts";
import { testEnv } from "./helpers.ts";

afterEach(() => setLocale("pt"));

test("parseLocale reconhece pt e en", () => {
  expect(parseLocale("pt_BR.UTF-8")).toBe("pt");
  expect(parseLocale("en_US.UTF-8")).toBe("en");
  expect(parseLocale("fr_FR")).toBeNull();
  expect(parseLocale(undefined)).toBeNull();
});

test("detectLocale: padrão en, GIT_CLEAN_MERGED_LANG tem prioridade", () => {
  expect(detectLocale({})).toBe("en");
  expect(detectLocale({ LANG: "pt_BR.UTF-8" })).toBe("pt");
  expect(detectLocale({ LANG: "pt_BR.UTF-8", GIT_CLEAN_MERGED_LANG: "en" })).toBe("en");
  expect(detectLocale({ LC_ALL: "C", LANG: "pt_BR.UTF-8" })).toBe("pt");
  expect(detectLocale({ LANG: "fr_FR.UTF-8" })).toBe("en");
});

test("catálogos têm as mesmas chaves e o inglês difere do português", () => {
  setLocale("en");
  expect(t().cancelled()).toBe("Cancelled.");
  setLocale("pt");
  expect(t().cancelled()).toBe("Cancelado.");
});

test("CLI em inglês", async () => {
  setLocale("en");
  const x = testEnv(process.cwd());
  expect(await run(["--help"], x.env)).toBe(0);
  expect(x.text()).toContain("Usage:");
  const y = testEnv(process.cwd());
  expect(await run(["--bogus"], y.env)).toBe(2);
  expect(y.errText()).toContain("Unknown option");
});

test("tradução parcial cai no inglês", () => {
  class Partial extends English {
    override cancelled(): string {
      return "Annulé.";
    }
  }
  const p = new Partial();
  expect(p.cancelled()).toBe("Annulé.");
  expect(p.nothingToDelete()).toBe(new English().nothingToDelete());
});
