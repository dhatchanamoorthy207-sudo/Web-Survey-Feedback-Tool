#!/usr/bin/env tsx
import readline from 'readline';
import { getDb, queryOne, execute } from '../server/db.js';
import { hashPassword } from '../server/auth.js';
import { logAdminAction } from '../server/audit.js';

async function main() {
  console.log('====================================================');
  console.log(' SurveyPulse - Secure Administrator Account Creator ');
  console.log('====================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  try {
    const name = (await question('Enter Administrator Full Name [e.g. Admin User]: ')).trim() || 'System Administrator';
    const email = (await question('Enter Administrator Email [e.g. admin@surveypulse.io]: ')).trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('Error: Please enter a valid email address.');
      process.exit(1);
    }

    const password = (await question('Enter Administrator Password (min 8 chars): ')).trim();

    if (!password || password.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    const db = await getDb();
    const existing = queryOne<{ id: number; role: string }>(db, 'SELECT id, role FROM users WHERE email = ?', [email]);

    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    if (existing) {
      console.log(`\nUser with email ${email} already exists.`);
      const confirm = (await question('Promote this existing user to administrator and update password? (y/N): ')).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes') {
        execute(
          db,
          `UPDATE users SET password_hash = ?, role = 'admin', account_status = 'active', updated_at = ? WHERE id = ?`,
          [passwordHash, now, existing.id]
        );
        await logAdminAction(
          existing.id,
          name,
          'ADMIN_CLI_SETUP',
          'USER',
          String(existing.id),
          `CLI script elevated account ${email} to admin`
        );
        console.log(`\n✓ Successfully promoted ${email} to administrator!`);
      } else {
        console.log('Operation cancelled.');
      }
    } else {
      const result = execute(
        db,
        `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 'active', ?, ?)`,
        [name, email, passwordHash, now, now]
      );
      const newAdminId = result.lastInsertRowId;
      await logAdminAction(
        newAdminId,
        name,
        'ADMIN_CLI_SETUP',
        'USER',
        String(newAdminId),
        `CLI script created new administrator account: ${email}`
      );
      console.log(`\n✓ Successfully created new administrator account: ${email} (ID: ${newAdminId})`);
    }

    console.log('\nYou may now sign in at the login screen with these credentials.\n');
  } catch (err) {
    console.error('Failed to create administrator:', err);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
