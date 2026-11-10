// Creates (or resets) the Firebase Authentication login for each person in the users collection.
//
// Each users/{id} profile gets an email/password account with the same uid, so existing audit logs
// and references keep pointing at the right person. The old password field is removed from the profile.
//
// Usage:
//   npx tsx scripts/set-user-passwords.ts --key ~/Downloads/<service-account>.json
//   npx tsx scripts/set-user-passwords.ts --key ~/Downloads/<service-account>.json --only patriciab28
//
// The script asks for each new password without showing it on screen. Press Enter on an empty
// password to skip that person.
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const AUTH_EMAIL_DOMAIN = "grupoazevedo.app"; // keep in sync with src/lib/firebase.ts

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// One reader for the whole run; typed characters are not echoed while a password is asked
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
(rl as any)._writeToOutput = (text: string) => {
  if (!muted) process.stdout.write(text);
};
const lines = rl[Symbol.asyncIterator]();

async function askHidden(question: string): Promise<string> {
  process.stdout.write(question);
  muted = true;
  const { value } = await lines.next();
  muted = false;
  process.stdout.write("\n");
  return value ?? "";
}

async function main() {
  const keyArg = argValue("--key");
  const only = argValue("--only")?.toLowerCase();
  const serviceAccountJson = keyArg
    ? fs.readFileSync(path.resolve(keyArg.replace(/^~/, os.homedir())), "utf8")
    : process.env.FIREBASE_SERVICE_ACCOUNT;
  const usingEmulators = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!serviceAccountJson && !usingEmulators) {
    throw new Error("Pass --key <service-account.json> or set FIREBASE_SERVICE_ACCOUNT.");
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const app = initializeApp({
    ...(serviceAccountJson && !usingEmulators ? { credential: cert(JSON.parse(serviceAccountJson)) } : {}),
    projectId: firebaseConfig.projectId,
  });
  const auth = getAuth(app);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const usersSnap = await db.collection("users").get();
  const people = usersSnap.docs.filter((d) => !only || String(d.data().username).toLowerCase() === only);
  if (people.length === 0) {
    console.log(only ? `No user with username "${only}".` : "The users collection is empty.");
    return;
  }

  for (const userDoc of people) {
    const profile = userDoc.data();
    const username = String(profile.username || "").trim().toLowerCase();
    if (!username) {
      console.log(`Skipping ${userDoc.id}: profile has no username.`);
      continue;
    }
    const email = `${username}@${AUTH_EMAIL_DOMAIN}`;

    let exists = true;
    try {
      await auth.getUser(userDoc.id);
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") throw err;
      exists = false;
    }

    console.log(`\n${profile.name} (@${username}, ${profile.role})${exists ? " - already has a login, this resets the password" : ""}`);
    const password = await askHidden("  New password (min. 6 characters, Enter to skip): ");
    if (!password) {
      console.log("  Skipped.");
      continue;
    }
    if (password.length < 6) {
      console.log("  Too short, skipped. Run again with --only " + username + " to retry.");
      continue;
    }
    const confirm = await askHidden("  Repeat the password: ");
    if (confirm !== password) {
      console.log("  Passwords did not match, skipped. Run again with --only " + username + " to retry.");
      continue;
    }

    if (exists) {
      await auth.updateUser(userDoc.id, { email, password, displayName: profile.name });
    } else {
      await auth.createUser({ uid: userDoc.id, email, password, displayName: profile.name });
    }
    await userDoc.ref.update({ password: FieldValue.delete(), updatedAt: new Date().toISOString() });
    console.log(`  ✓ Login ready for @${username}`);
  }

  console.log("\nDone.");
}

main()
  .then(() => {
    rl.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed:", err.message || err);
    process.exit(1);
  });
