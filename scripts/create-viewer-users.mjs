import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

const password = "123456789";

const callCenters = [
  {
    id: "wns",
    name: "WNS",
    email: "wns@wns.com"
  },
  {
    id: "teleperformance",
    name: "Teleperformance",
    email: "teleperformance@teleperformance.com"
  },
  {
    id: "buwelo-colombia",
    name: "Buwelo Colombia",
    email: "buwelo.colombia@buwelo.com"
  },
  {
    id: "buwelo-ghana",
    name: "Buwelo Ghana",
    email: "buwelo.ghana@buwelo.com"
  },
  {
    id: "concentrix",
    name: "Concentrix",
    email: "concentrix@concentrix.com"
  },
  {
    id: "telus",
    name: "Telus",
    email: "telus@telus.com"
  }
];

async function upsertViewer(center) {
  await db.collection("callCenters").doc(center.id).set({
    id: center.id,
    name: center.name,
    active: true,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  let user;

  try {
    user = await auth.getUserByEmail(center.email);

    await auth.updateUser(user.uid, {
      password,
      displayName: `${center.name} Viewer`,
      emailVerified: true,
      disabled: false
    });

    console.log(`Updated viewer: ${center.email} -> ${user.uid}`);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    user = await auth.createUser({
      email: center.email,
      password,
      displayName: `${center.name} Viewer`,
      emailVerified: true,
      disabled: false
    });

    console.log(`Created viewer: ${center.email} -> ${user.uid}`);
  }

  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    name: `${center.name} Viewer`,
    email: center.email,
    role: "viewer",
    callCenterId: center.id,
    callCenterName: center.name,
    active: true,
    loginCount: 0,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await db.collection("auditLogs").add({
    actionType: "user_created",
    userId: "viewer-cli",
    userName: "Viewer CLI",
    userEmail: "viewer-cli",
    userRole: "superAdmin",
    callCenterId: center.id,
    callCenterName: center.name,
    affectedRecordId: user.uid,
    description: `Viewer user created/updated for ${center.name}.`,
    newValue: {
      email: center.email,
      role: "viewer",
      callCenterId: center.id,
      callCenterName: center.name,
      active: true
    },
    createdAt: FieldValue.serverTimestamp()
  });
}

for (const center of callCenters) {
  await upsertViewer(center);
}

console.log("");
console.log("VIEWER USERS READY");
console.log("--------------------------------");

for (const center of callCenters) {
  console.log(`${center.name}: ${center.email} / ${password}`);
}

console.log("");
process.exit(0);
