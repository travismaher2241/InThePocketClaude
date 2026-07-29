const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const TESTER_AUTH_SALT = defineSecret("TESTER_AUTH_SALT");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALLOWED_TIERS = ["free", "pro", "ultra", "ultra club"];

// Same rolling hash used client-side previously, but now paired with a secret
// that never leaves this server - the client can no longer recompute another
// tester's uid, which is the whole point of moving this here.
function stableHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Exchanges a tester nickname for a Firebase custom auth token.
 * Replaces the old client-side deterministic-credential-guessing scheme:
 * the uid is derived from a secret salt that only this function holds, so a
 * client reading the bundled JS can no longer compute another tester's uid.
 */
exports.testerLogin = onCall({ secrets: [TESTER_AUTH_SALT] }, async (request) => {
  const rawCode = (request.data && request.data.code) || "";
  const code = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

  if (!code || code.length < 3) {
    throw new HttpsError(
      "invalid-argument",
      "Tester codes must be at least 3 characters (letters, numbers, hyphens, underscores only)."
    );
  }

  const salt = TESTER_AUTH_SALT.value();
  const uid = `tester_${stableHash(`${salt}::${code}`)}`;

  try {
    await admin.auth().getUser(uid);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      await admin.auth().createUser({
        uid,
        displayName: code,
        // Not a real inbox - tester accounts have no email/password login path.
        email: `${uid}@tester.inthepocket.internal`,
        emailVerified: false
      });
      logger.info("Created new tester sandbox account", { uid });
    } else {
      logger.error("testerLogin: failed to look up user", err);
      throw new HttpsError("internal", "Could not verify tester account.");
    }
  }

  const token = await admin.auth().createCustomToken(uid, { tester: true, testerCode: code });
  return { token };
});

/**
 * Proxies AI-assisted training-plan cue refinement through Gemini, so the API
 * key never ships to the client. Enforces the free-tier generation quota
 * server-side (the client-side version of this check was purely cosmetic -
 * nothing stopped a client from calling Gemini directly with the exposed key).
 */
exports.enhanceTrainingPlan = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const promptText = request.data && request.data.promptText;
  if (!promptText || typeof promptText !== "string") {
    throw new HttpsError("invalid-argument", "promptText is required.");
  }
  if (promptText.length > 20000) {
    throw new HttpsError("invalid-argument", "promptText is too long.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const profile = userSnap.exists
    ? userSnap.data()
    : { subscriptionTier: "free", isActive: true, aiGensCount: 0 };

  if (!profile.isActive) {
    throw new HttpsError("permission-denied", "Inactive user profile.");
  }

  const tier = (profile.subscriptionTier || "free").toLowerCase();
  const isFreeTier = tier === "free" || tier === "default";
  if (isFreeTier && (profile.aiGensCount || 0) >= 2) {
    throw new HttpsError(
      "resource-exhausted",
      "Free tier is limited to 2 AI generations. Upgrade to continue."
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY.value()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    logger.warn("Gemini API error", { status: response.status, bodyText });
    throw new HttpsError("internal", `Gemini API returned status ${response.status}`);
  }

  const data = await response.json();

  if (isFreeTier) {
    await userRef.set(
      { aiGensCount: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
  }

  return data;
});

/**
 * Sets the caller's own subscription tier. This is still a *simulation* for
 * the current testing phase (no payment is verified) - but routing it through
 * a function means the Firestore rule can block direct client writes to
 * subscriptionTier/aiGensCount/isActive, so "upgrading" always goes through
 * one controlled place. Swap this function's body for real Play Billing
 * receipt verification later without changing how the client calls it.
 */
exports.setSimulatedSubscriptionTier = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const tier = ((request.data && request.data.tier) || "").toLowerCase();
  if (!ALLOWED_TIERS.includes(tier)) {
    throw new HttpsError("invalid-argument", `tier must be one of: ${ALLOWED_TIERS.join(", ")}`);
  }

  await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .set({ subscriptionTier: tier, isActive: true }, { merge: true });

  return { success: true, tier };
});
