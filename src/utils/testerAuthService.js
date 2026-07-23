/**
 * Tester Access Authentication & Structured Error Service
 * Handles code validation, deterministic virtual auth, fallback legacy auth,
 * structured error classification, diagnostic logging, and retry handling.
 */

import { auth } from '../firebaseConfig.js';
import { updatePassword } from 'firebase/auth';

export const TESTER_ERROR_CATALOG = {
  EMPTY_CODE: {
    errorCode: 'EMPTY_CODE',
    title: 'Enter a tester code',
    userMessage: 'Enter the tester nickname or code you used to create your tester room.',
    reassurance: '',
    retryable: false,
    focusField: true,
    actions: [{ label: 'Return to Field', type: 'focus_field' }]
  },

  INVALID_CODE_FORMAT: {
    errorCode: 'INVALID_CODE_FORMAT',
    title: 'That code isn’t valid',
    userMessage: 'Tester codes can only contain letters, numbers, hyphens or underscores, and must be at least 3 characters long.',
    reassurance: '',
    retryable: false,
    focusField: true,
    actions: [{ label: 'Edit Code', type: 'focus_field' }]
  },

  NEW_SANDBOX_CREATION_FAILED: {
    errorCode: 'NEW_SANDBOX_CREATION_FAILED',
    title: 'Tester room couldn’t be created',
    userMessage: 'Your code is available, but we couldn’t create the tester room. No room was saved. Please try again.',
    reassurance: '',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Use Another Code', type: 'clear_code' }
    ]
  },

  EXISTING_SANDBOX_NOT_FOUND: {
    errorCode: 'EXISTING_SANDBOX_NOT_FOUND',
    title: 'Tester room not found',
    userMessage: 'We couldn’t find a tester room registered to this code. Check the spelling or create a new tester room using this code.',
    reassurance: '',
    retryable: false,
    focusField: true,
    actions: [
      { label: 'Check Code', type: 'focus_field' },
      { label: 'Create New Tester Room', type: 'create_new' }
    ]
  },

  SANDBOX_RECORD_MISSING_OR_DAMAGED: {
    errorCode: 'SANDBOX_RECORD_MISSING_OR_DAMAGED',
    title: 'Tester room data could not be loaded',
    userMessage: 'We found the registered tester code, but its saved tester room data is missing or incomplete.',
    reassurance: 'Your tester code is registered.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  TESTER_ROOM_DISABLED: {
    errorCode: 'TESTER_ROOM_DISABLED',
    title: 'Tester room is disabled',
    userMessage: 'This tester room has been disabled and cannot currently be accessed.',
    reassurance: 'Your tester code is recognized.',
    retryable: false,
    focusField: false,
    actions: [
      { label: 'Use Another Code', type: 'clear_code' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  TESTER_ACCESS_EXPIRED: {
    errorCode: 'TESTER_ACCESS_EXPIRED',
    title: 'Tester access has expired',
    userMessage: 'This tester room’s access period has ended.',
    reassurance: 'Your tester code is recognized.',
    retryable: false,
    focusField: false,
    actions: [
      { label: 'Use Another Code', type: 'clear_code' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  SESSION_CREATION_FAILED: {
    errorCode: 'SESSION_CREATION_FAILED',
    title: 'Login session couldn’t be started',
    userMessage: 'We found your tester room, but the app could not create a secure login session. Your tester code is valid and your saved room has not been deleted.',
    reassurance: 'Your tester code is valid. Your saved tester room has not been deleted.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  PERMISSION_OR_SECURITY_FAILURE: {
    errorCode: 'PERMISSION_OR_SECURITY_FAILURE',
    title: 'Tester room access was refused',
    userMessage: 'The tester room exists, but the server did not authorise this login attempt.',
    reassurance: 'Your tester room exists.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  NETWORK_OFFLINE: {
    errorCode: 'NETWORK_OFFLINE',
    title: 'No internet connection',
    userMessage: 'Your tester code could not be checked because this device appears to be offline. Reconnect to the internet and try again.',
    reassurance: '',
    retryable: true,
    focusField: false,
    actions: [{ label: 'Try Again', type: 'retry' }]
  },

  REQUEST_TIMEOUT: {
    errorCode: 'REQUEST_TIMEOUT',
    title: 'The server took too long to respond',
    userMessage: 'Your tester room may still be available, but the login request timed out before it could be completed.',
    reassurance: 'Your tester room may still be available.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Cancel', type: 'dismiss' }
    ]
  },

  SERVER_UNAVAILABLE: {
    errorCode: 'SERVER_UNAVAILABLE',
    title: 'Tester access is temporarily unavailable',
    userMessage: 'The Tester Access service is not responding. Your tester code and saved room have not been changed.',
    reassurance: 'Your tester code and saved room have not been changed.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ]
  },

  LOCAL_SESSION_STORAGE_FAILED: {
    errorCode: 'LOCAL_SESSION_STORAGE_FAILED',
    title: 'Login could not be saved on this device',
    userMessage: 'The tester room was found, but the login session could not be stored on this device. Check that browser storage is enabled and try again.',
    reassurance: 'The tester room was found.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Help', type: 'support' }
    ]
  },

  APPLICATION_DATA_LOAD_FAILED: {
    errorCode: 'APPLICATION_DATA_LOAD_FAILED',
    title: 'Tester room opened, but its data didn’t load',
    userMessage: 'Your login succeeded, but the tester room data could not be loaded.',
    reassurance: 'Your login succeeded.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Reload Tester Room', type: 'retry' },
      { label: 'Sign Out', type: 'sign_out' }
    ]
  },

  UNEXPECTED_ERROR: {
    errorCode: 'UNEXPECTED_ERROR',
    title: 'Tester login failed unexpectedly',
    userMessage: 'We couldn’t complete the tester login. Your tester code and saved room have not been changed.',
    reassurance: 'Your tester code and saved room have not been changed.',
    retryable: true,
    focusField: false,
    actions: [
      { label: 'Try Again', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ]
  }
};

