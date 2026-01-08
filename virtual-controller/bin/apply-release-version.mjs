import fs from "node:fs";
import pkgJson from "../package.json" with { type: "json" };

pkgJson.version = fs
  .readFileSync("../RELEASE_VERSION", { encoding: "utf-8" })
  .trim();
fs.writeFileSync("../package.json", JSON.stringify(pkgJson, null, 2));
console.log(`Applied version (${pkgJson.version}) to package.json`);
