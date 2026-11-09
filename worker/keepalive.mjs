// Keeps the free Supabase project awake while the alert job isn't set up yet (free projects pause after
// about a week without activity, which would stop sign-ins). Uses only the public URL and publishable key
// from config.js, so it needs no secrets. Never fails the workflow.
import fs from 'node:fs';

const cfg = fs.readFileSync(new URL('../config.js', import.meta.url), 'utf8');
const pick = k => (cfg.match(new RegExp(k + "\\s*:\\s*'([^']*)'")) || [])[1] || '';
const url = (process.env.SUPABASE_URL || pick('SUPABASE_URL')).replace(/\/+$/, '');
const key = pick('SUPABASE_ANON_KEY');

if (!url || !key || /YOUR[-_]/i.test(key)) {
  console.log('No Supabase URL or publishable key in config.js, so there is nothing to keep awake.');
} else {
  try {
    // Signed-out requests are refused by row-level security, but the database still handles them.
    const r = await fetch(`${url}/rest/v1/docs?select=kind&limit=1`, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
    console.log(`Database keep-alive: HTTP ${r.status}`);
  } catch (e) {
    console.log(`Database keep-alive failed: ${e.message}. If the project is paused, restore it in the Supabase dashboard.`);
  }
}