export function generateRequestId() {
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `REQ-${hex}-${Date.now().toString().slice(-5)}`;
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

export function createStructuredError(errorCode, overrides = {}) {
  const base = TESTER_ERROR_CATALOG[errorCode] || TESTER_ERROR_CATALOG.UNEXPECTED_ERROR;
  const requestId = overrides.requestId || generateRequestId();

  return {
    success: false,
    errorCode: base.errorCode,
    title: overrides.title || base.title,
    userMessage: overrides.userMessage || base.userMessage,
    reassurance: overrides.reassurance || base.reassurance,
    retryable: overrides.retryable !== undefined ? overrides.retryable : base.retryable,
    focusField: overrides.focusField !== undefined ? overrides.focusField : base.focusField,
    actions: overrides.actions || base.actions,
    requestId: requestId,
    timestamp: new Date().toISOString()
  };
}

export function classifyAuthError(err, stage = 'unknown') {
  if (err && typeof err === 'object' && err.errorCode && err.userMessage) {
    return err;
  }

  const codeKey = typeof err === 'string' ? err : err?.errorCode;
  if (codeKey && TESTER_ERROR_CATALOG[codeKey]) {
    return createStructuredError(codeKey);
  }

  const requestId = generateRequestId();
  const msg = (err?.message || err?.code || String(err || '')).toLowerCase();
  const code = (err?.code || '').toLowerCase();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return createStructuredError('NETWORK_OFFLINE', { requestId });
  }

  if (msg.includes('timeout') || code.includes('timeout')) {
    return createStructuredError('REQUEST_TIMEOUT', { requestId });
  }

  if (code === 'auth/user-disabled') {
    return createStructuredError('TESTER_ROOM_DISABLED', { requestId });
  }

  if (code === 'auth/network-request-failed' || msg.includes('network') || msg.includes('failed to fetch')) {
    return createStructuredError('SERVER_UNAVAILABLE', { requestId });
  }

  if (code === 'auth/too-many-requests' || code === 'auth/operation-not-allowed') {
    return createStructuredError('PERMISSION_OR_SECURITY_FAILURE', { requestId });
  }

  if (code === 'auth/email-already-in-use') {
    return createStructuredError('SESSION_CREATION_FAILED', { requestId });
  }

  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    if (stage === 'login') {
      return createStructuredError('SESSION_CREATION_FAILED', { requestId });
    }
  }

  if (stage === 'session_storage') {
    return createStructuredError('LOCAL_SESSION_STORAGE_FAILED', { requestId });
  }

  if (stage === 'data_load') {
    return createStructuredError('APPLICATION_DATA_LOAD_FAILED', { requestId });
  }

  if (stage === 'create_sandbox') {
    return createStructuredError('NEW_SANDBOX_CREATION_FAILED', { requestId });
  }

  return createStructuredError('UNEXPECTED_ERROR', { requestId });
}

function computeHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function deriveVirtualCredentials(testerCode) {
  const sanitizedCode = testerCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const virtualEmail = `${sanitizedCode}@tester.inthepocket.com.au`;
  
  // 1. Primary Salt (v2 deterministic salt across all devices)
  const primarySeedStr = `ITP_TESTER_V2_DETERMINISTIC_SALT_${sanitizedCode}_${sanitizedCode.length}`;
  const primaryHash = computeHash(primarySeedStr);
  const primaryPassword = `ItpTester#${primaryHash}${sanitizedCode.length}!v2`;

  // Candidate Emails to test
  const candidateEmails = [
    virtualEmail,
    `${sanitizedCode}@coachcore.test`,
    `coach_${sanitizedCode}@tester.inthepocket.com.au`
  ];

  // Candidate Passwords to test
  const candidatePasswords = [
    primaryPassword,
    'InThePocketTesterAccess2026!', // Static legacy password used in commit 762f8ad
    `ItpTester#${computeHash(`ITP_TESTER_${sanitizedCode}`)}${sanitizedCode.length}!`, // Pre-v2 unsalted formula
  ];

  // If local device salt exists, include device-salted candidate
  const deviceSalt = typeof localStorage !== 'undefined' ? localStorage.getItem('inthepocket_device_salt') : null;
  if (deviceSalt) {
    candidatePasswords.push(`ItpTester#${computeHash(`ITP_TESTER_${sanitizedCode}_${deviceSalt}`)}${sanitizedCode.length}!`);
  }

  // Additional legacy candidate patterns
  candidatePasswords.push(`ItpTester#${computeHash(sanitizedCode)}${sanitizedCode.length}!`);
  candidatePasswords.push(`ItpTester#${sanitizedCode}!`);
  candidatePasswords.push(`ItpTester#${sanitizedCode}123!`);

  return {
    sanitizedCode,
    virtualEmail,
    primaryPassword,
    candidateEmails,
    candidatePasswords: Array.from(new Set(candidatePasswords))
  };
}

export function logTesterDiagnostic(payload) {
  try {
    const logsKey = 'inthepocket_tester_diagnostics';
    const existing = JSON.parse(localStorage.getItem(logsKey) || '[]');
    const entry = {
      timestamp: payload.timestamp || new Date().toISOString(),
      stage: payload.stage,
      safeTesterId: payload.safeTesterId,
      errorCode: payload.errorCode || 'NONE',
      requestId: payload.requestId,
      success: !!payload.success,
      details: payload.details || ''
    };
    existing.push(entry);
    if (existing.length > 50) existing.shift();
    localStorage.setItem(logsKey, JSON.stringify(existing));
    console.log('[Tester Access Diagnostics]', entry);
  } catch {
    // Silent catch if logging blocked
  }
}

