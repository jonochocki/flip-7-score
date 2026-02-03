#!/usr/bin/env node

// Helper script to extract Supabase project ID from URL
// Usage: node scripts/get-project-id.js <supabase-url>
// Example: node scripts/get-project-id.js https://abcdefghijklmnop.supabase.co

const url = process.argv[2];

if (!url) {
  console.error("Please provide a Supabase URL");
  console.error("Usage: node scripts/get-project-id.js <supabase-url>");
  process.exit(1);
}

try {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  // Extract project ID from hostname (format: PROJECT_ID.supabase.co)
  const match = hostname.match(/^([^.]+)\.supabase\.co$/);
  
  if (match && match[1]) {
    console.log(match[1]);
  } else {
    console.error("Could not extract project ID from URL:", url);
    console.error("Expected format: https://PROJECT_ID.supabase.co");
    process.exit(1);
  }
} catch (error) {
  console.error("Invalid URL:", error.message);
  process.exit(1);
}
