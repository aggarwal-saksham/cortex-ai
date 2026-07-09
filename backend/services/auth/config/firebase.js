import { initializeApp, cert } from "firebase-admin/app";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// 1. Try to load from environment variable (for Render/Production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", error.message);
    process.exit(1);
  }
} else {
  // 2. Otherwise fall back to local JSON file (for Local Development)
  const localPath = path.join(__dirname, "../serviceAccount.json");
  if (fs.existsSync(localPath)) {
    try {
      const raw = fs.readFileSync(localPath, "utf8");
      serviceAccount = JSON.parse(raw);
    } catch (error) {
      console.error("❌ Failed to parse local serviceAccount.json file:", error.message);
      process.exit(1);
    }
  } else {
    console.error("❌ Firebase service account credentials not found in environment or local file!");
    process.exit(1);
  }
}

export const app = initializeApp({
  credential: cert(serviceAccount),
});