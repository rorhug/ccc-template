/**
 * Sets Convex environment variables during Vercel builds.
 * Reads JWT_PRIVATE_KEY, JWKS, and SITE_URL from process.env
 * and pushes them to the Convex deployment via `npx convex env set`.
 *
 * Uses spawnSync (not shell) to avoid escaping issues with multiline PEM keys.
 */

import { spawnSync } from "child_process";

const isPreview = process.env.VERCEL_TARGET_ENV === "preview";
const isProduction = process.env.VERCEL_TARGET_ENV === "production";
const previewName = process.env.VERCEL_GIT_COMMIT_REF;

function setConvexEnv(name, value) {
  if (!value) return;

  const args = ["convex", "env", "set"];
  if (isPreview && previewName) {
    args.push("--preview-name", previewName);
  }
  args.push(name, value);

  console.log(`Setting ${name} on Convex...`);
  const result = spawnSync("npx", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Failed to set ${name} (exit code ${result.status})`);
  }
}

// Determine SITE_URL
let siteUrl = process.env.SITE_URL;
if (isPreview && process.env.VERCEL_BRANCH_URL) {
  siteUrl = `https://${process.env.VERCEL_BRANCH_URL}`;
} else if (isProduction && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}

if (siteUrl) {
  setConvexEnv("SITE_URL", siteUrl);
}

if (process.env.JWT_PRIVATE_KEY) {
  setConvexEnv("JWT_PRIVATE_KEY", process.env.JWT_PRIVATE_KEY);
}

if (process.env.JWKS) {
  setConvexEnv("JWKS", process.env.JWKS);
}
