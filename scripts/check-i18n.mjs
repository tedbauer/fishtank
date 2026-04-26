#!/usr/bin/env node
// Verifies that every language in src/lib/i18n.js has the same keys as
// the default (English) dictionary. Exits non-zero if any are missing or
// extra. Run via `npm run check:i18n`.

import { translations, DEFAULT_LANG } from "../src/lib/i18n.js";

const baseKeys = Object.keys(translations[DEFAULT_LANG]).sort();
const baseSet = new Set(baseKeys);

let problems = 0;

for (const lang of Object.keys(translations)) {
    if (lang === DEFAULT_LANG) continue;
    const keys = new Set(Object.keys(translations[lang]));

    const missing = baseKeys.filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseSet.has(k)).sort();

    if (missing.length) {
        problems++;
        console.error(`[i18n] ${lang} is missing ${missing.length} keys:`);
        for (const k of missing) console.error(`  - ${k}`);
    }
    if (extra.length) {
        problems++;
        console.error(`[i18n] ${lang} has ${extra.length} unknown keys (typos?):`);
        for (const k of extra) console.error(`  + ${k}`);
    }
}

if (problems === 0) {
    console.log(`[i18n] all languages are consistent (${baseKeys.length} keys).`);
    process.exit(0);
} else {
    process.exit(1);
}
