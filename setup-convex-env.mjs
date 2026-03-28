/**
 * Sets Convex environment variables during Vercel builds.
 * Reads JWT_PRIVATE_KEY, JWKS, and SITE_URL from process.env
 * and pushes them to the Convex deployment via `npx convex env set` with stdin piping.
 */

import { spawnSync } from "child_process";

const isPreview = process.env.VERCEL_TARGET_ENV === "preview";
const previewName = process.env.VERCEL_GIT_COMMIT_REF;

/**
 * Set Convex env vars by piping values via stdin to avoid CLI argument parsing issues.
 * This handles multiline values (PEM keys) correctly.
 */
function setConvexEnvVars(vars) {
  const entries = Object.entries(vars).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return;

  for (const [name, value] of entries) {
    console.log(`Setting ${name} on Convex...`);

    const setArgs = ["convex", "env", "set"];
    if (isPreview && previewName) {
      setArgs.push("--preview-name", previewName);
    }
    setArgs.push("--force", name);

    // Pipe the value via stdin to avoid shell/argument parsing issues with PEM keys
    const result = spawnSync("npx", setArgs, {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.status !== 0) {
      console.error(`Failed to set ${name} (exit code ${result.status})`);
    } else {
      console.log(`Successfully set ${name}.`);
    }
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
