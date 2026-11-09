// Public settings for your website. These values are safe to publish:
// the anon key is designed to be public, and your data is protected by row-level security.
// NEVER put the service_role key, your database password or any bot token in this file.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://vrytpkcxmmgjltihptee.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_Fw0pxJ0W6jiDOR3VQkw4Tw_YLDPTMPK',   // publishable key (public by design)
  VAPID_PUBLIC_KEY: '',                          // README step 6: npx web-push generate-vapid-keys (public key only)
  TELEGRAM_BOT_USERNAME: '',                     // README step 6: your bot's username without @, e.g. MyCareerAlertsBot
  APP_NAME: 'AI Career Agent',
};
