// Who receives financial pushes. The role comes from users/{uid} (trusted), never from the
// subscription document, which the device itself writes.
import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

const FINANCE_ROLES = new Set(["ADMIN", "FINANCIAL"]);

/** Push subscriptions of admin/finance profiles only (the payable report shows every store). */
export async function financeSubscriptions(db: Firestore): Promise<QueryDocumentSnapshot[]> {
  const subs = await db.collection("push_subscriptions").get();
  const uids = [...new Set(subs.docs.map((d) => d.get("uid")).filter((u): u is string => typeof u === "string" && u.length > 0))];
  if (uids.length === 0) return [];
  const profiles = await db.getAll(...uids.map((uid) => db.collection("users").doc(uid)));
  const roles = new Map(profiles.map((p) => [p.id, String(p.get("role") || "")]));
  return subs.docs.filter((d) => FINANCE_ROLES.has(roles.get(d.get("uid")) || ""));
}
