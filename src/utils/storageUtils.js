/**
 * Safely parses a JSON string from storage or returns a fallback value.
 * @template T
 * @param {string|null} jsonString 
 * @param {T} fallbackValue 
 * @param {(val: any) => boolean} [validator] 
 * @returns {T}
 */
export function safeJsonParse(jsonString, fallbackValue = null, validator = null) {
  if (jsonString === null || jsonString === undefined || jsonString === '') {
    return fallbackValue;
  }
  try {
    const parsed = JSON.parse(jsonString);
    if (validator && typeof validator === 'function') {
      return validator(parsed) ? parsed : fallbackValue;
    }
    return parsed !== null && parsed !== undefined ? parsed : fallbackValue;
  } catch (err) {
    console.warn("safeJsonParse fallback triggered due to corrupt JSON:", err);
    return fallbackValue;
  }
}

/**
 * Returns a storage key scoped to the authenticated user ID or identifier.
 * @param {string} baseKey 
 * @param {string} [uidOrIdentifier] 
 * @returns {string}
 */
export function getScopedKey(baseKey, uidOrIdentifier) {
  const identifier = uidOrIdentifier || 'guest';
  const cleanId = identifier.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${baseKey}_${cleanId}`;
}

/**
 * Safely migrates an existing unscoped localStorage key to a user-scoped key if the scoped key does not yet exist.
 * @param {string} baseKey 
 * @param {string} [uidOrIdentifier] 
 */
export function migrateUnscopedKey(baseKey, uidOrIdentifier) {
  if (!uidOrIdentifier) return;
  const scopedKey = getScopedKey(baseKey, uidOrIdentifier);
  const existingScoped = localStorage.getItem(scopedKey);
  if (!existingScoped) {
    const unscopedVal = localStorage.getItem(baseKey);
    if (unscopedVal !== null && unscopedVal !== undefined) {
      localStorage.setItem(scopedKey, unscopedVal);
    }
  }
}
