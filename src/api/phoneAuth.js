// SMS verification through Firebase Phone Auth. Firebase sends the SMS and
// checks the code; we then hand the Firebase ID token to our API, which marks
// the member's mobile verified. Firebase is loaded only when needed.
import api from "./client";

// Public web config for the "sage-matrimony" Firebase project (not a secret).
const firebaseConfig = {
  apiKey: "AIzaSyDthhQVff5__m_LZ_qd5Sog1tnp7KyHUI4",
  authDomain: "sage-matrimony.firebaseapp.com",
  projectId: "sage-matrimony",
  storageBucket: "sage-matrimony.firebasestorage.app",
  messagingSenderId: "29544601649",
  appId: "1:29544601649:web:95c62cb77c35dcb1a81d10",
};

let loaded;
function loadFirebase() {
  if (!loaded) {
    loaded = Promise.all([import("firebase/app"), import("firebase/auth")]).then(([appMod, authMod]) => {
      const app = appMod.getApps()[0] || appMod.initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      auth.useDeviceLanguage();
      // Automated tests in dev only: skip reCAPTCHA. Firebase allows this just
      // for the fictional test numbers set in the console, never real ones.
      if (import.meta.env.DEV && localStorage.getItem("firebase_test_mode") === "1") {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      return { auth, authMod };
    });
  }
  return loaded;
}

/** Members who registered before country codes were stored as 10 Indian digits. */
export function toE164(mobile) {
  const raw = String(mobile || "").trim();
  if (raw.startsWith("+")) return raw.replace(/[^\d+]/g, "");
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

let verifier = null;
let holder = null;

/** Sends the SMS. Returns a confirmation to pass to confirmPhoneCode. */
export async function sendPhoneCode(mobile) {
  const { auth, authMod } = await loadFirebase();
  // A fresh invisible reCAPTCHA each time: Firebase needs one per attempt.
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      /* already gone */
    }
  }
  holder?.remove();
  holder = document.createElement("div");
  holder.style.display = "none";
  document.body.appendChild(holder);
  verifier = new authMod.RecaptchaVerifier(auth, holder, { size: "invisible" });
  return authMod.signInWithPhoneNumber(auth, toE164(mobile), verifier);
}

/** Checks the code with Firebase and marks the mobile verified on our API. */
export async function confirmPhoneCode(confirmation, code) {
  const { auth, authMod } = await loadFirebase();
  const cred = await confirmation.confirm(code);
  const idToken = await cred.user.getIdToken();
  try {
    const { data } = await api.post("/auth/otp/firebase/", { id_token: idToken });
    return data;
  } finally {
    authMod.signOut(auth).catch(() => {});
  }
}

const MESSAGES = {
  "auth/invalid-verification-code": "That code is not correct.",
  "auth/code-expired": "This code has expired. Request a new one.",
  "auth/invalid-phone-number": "The mobile number on your account is not valid. Update it and try again.",
  "auth/missing-phone-number": "Add a mobile number to your account first.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/quota-exceeded": "SMS limit reached for today. Please try again later.",
  "auth/captcha-check-failed": "Security check failed. Refresh the page and try again.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/operation-not-allowed": "SMS to this country is not enabled yet.",
};

export function phoneAuthError(err, fallback) {
  const code = err?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return err?.response?.data?.detail || fallback;
}
