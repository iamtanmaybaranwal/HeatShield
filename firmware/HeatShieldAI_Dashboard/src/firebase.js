// firebase.js
// -----------
// Initializes the Firebase Admin SDK once and exports the Firestore handle
// used everywhere else in the backend. Runs server-side only (this file is
// never sent to the browser) so the service account key never leaves this
// machine -- the dashboard frontend only ever talks to our own Express API,
// never to Firestore directly.

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.resolve(
  process.cwd(),
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Firebase service account key not found at "${serviceAccountPath}".\n` +
      "Download it from Firebase Console > Project settings > Service accounts > " +
      "Generate new private key, save it into this folder, and set " +
      "FIREBASE_SERVICE_ACCOUNT_PATH in .env if you named it differently. " +
      "See README.md for the full setup steps."
  );
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

module.exports = { admin, db };
