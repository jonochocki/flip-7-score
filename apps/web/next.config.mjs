import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  allowedDevOrigins: ["http://127.0.0.1:3010"],
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
