/**
 * Aplica twa/LauncherActivity.java (lectura del Install Referrer de Play) sobre
 * el proyecto Android que genera bubblewrap. Correrlo después de cada
 * `bubblewrap update`, que regenera app/src y app/build.gradle y pisa el cambio.
 *
 *   npx @bubblewrap/cli update
 *   node scripts/twa/aplicar-install-referrer.mjs
 *   npx @bubblewrap/cli build
 *
 * Es idempotente: correrlo dos veces no duplica nada.
 */
import fs from "fs";
import path from "path";

const RAIZ = process.cwd();
const ORIGEN = path.join(RAIZ, "twa", "LauncherActivity.java");
const DESTINO = path.join(RAIZ, "app", "src", "main", "java", "ar", "com", "clickcargo", "twa", "LauncherActivity.java");
const GRADLE = path.join(RAIZ, "app", "build.gradle");
const DEPENDENCIA = "implementation 'com.android.installreferrer:installreferrer:2.2'";

if (!fs.existsSync(path.dirname(DESTINO))) {
  console.error(`No existe ${path.relative(RAIZ, path.dirname(DESTINO))}. Generá el proyecto con \`npx @bubblewrap/cli update\` primero.`);
  process.exit(1);
}

fs.copyFileSync(ORIGEN, DESTINO);
console.log(`LauncherActivity copiado a ${path.relative(RAIZ, DESTINO)}`);

let gradle = fs.readFileSync(GRADLE, "utf8");
if (gradle.includes("com.android.installreferrer:installreferrer")) {
  console.log("build.gradle ya tiene installreferrer");
} else {
  const ancla = "implementation 'com.google.androidbrowserhelper:androidbrowserhelper:";
  if (!gradle.includes(ancla)) {
    console.error("No encontré la dependencia de androidbrowserhelper en app/build.gradle para agregar installreferrer al lado.");
    process.exit(1);
  }
  gradle = gradle.replace(ancla, `${DEPENDENCIA}\n    ${ancla}`);
  fs.writeFileSync(GRADLE, gradle);
  console.log("installreferrer agregado a app/build.gradle");
}
