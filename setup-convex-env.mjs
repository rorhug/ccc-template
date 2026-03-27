/**
 * Sets Convex environment variables during Vercel builds.
 * Reads JWT_PRIVATE_KEY, JWKS, and SITE_URL from process.env
 * and pushes them to the Convex deployment via `npx convex env set --from-file`.
 */

import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const isPreview = process.env.VERCEL_TARGET_ENV === "preview";
const previewName = process.env.VERCEL_GIT_COMMIT_REF;

/**
 * Set Convex env vars using --from-file to avoid CLI argument parsing issues.
 * Writes all vars to a single temp .env file with quoted values.
 */
function setConvexEnvVars(vars) {
  const entries = Object.entries(vars).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return;

  // Set each var individually to isolate failures
  for (const [name, value] of entries) {
    const tmpFile = join(tmpdir(), `convex-env-${name}-${Date.now()}.env`);

    // For multiline values (like PEM keys), replace newlines with literal \n
    // inside double quotes — dotenv parsers expand these back to real newlines
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    writeFileSync(tmpFile, `${name}="${escaped}"\n`);

    console.log(`Setting ${name} on Convex...`);

    const setArgs = ["convex", "env", "set", "--from-file", tmpFile, "--force"];
    if (isPreview && previewName) {
      setArgs.splice(3, 0, "--preview-name", previewName);
    }

    const result = spawnSync("npx", setArgs, { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`Failed to set ${name} (exit code ${result.status})`);
    } else {
      console.log(`Successfully set ${name}.`);
    }

    try { unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }

}

// Determine SITE_URL
let siteUrl = process.env.SITE_URL;
if (isPreview && process.env.VERCEL_BRANCH_URL) {
  siteUrl = `https://${process.env.VERCEL_BRANCH_URL}`;
} else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}

const vars = {};

if (siteUrl) vars.SITE_URL = siteUrl;
if (process.env.JWT_PRIVATE_KEY) vars.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
if (process.env.JWKS) vars.JWKS = process.env.JWKS;

setConvexEnvVars(vars);
