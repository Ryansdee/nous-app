// Génère public/sw.js avec un numéro de version unique par build :
// chaque déploiement déclenche la bannière « Nouvelle version disponible ».
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version =
  process.env.COMMIT_REF?.slice(0, 8) || // Netlify
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  Date.now().toString(36);

const tpl = readFileSync(join(root, "scripts/sw-template.js"), "utf8");
writeFileSync(join(root, "public/sw.js"), tpl.replace("__VERSION__", version));
console.log(`✓ public/sw.js généré (version ${version})`);
