# Deploying the Cloud Functions security hardening

This branch (`security/cloud-functions-hardening`) moves three things off the
client and behind server-side Cloud Functions:

1. **Tester login** - the client no longer derives/guesses credentials; it
   calls `testerLogin`, which derives a uid from a secret salt only the
   server holds, and returns a Firebase custom auth token.
2. **AI plan generation** - the Gemini API key is no longer shipped to the
   client; `enhanceTrainingPlan` proxies the call server-side and enforces
   the free-tier quota there instead of client-side.
3. **Subscription tier changes** - `setSimulatedSubscriptionTier` is now the
   only way a tier gets written; Firestore rules block clients from writing
   `subscriptionTier`, `aiGensCount`, or `isActive` directly.

None of this is deployed yet - I don't have authenticated access to your
Firebase CLI/project from this environment, so the steps below need to be
run by you. `main` is untouched and still works exactly as before; nothing
here affects it until you merge.

## 1. Confirm the project is on the Blaze (pay-as-you-go) plan

Cloud Functions require Blaze. Spark (the free plan) can't deploy them.
Check/upgrade at: https://console.firebase.google.com/project/com-example-coachcore-16e8b/usage/details

Blaze still has a generous free tier underneath it (2M function invocations/month,
etc.) - for friends-and-family testing volumes this should cost close to $0,
but it does require a billing method on file.

## 2. Authenticate the Firebase CLI

```bash
firebase login
```

This opens a browser for you to sign in with the Google account that owns
the `com-example-coachcore-16e8b` project.

## 3. Install function dependencies

```bash
cd functions
npm install
cd ..
```

## 4. Set the two secrets the functions need

```bash
firebase functions:secrets:set TESTER_AUTH_SALT
firebase functions:secrets:set GEMINI_API_KEY
```

Each command prompts you to paste a value:
- `TESTER_AUTH_SALT`: any long random string (e.g. generate one with
  `openssl rand -hex 32`). This replaces the hardcoded salt that used to
  ship in the client bundle - keep it secret, and don't reuse the old one
  (it's already public, since it shipped in prior builds).
- `GEMINI_API_KEY`: your Gemini API key. **Use a newly rotated key here**,
  not the one currently in `.env` - that one has been exposed in the client
  bundle and in git history and should be treated as compromised.

## 5. Deploy the Firestore rules and the functions

```bash
firebase deploy --only firestore:rules,functions
```

Watch the output - if `firestore.rules` has a syntax error, the deploy will
fail loudly and nothing will change on the live project. I wrote the rules
carefully but couldn't run them against a live emulator in this environment
(no Java available for the Firestore emulator), so this deploy is the first
real syntax check.

## 6. (Optional but recommended) Test locally first with emulators

Before deploying, you can run everything locally:

```bash
firebase emulators:start
```

Then in a separate terminal, run the app pointed at the emulators:

```bash
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

(or add `VITE_USE_FIREBASE_EMULATOR=true` to `.env`). This connects Auth and
Functions to your local emulator suite instead of production, so you can
test tester login, AI generation, and subscription changes without touching
real data or costing anything. The emulator UI is at http://localhost:4000.

Note: Firestore reads/writes from the client still go straight to production
even in this mode (only Auth and Functions are redirected) - so this is
mainly useful for testing the Cloud Function logic itself, not full offline
testing.

## 7. After deploying: clean up the exposed Gemini key

- Remove `VITE_GEMINI_API_KEY` from `.env` (and wherever it's set in Vercel/
  Firebase Hosting env config, if anywhere) - the client no longer needs it.
- Rotate/delete the old key in Google AI Studio if you haven't already.

## 8. Merge to main

Once deployed and smoke-tested, merge this branch into `main` and push. Until
then, keep testing on `main` as normal - it doesn't call any of these
functions and isn't affected by this work.

## What this does NOT do yet

- **Real payments.** `setSimulatedSubscriptionTier` still lets a signed-in
  user set their own tier for free - it's still a simulation, just now
  routed through one controlled place instead of a direct client write.
  Swapping in real Google Play Billing verification is a separate, later
  step (Phase 3) that replaces this function's body without changing how
  the client calls it.
- **Rate limiting / abuse protection** on the functions themselves beyond
  what the free-tier quota check provides. Consider Firebase App Check
  before a public launch to make sure only your real app can call these
  functions.
