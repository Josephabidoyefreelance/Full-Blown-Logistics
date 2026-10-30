import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = '.env.local';

if (!fs.existsSync(envFile)) {
  console.error('.env.local was not found.');
  process.exit(1);
}

const env = fs.readFileSync(envFile, 'utf8');

for (const line of env.split(/\r?\n/)) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) continue;

  const equalIndex = trimmed.indexOf('=');
  if (equalIndex === -1) continue;

  const key = trimmed.slice(0, equalIndex).trim();
  let value = trimmed.slice(equalIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is missing from .env.local');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

const userId = 'deb94e4f-77af-4f7a-af80-941bb73fbca9';

const newPassword = 'JAADAdmin@2026!';

const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  { password: newPassword }
);

if (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

console.log('');
console.log('====================================');
console.log('PASSWORD RESET SUCCESSFUL');
console.log('====================================');
console.log('Email:', data.user.email);
console.log('Password:', newPassword);
console.log('====================================');