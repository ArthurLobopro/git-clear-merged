#!/usr/bin/env bun
/**
 * git-clean-merged — apaga branches locais já mergeadas em um branch base.
 *
 * Substitui: git branch --merged main | grep -v 'main' | xargs git branch -d
 */
import { run } from "./cli.ts";
import { detectLocale, setLocale } from "./i18n/index.ts";

setLocale(detectLocale());
process.exit(await run(Bun.argv.slice(2)));
