const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

if (process.env.PUPPETEER_SKIP_DOWNLOAD === "true" || process.env.PUPPETEER_SKIP_DOWNLOAD === "1") {
    console.log("Skipping Chrome installation because PUPPETEER_SKIP_DOWNLOAD is enabled.");
    process.exit(0);
}

const projectRoot = path.resolve(__dirname, "..");
const configuredCacheDir = process.env.PUPPETEER_CACHE_DIR;
const cacheDir = configuredCacheDir
    ? (path.isAbsolute(configuredCacheDir) ? configuredCacheDir : path.join(projectRoot, configuredCacheDir))
    : path.join(projectRoot, ".cache", "puppeteer");

fs.mkdirSync(cacheDir, { recursive: true });

const npxInstallCommand = `npx puppeteer browsers install chrome --path \"${cacheDir}\"`;
const npmInstallCommand = `npm exec -- puppeteer browsers install chrome --path \"${cacheDir}\"`;

let installResult = spawnSync(
    npxInstallCommand,
    {
        cwd: projectRoot,
        env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
        shell: true,
        stdio: "inherit"
    }
);

if (installResult.error) {
    console.error(`Failed to run npx installer command: ${installResult.error.message}`);
    console.log("Retrying with npm exec...");

    installResult = spawnSync(
        npmInstallCommand,
        {
            cwd: projectRoot,
            env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
            shell: true,
            stdio: "inherit"
        }
    );
}

if (installResult.error) {
    console.error(`Failed to execute Puppeteer browser installer: ${installResult.error.message}`);
    process.exit(1);
}

if (installResult.status !== 0) {
    process.exit(installResult.status || 1);
}

console.log(`Chrome installed for Puppeteer at ${cacheDir}`);
