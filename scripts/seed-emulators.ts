// Seeds the local Firebase emulators (npm run emulators) with test logins and a little store data.
// LOCAL ONLY: refuses to run unless the emulator hosts are set.
//
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//     npx tsx scripts/seed-emulators.ts
//
// Test logins (emulator only), all with password "teste123":
//   adm (ADMIN), jefb32 (MANAGER_BEBELU_MOSSORO), patriciab28 (MANAGER_BEBELU_RIOMAR_PAPICU)
import fs from "fs";
import path from "path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const AUTH_EMAIL_DOMAIN = "grupoazevedo.app"; // keep in sync with src/lib/firebase.ts
const TEST_PASSWORD = "teste123";

const PEOPLE = [
  { uid: "root-admin", name: "Admin Geral Grupo AZ", username: "adm", role: "ADMIN" },
  { uid: "jef-mossoro", name: "Jefferson - Bebelu Mossoró", username: "jefb32", role: "MANAGER_BEBELU_MOSSORO" },
  { uid: "patricia-b28", name: "Patrícia - Bebelu Papicu", username: "patriciab28", role: "MANAGER_BEBELU_RIOMAR_PAPICU" },
];

async function main() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Set FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST: this script only seeds local emulators.");
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const app = initializeApp({ projectId: firebaseConfig.projectId });
  const auth = getAuth(app);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  for (const p of PEOPLE) {
    await auth.deleteUser(p.uid).catch(() => {});
    await auth.createUser({ uid: p.uid, email: `${p.username}@${AUTH_EMAIL_DOMAIN}`, password: TEST_PASSWORD, displayName: p.name });
    await db.collection("users").doc(p.uid).set({ name: p.name, username: p.username, role: p.role });
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const [storeId, label] of [["1", "B32"], ["2", "B28"]]) {
    await db.collection("stores").doc(storeId).collection("accounts_payable").doc("all").set({
      data: [{ id: `${label}-1`, storeId, description: `Fornecedor ${label}`, value: 100, dueDate: today, status: "Pendente" }],
    });
  }

  console.log(`Seeded ${PEOPLE.length} logins (password: ${TEST_PASSWORD}) and sample accounts payable.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
