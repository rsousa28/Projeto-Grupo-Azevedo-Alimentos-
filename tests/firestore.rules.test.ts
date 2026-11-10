// Firestore security rules tests. Run with: npm run test:rules (starts the Firestore emulator)
import fs from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const PROFILES: Record<string, { name: string; username: string; role: string }> = {
  admin: { name: "Admin", username: "adm", role: "ADMIN" },
  b32: { name: "Gerente B32", username: "jefb32", role: "MANAGER_BEBELU_MOSSORO" },
  b28: { name: "Gerente B28", username: "patriciab28", role: "MANAGER_BEBELU_RIOMAR_PAPICU" },
  fin: { name: "Financeiro", username: "fin", role: "FINANCIAL" },
};

// A person logged in with username/password
function as(uid: string) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: "password" } } as any).firestore();
}

function auditLog(overrides: Record<string, string> = {}) {
  return {
    userId: "anonymous",
    userName: "someone",
    userRole: "NONE",
    action: "LOGIN_FAILED",
    description: "Tentativa de login malsucedida",
    timestamp: new Date().toISOString(),
    userAgent: "test",
    ...overrides,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-rules-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, profile] of Object.entries(PROFILES)) {
      await setDoc(doc(db, "users", uid), profile);
    }
    for (const id of ["1", "2", "3", "admin-global"]) {
      await setDoc(doc(db, "stores", id, "accounts_payable", "all"), { data: [] });
    }
    await setDoc(doc(db, "backups", "b1"), { createdAt: "x" });
  });
});

describe("not logged in", () => {
  it("cannot read store data, users or audit logs", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "stores", "1", "accounts_payable", "all")));
    await assertFails(getDocs(collection(db, "users")));
    await assertFails(getDoc(doc(db, "users", "admin")));
    await assertFails(getDocs(collection(db, "audit_logs")));
  });

  it("cannot write store data or create users", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "stores", "1", "accounts_payable", "all"), { data: ["x"] }));
    await assertFails(setDoc(doc(db, "users", "hacker"), { name: "h", username: "h", role: "ADMIN" }));
  });

  it("can record a failed login, and nothing else in the audit log", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(addDoc(collection(db, "audit_logs"), auditLog()));
    await assertFails(addDoc(collection(db, "audit_logs"), auditLog({ action: "LOGIN_SUCCESS" })));
    await assertFails(addDoc(collection(db, "audit_logs"), auditLog({ userId: "admin" })));
  });

  it("anonymous Firebase sessions get no access", async () => {
    const db = env.authenticatedContext("anon", { firebase: { sign_in_provider: "anonymous" } } as any).firestore();
    await assertFails(getDoc(doc(db, "stores", "1", "accounts_payable", "all")));
  });

  it("a password account with no profile gets no access", async () => {
    const db = as("stranger");
    await assertFails(getDoc(doc(db, "stores", "1", "accounts_payable", "all")));
    await assertFails(setDoc(doc(db, "push_subscriptions", "x"), { a: 1 }));
    await assertFails(setDoc(doc(db, "users", "stranger"), { name: "s", username: "s", role: "ADMIN" }));
  });
});

describe("admin", () => {
  it("reads and writes every store, including admin-global", async () => {
    const db = as("admin");
    for (const id of ["1", "2", "3", "admin-global"]) {
      await assertSucceeds(getDoc(doc(db, "stores", id, "accounts_payable", "all")));
      await assertSucceeds(setDoc(doc(db, "stores", id, "accounts_payable", "all"), { data: [1] }));
    }
  });

  it("manages users, backups and audit logs", async () => {
    const db = as("admin");
    await assertSucceeds(getDocs(collection(db, "users")));
    await assertSucceeds(setDoc(doc(db, "users", "newperson"), { name: "N", username: "n", role: "FINANCIAL" }));
    await assertSucceeds(updateDoc(doc(db, "users", "b32"), { name: "Renamed" }));
    await assertSucceeds(deleteDoc(doc(db, "users", "b28")));
    await assertSucceeds(getDocs(collection(db, "backups")));
    await assertSucceeds(getDocs(collection(db, "audit_logs")));
  });

  it("cannot store a password in a profile", async () => {
    const db = as("admin");
    await assertFails(setDoc(doc(db, "users", "p"), { name: "P", username: "p", role: "MANAGER", password: "x" }));
  });

  it("cannot delete their own profile", async () => {
    await assertFails(deleteDoc(doc(as("admin"), "users", "admin")));
  });
});

describe("store manager (B32)", () => {
  it("reads and writes only their own store", async () => {
    const db = as("b32");
    await assertSucceeds(getDoc(doc(db, "stores", "1", "accounts_payable", "all")));
    await assertSucceeds(setDoc(doc(db, "stores", "1", "daily_control", "p1"), { ok: true }));
    await assertFails(getDoc(doc(db, "stores", "2", "accounts_payable", "all")));
    await assertFails(setDoc(doc(db, "stores", "2", "daily_control", "p1"), { ok: true }));
    await assertFails(getDoc(doc(db, "stores", "admin-global", "accounts_payable", "all")));
  });

  it("reads only their own profile and cannot list users", async () => {
    const db = as("b32");
    await assertSucceeds(getDoc(doc(db, "users", "b32")));
    await assertFails(getDoc(doc(db, "users", "admin")));
    await assertFails(getDocs(collection(db, "users")));
  });

  it("can toggle their own biometric setting but not change their role", async () => {
    const db = as("b32");
    await assertSucceeds(setDoc(doc(db, "users", "b32"), { biometricEnabled: true, updatedAt: "now" }, { merge: true }));
    await assertFails(updateDoc(doc(db, "users", "b32"), { role: "ADMIN" }));
    await assertFails(updateDoc(doc(db, "users", "b28"), { biometricEnabled: true }));
  });

  it("cannot reach backups or the audit log, but can write their own audit entries", async () => {
    const db = as("b32");
    await assertFails(getDocs(collection(db, "backups")));
    await assertFails(getDocs(collection(db, "audit_logs")));
    await assertSucceeds(addDoc(collection(db, "audit_logs"), auditLog({ userId: "b32", action: "LOGIN_SUCCESS" })));
  });

  it("can register push subscriptions and read notifications", async () => {
    const db = as("b32");
    await assertSucceeds(setDoc(doc(db, "push_subscriptions", "dev1"), { subscription: { endpoint: "x" } }));
    await assertSucceeds(getDocs(collection(db, "global_notifications")));
  });
});

describe("financial", () => {
  it("reaches the three stores but not admin-global", async () => {
    const db = as("fin");
    for (const id of ["1", "2", "3"]) {
      await assertSucceeds(getDoc(doc(db, "stores", id, "accounts_payable", "all")));
    }
    await assertFails(getDoc(doc(db, "stores", "admin-global", "accounts_payable", "all")));
  });
});