export async function authenticateTesterSession(testerCode, loginFn, signupFn) {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  // 1. Validate Code Input
  const trimmed = (testerCode || '').trim();
  if (!trimmed) {
    throw createStructuredError('EMPTY_CODE', { requestId });
  }

  const sanitized = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (sanitized.length < 3) {
    throw createStructuredError('INVALID_CODE_FORMAT', { requestId });
  }

  // 2. Network Connectivity Check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw createStructuredError('NETWORK_OFFLINE', { requestId });
  }

  const { virtualEmail, primaryPassword, candidateEmails, candidatePasswords } = deriveVirtualCredentials(sanitized);
  const safeTesterId = hashString(sanitized);

  logTesterDiagnostic({ timestamp, stage: 'auth_started', safeTesterId, requestId, success: true });

  const runWithTimeout = (fn, timeoutMs = 15000) => {
    return Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs))
    ]);
  };

  let loginSuccess = false;
  let matchedPassword = null;
  let matchedEmail = null;

  // 3. Exhaustive Candidate Login Search
  for (const emailCandidate of candidateEmails) {
    for (const passwordCandidate of candidatePasswords) {
      try {
        await runWithTimeout(() => loginFn(emailCandidate, passwordCandidate));
        loginSuccess = true;
        matchedPassword = passwordCandidate;
        matchedEmail = emailCandidate;
        logTesterDiagnostic({
          timestamp,
          stage: 'login_successful',
          safeTesterId,
          requestId,
          success: true,
          details: `Authenticated with candidate ${emailCandidate === virtualEmail ? 'primary' : 'variant'} email`
        });
        break;
      } catch (loginErr) {
        if (loginErr.message === 'REQUEST_TIMEOUT') {
          throw createStructuredError('REQUEST_TIMEOUT', { requestId });
        }
        const code = (loginErr?.code || '').toLowerCase();
        if (code === 'auth/network-request-failed') {
          throw createStructuredError('SERVER_UNAVAILABLE', { requestId });
        }
        if (code === 'auth/user-disabled') {
          throw createStructuredError('TESTER_ROOM_DISABLED', { requestId });
        }
        // Credentials mismatched for this specific candidate, continue searching candidates
      }
    }
    if (loginSuccess) break;
  }

  // 4. Automatic Password Migration to Deterministic v2 Salt
  if (loginSuccess) {
    if (matchedPassword !== primaryPassword && auth?.currentUser) {
      try {
        await updatePassword(auth.currentUser, primaryPassword);
        logTesterDiagnostic({
          timestamp,
          stage: 'identity_migrated',
          safeTesterId,
          requestId,
          success: true,
          details: 'Migrated legacy tester identity password to v2 deterministic credentials'
        });
      } catch (migErr) {
        console.warn('[Tester Access] Deferred password migration:', migErr?.message || migErr);
      }
    }
  } else {
    // 5. If No Candidates Succeeded: Idempotent Signup (New Tester Sandbox Creation)
    try {
      logTesterDiagnostic({ timestamp, stage: 'attempting_signup', safeTesterId, requestId, success: true });
      await runWithTimeout(() => signupFn(virtualEmail, primaryPassword));
      loginSuccess = true;
      logTesterDiagnostic({ timestamp, stage: 'sandbox_created', safeTesterId, requestId, success: true });
    } catch (signupErr) {
      if (signupErr.message === 'REQUEST_TIMEOUT') {
        throw createStructuredError('REQUEST_TIMEOUT', { requestId });
      }
      const code = (signupErr?.code || '').toLowerCase();
      if (code === 'auth/email-already-in-use') {
        // Room exists in auth database but candidate passwords failed to resolve identity
        logTesterDiagnostic({
          timestamp,
          stage: 'auth_signup_fail',
          safeTesterId,
          errorCode: 'SESSION_CREATION_FAILED',
          requestId,
          success: false
        });
        throw createStructuredError('SESSION_CREATION_FAILED', { requestId });
      } else if (code === 'auth/network-request-failed') {
        throw createStructuredError('SERVER_UNAVAILABLE', { requestId });
      } else {
        logTesterDiagnostic({
          timestamp,
          stage: 'auth_signup_fail',
          safeTesterId,
          errorCode: 'NEW_SANDBOX_CREATION_FAILED',
          requestId,
          success: false
        });
        throw createStructuredError('NEW_SANDBOX_CREATION_FAILED', { requestId });
      }
    }
  }

  // 6. Local Session Storage Verification
  try {
    const testKey = `inthepocket_storage_test_${Date.now()}`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
  } catch {
    logTesterDiagnostic({
      timestamp,
      stage: 'storage_check_failed',
      safeTesterId,
      errorCode: 'LOCAL_SESSION_STORAGE_FAILED',
      requestId,
      success: false
    });
    throw createStructuredError('LOCAL_SESSION_STORAGE_FAILED', { requestId });
  }

  // 7. Complete Log
  logTesterDiagnostic({
    timestamp,
    stage: 'session_complete',
    safeTesterId,
    errorCode: 'SUCCESS',
    requestId,
    success: true
  });

  return { success: true, requestId };
}

