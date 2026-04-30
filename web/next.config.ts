import path from "path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Same variables as repo-root ETL (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
loadEnv({ path: path.resolve(process.cwd(), "..", ".env") });

const nextConfig: NextConfig = {};

export default nextConfig;
