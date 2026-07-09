import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gatewayPort = process.env.PORT || 8000;

const services = [
  { name: "gateway", dir: "gateway", port: gatewayPort },
  { name: "auth", dir: "services/auth", port: 8001 },
  { name: "chat", dir: "services/chat", port: 8002 },
  { name: "agent", dir: "services/agent", port: 8003 },
  { name: "billing", dir: "services/billing", port: 8004 },
];

console.log("🚀 Starting all Cortex AI services concurrently...");

const children = [];

for (const service of services) {
  const servicePath = path.join(__dirname, service.dir);
  
  // Set up environment variables with default internal microservice URLs
  // which can be overridden by environment variables in Render/production
  const env = { 
    AUTH_SERVICE: "http://localhost:8001",
    CHAT_SERVICE: "http://localhost:8002",
    AGENT_SERVICE: "http://localhost:8003",
    BILLING_SERVICE: "http://localhost:8004",
    GATEWAY_URL: `http://localhost:${gatewayPort}`,
    ...process.env, 
    PORT: String(service.port) 
  };
  
  console.log(`Starting ${service.name} on port ${service.port}...`);
  
  // Spawn child node process
  const child = spawn("node", ["index.js"], {
    cwd: servicePath,
    env,
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const line of lines) {
      if (line) console.log(`[${service.name.toUpperCase()}] ${line}`);
    }
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const line of lines) {
      if (line) console.error(`[${service.name.toUpperCase()}] [ERR] ${line}`);
    }
  });

  child.on("close", (code) => {
    console.log(`❌ Service ${service.name} exited with code ${code}`);
    // Exit parent process if a service crashes to trigger Render container restart
    process.exit(code || 1);
  });

  children.push(child);
}

// Clean up processes on shutdown
const cleanup = () => {
  console.log("\nShutting down all services...");
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
