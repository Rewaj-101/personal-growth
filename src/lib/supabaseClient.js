import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith("https://")) {
  console.error("Invalid or missing VITE_SUPABASE_URL. Check your .env file.");
}

if (!supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_ANON_KEY. Check your .env file.");
}

const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseAnonKey || "placeholder";

let supabaseInstance;
if (import.meta.env.DEV) {
  if (!globalThis.__supabaseClient) {
    globalThis.__supabaseClient = createClient(url, key);
  }
  supabaseInstance = globalThis.__supabaseClient;
} else {
  supabaseInstance = createClient(url, key);
}

export const supabase = supabaseInstance;