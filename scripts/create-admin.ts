/**
 * Create the first workspace admin from the command line.
 *
 *   pnpm create-admin <email> <password> [name]
 *
 * Only works while the workspace has no members — use it once, on first deploy,
 * instead of exposing the web sign-up. After that, invite people from the app.
 */
import bcrypt from 'bcryptjs';

import { createFirstAdmin, WorkspaceAlreadyInitializedError } from '../lib/api/bootstrap';

async function main() {
   const [email, password, name] = process.argv.slice(2);
   if (!email || !password) {
      console.error('usage: pnpm create-admin <email> <password> [name]');
      process.exit(1);
   }
   if (!email.includes('@') || password.length < 8) {
      console.error('need a valid email and a password of at least 8 characters');
      process.exit(1);
   }

   const { user, org } = await createFirstAdmin({
      email: email.trim().toLowerCase(),
      name: name?.trim() || email.split('@')[0],
      passwordHash: bcrypt.hashSync(password, 10),
   });
   console.log(`created admin ${user.email} in workspace "${org.slug}"`);
}

main()
   .then(() => process.exit(0))
   .catch((err) => {
      console.error(
         err instanceof WorkspaceAlreadyInitializedError
            ? 'workspace already has members — invite people from the app instead'
            : err
      );
      process.exit(1);
   });
