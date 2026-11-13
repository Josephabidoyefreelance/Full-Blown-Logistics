// JAAD signup password-only patch. Alters exactly one source file.
const fs = require('fs');
const path = require('path');
const project = path.resolve(process.argv[2] || process.cwd());
const file = path.join(project, 'src', 'app', 'customer', 'signup', 'page.tsx');
const patches = [
  {
    "before": "  const [email, setEmail] = useState('');\n  const [phone, setPhone] = useState('');\n  const [countryCode, setCountryCode] = useState('+234');\n  const [code, setCode] = useState('');\n",
    "after": "  const [email, setEmail] = useState('');\n  const [phone, setPhone] = useState('');\n  const [password, setPassword] = useState('');\n  const [confirmPassword, setConfirmPassword] = useState('');\n  const [countryCode, setCountryCode] = useState('+234');\n  const [code, setCode] = useState('');\n"
  },
  {
    "before": "    if (!firstName.trim() || !lastName.trim() || !businessName.trim() || !email.trim() || !phone.trim()) {\n      setError('Please fill in your business name, first name, last name, email, and phone number.');\n      return;\n    }\n",
    "after": "    if (!firstName.trim() || !lastName.trim() || !businessName.trim() || !email.trim() || !phone.trim()) {\n      setError('Please fill in your business name, first name, last name, email, and phone number.');\n      return;\n    }\n    if (password.length < 8) {\n      setError('Enter a password with at least 8 characters.');\n      return;\n    }\n    if (password !== confirmPassword) {\n      setError('The passwords do not match.');\n      return;\n    }\n"
  },
  {
    "before": "    }\n\n    try {\n      const response = await fetch('/api/customer/register', {\n",
    "after": "    }\n\n    // Set the password only after the email OTP has established an authenticated session.\n    // Never send it to the company registration API or store it in browser storage.\n    const { error: passwordError } = await supabase.auth.updateUser({ password });\n    if (passwordError) {\n      setLoading(false);\n      setError(readErrorMessage(passwordError, 'Could not set your password. Please try again.'));\n      return;\n    }\n\n    try {\n      const response = await fetch('/api/customer/register', {\n"
  },
  {
    "before": "    }\n\n    setLoading(false);\n    router.push('/customer/dashboard'); // Existing customer-ERP lock and plan enforcement remain unchanged.\n",
    "after": "    }\n\n    setPassword('');\n    setConfirmPassword('');\n    setLoading(false);\n    router.push('/customer/dashboard'); // Existing customer-ERP lock and plan enforcement remain unchanged.\n"
  },
  {
    "before": "                    </div>\n                  </div>\n                </div>\n\n",
    "after": "                    </div>\n                  </div>\n                  <div>\n                    <label className=\"mb-2 block text-[13px] font-semibold text-[#0b0b0d]\">Enter password</label>\n                    <input\n                      type=\"password\"\n                      autoComplete=\"new-password\"\n                      value={password}\n                      onChange={(e) => setPassword(e.target.value)}\n                      className=\"w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]\"\n                    />\n                  </div>\n                  <div>\n                    <label className=\"mb-2 block text-[13px] font-semibold text-[#0b0b0d]\">Enter password again</label>\n                    <input\n                      type=\"password\"\n                      autoComplete=\"new-password\"\n                      value={confirmPassword}\n                      onChange={(e) => setConfirmPassword(e.target.value)}\n                      className=\"w-full rounded-[9px] border border-[#d8dbe2] bg-[#eaf1ff] px-5 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-[#e5231b]\"\n                    />\n                  </div>\n                </div>\n\n"
  }
];
if (!fs.existsSync(file)) {
  console.error('Signup page not found: ' + file);
  process.exit(1);
}
const original = fs.readFileSync(file, 'utf8');
const windowsNewlines = original.includes('\r\n');
let current = original.replace(/\r\n/g, '\n');
let changed = 0;
for (const p of patches) {
  if (current.includes(p.after)) continue; // already installed
  const instances = current.split(p.before).length - 1;
  if (instances !== 1) {
    console.error('Stopped: active signup page differs at a required anchor. No files changed.');
    process.exit(2);
  }
  current = current.replace(p.before, p.after);
  changed++;
}
if (!changed) {
  console.log('Signup password fields and verification are already installed.');
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = file + '.jaad-password-backup-' + stamp + '.bak';
fs.copyFileSync(file, backup);
try {
  fs.writeFileSync(file, windowsNewlines ? current.replace(/\n/g, '\r\n') : current, 'utf8');
} catch (error) {
  fs.copyFileSync(backup, file);
  throw error;
}
console.log('SUCCESS: Updated only ' + file);
console.log('BACKUP: ' + backup);
console.log('Next: npm run build; then test a NEW signup through email verification.');
