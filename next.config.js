const { execFileSync } = require("node:child_process");
const packageJson = require("./package.json");

function getGitShortHash() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_TIME:
      process.env.NODE_ENV === "production"
        ? new Date().toISOString()
        : "development",
    NEXT_PUBLIC_COMMIT_HASH: getGitShortHash(),
  },
};

module.exports = nextConfig
