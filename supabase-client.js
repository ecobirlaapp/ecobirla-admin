// supabase-client.js

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://mofgfgozzesstczxhwyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZmdmZ296emVzc3Rjenhod3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODM2MDcsImV4cCI6MjA3NzY1OTYwN30.j82z-rsgbr_q3tek0d2iykDZGtoH1x7M5PkuusUr3LI';

// Import the Supabase client library from the CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
