import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const services = [
  ".", // Install root dependencies (ioredis, dotenv, etc.)
  "gateway",
  "services/auth",
  "services/chat",
  "services/agent",
  "services/billing",
];

console.log("🚀 Starting installation of dependencies for all services...");

for (const service of services) {
  const servicePath = path.join(__dirname, service);
  console.log(`\n📦 Installing dependencies in: ${service}`);
  try {
    execSync("npm install", { cwd: servicePath, stdio: "inherit" });
    console.log(`✅ Finished installing dependencies in: ${service}`);
  } catch (error) {
    console.error(
      `❌ Failed to install dependencies in ${service}:`,
      error.message,
    );
    process.exit(1);
  }
}

console.log("\n✨ All dependencies installed successfully!");
