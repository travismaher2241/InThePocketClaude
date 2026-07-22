import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB if needed in tests
if (typeof window !== 'undefined' && !window.indexedDB) {
  window.indexedDB = {
    open: vi.fn(() => ({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    }))
  };
}

// Mock URL.createObjectURL and revokeObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn((blob) => 'blob:http://localhost/mock-blob-id');
  window.URL.revokeObjectURL = vi.fn();
}
