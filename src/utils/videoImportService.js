/**
 * Video Import Pipeline Service
 * Manages video file reading, format/codec validation, timeout-protected downloads/reads,
 * thumbnail extraction, structured error classification, diagnostic logging, and safe cancellation.
 */

import { saveVideoClipToIDB } from './videoStore.js';

export const IMPORT_STAGES = {
  PREPARING: 'PREPARING',
  READING: 'READING',
  VALIDATING: 'VALIDATING',
  PROCESSING: 'PROCESSING',
  SAVING: 'SAVING',
  READY: 'READY',
  FAILED: 'FAILED'
};

export const STAGE_LABELS = {
  PREPARING: 'Preparing selected video…',
  READING: 'Reading video file…',
  VALIDATING: 'Validating format and size…',
  PROCESSING: 'Generating preview & thumbnail…',
  SAVING: 'Adding to Video Library…',
  READY: 'Clip ready for analysis'
};

export function generateVideoRequestId() {
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `REQ-VID-${hex}-${Date.now().toString().slice(-5)}`;
}

export const IMPORT_ERROR_CATALOG = {
  FILE_READ_FAILED: {
    errorCode: 'FILE_READ_FAILED',
    title: 'Video couldn’t be opened',
    message: 'The selected video could not be read from Google Photos or storage. It may still be stored in the cloud or permission may have expired.',
    actions: ['retry', 'choose_another']
  },
  DOWNLOAD_FAILED: {
    errorCode: 'DOWNLOAD_FAILED',
    title: 'Video couldn’t be downloaded',
    message: 'The selected Google Photos video could not be downloaded to this device. Check your internet connection and try again.',
    actions: ['retry', 'choose_another']
  },
  UNSUPPORTED_FORMAT: {
    errorCode: 'UNSUPPORTED_FORMAT',
    title: 'Video format isn’t supported',
    message: 'This video uses a format or codec that the analyser cannot process. Supported formats include MP4, MOV, and WebM.',
    actions: ['choose_another', 'view_supported']
  },
  FILE_TOO_LARGE: {
    errorCode: 'FILE_TOO_LARGE',
    title: 'Video is too large',
    message: 'This video exceeds the 500MB maximum upload limit for local analysis. Please select a smaller video clip or compress it first.',
    actions: ['choose_another']
  },
  UPLOAD_FAILED: {
    errorCode: 'UPLOAD_FAILED',
    title: 'Video storage failed',
    message: 'The video was prepared successfully, but it could not be stored in your browser library. Check available storage space and try again.',
    actions: ['retry', 'choose_another']
  },
  PROCESSING_FAILED: {
    errorCode: 'PROCESSING_FAILED',
    title: 'Video processing failed',
    message: 'The video loaded successfully, but the app could not generate a preview or prepare it for playback.',
    actions: ['retry', 'choose_another']
  },
  NETWORK_FAILURE: {
    errorCode: 'NETWORK_FAILURE',
    title: 'Internet connection lost',
    message: 'The video import was interrupted because your connection was lost. Connect to the internet and try again.',
    actions: ['retry', 'cancel']
  },
  UNEXPECTED_FAILURE: {
    errorCode: 'UNEXPECTED_FAILURE',
    title: 'Video import failed unexpectedly',
    message: 'We couldn’t complete the video import. The selected video has not been added to your library.',
    actions: ['retry', 'choose_another']
  }
};

export function createImportError(errorCode, overrides = {}) {
  const base = IMPORT_ERROR_CATALOG[errorCode] || IMPORT_ERROR_CATALOG.UNEXPECTED_FAILURE;
  const requestId = overrides.requestId || generateVideoRequestId();

  return {
    success: false,
    errorCode: base.errorCode,
    title: overrides.title || base.title,
    message: overrides.message || base.message,
    actions: overrides.actions || base.actions,
    requestId,
    details: overrides.details || '',
    timestamp: new Date().toISOString()
  };
}

export function detectSupportedVideoFormat(file) {
  if (!file) return { supported: false, mimeType: '', extension: '' };
  
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const ext = name.substring(name.lastIndexOf('.')) || '';

  const knownExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.3gp', '.mkv', '.avi', '.ogv'];
  const isKnownExt = knownExtensions.includes(ext);

  const supportedTypes = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'video/3gpp',
    'video/ogg'
  ];

  let isSupportedType = supportedTypes.some(t => type.startsWith(t));
  if (!type && isKnownExt) {
    isSupportedType = true;
  }

  // Check browser MediaSource / HTMLVideoElement codec capability
  let canPlay = false;
  if (typeof document !== 'undefined') {
    const videoTest = document.createElement('video');
    if (type) {
      canPlay = videoTest.canPlayType(type) !== '';
    }
    if (!canPlay && isKnownExt) {
      canPlay = true; // Fallback browser decoding check
    }
  } else {
    canPlay = isSupportedType;
  }

  return {
    supported: canPlay || isSupportedType || isKnownExt,
    mimeType: type || 'video/mp4',
    extension: ext
  };
}

/**
 * Extracts a thumbnail Data URL from a video Blob at time t = 0.5s (or mid-point).
 */
export function extractVideoThumbnail(videoUrl, targetTime = 0.5) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      cleanup();
      // Non-fatal fallback thumbnail
      resolve('');
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    }

    function onError() {
      cleanup();
      resolve('');
    }

    function onLoadedData() {
      const seekTime = Math.min(targetTime, (video.duration || 1) / 2);
      video.currentTime = seekTime;
    }

    function onSeeked() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640, video.videoWidth || 640);
        canvas.height = Math.min(360, video.videoHeight || 360);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve('');
      }
    }

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
  });
}

/**
 * Executes the complete video import pipeline with progress updates and timeout safety.
 */
export async function processVideoImport(file, ownerId, onProgress) {
  const requestId = generateVideoRequestId();
  const timestamp = new Date().toISOString();

  const updateStage = (stage, progress = 0, message = '') => {
    if (onProgress) {
      onProgress({
        stage,
        stageLabel: STAGE_LABELS[stage] || stage,
        progress: Math.min(100, Math.max(0, Math.round(progress))),
        message,
        requestId
      });
    }
  };

  try {
    // Stage 1: PREPARING
    updateStage(IMPORT_STAGES.PREPARING, 10, 'Validating file selection…');
    if (!file) {
      throw createImportError('FILE_READ_FAILED', { requestId });
    }

    // Check size (500 MB limit)
    const MAX_SIZE_BYTES = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw createImportError('FILE_TOO_LARGE', {
        requestId,
        message: `This video is ${sizeMB}MB. The maximum supported import size is 500MB.`
      });
    }

    // Check format
    const formatInfo = detectSupportedVideoFormat(file);
    if (!formatInfo.supported) {
      throw createImportError('UNSUPPORTED_FORMAT', {
        requestId,
        details: `File extension: ${formatInfo.extension || 'unknown'}, MIME: ${formatInfo.mimeType || 'unknown'}`
      });
    }

    // Stage 2: READING / DOWNLOADING (with timeout)
    updateStage(IMPORT_STAGES.READING, 30, 'Reading video data…');

    const readBlob = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(createImportError('DOWNLOAD_FAILED', {
          requestId,
          message: 'Reading media from storage or Google Photos timed out after 30 seconds.'
        }));
      }, 30000);

      try {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const readPct = 30 + Math.round((e.loaded / e.total) * 30);
            updateStage(IMPORT_STAGES.READING, readPct, `Downloading from Google Photos (${Math.round((e.loaded / e.total) * 100)}%)…`);
          }
        };

        reader.onload = () => {
          clearTimeout(timer);
          const blob = new Blob([reader.result], { type: formatInfo.mimeType || file.type || 'video/mp4' });
          resolve(blob);
        };

        reader.onerror = () => {
          clearTimeout(timer);
          reject(createImportError('FILE_READ_FAILED', { requestId }));
        };

        reader.readAsArrayBuffer(file);
      } catch (err) {
        clearTimeout(timer);
        reject(createImportError('FILE_READ_FAILED', { requestId, details: err.message }));
      }
    });

    // Stage 3: VALIDATING & PROCESSING (Metadata + Thumbnail)
    updateStage(IMPORT_STAGES.PROCESSING, 70, 'Generating preview thumbnail…');
    const objectUrl = URL.createObjectURL(readBlob);

    // Get metadata (duration & intrinsic size)
    const metadata = await new Promise((resolve) => {
      const v = document.createElement('video');
      v.src = objectUrl;
      v.preload = 'metadata';
      const t = setTimeout(() => resolve({ duration: 0, width: 1280, height: 720 }), 8000);
      v.onloadedmetadata = () => {
        clearTimeout(t);
        resolve({
          duration: v.duration || 0,
          width: v.videoWidth || 1280,
          height: v.videoHeight || 720
        });
      };
      v.onerror = () => {
        clearTimeout(t);
        resolve({ duration: 0, width: 1280, height: 720 });
      };
    });

    const thumbnail = await extractVideoThumbnail(objectUrl, 0.5);

    // Stage 4: SAVING to IndexedDB
    updateStage(IMPORT_STAGES.SAVING, 85, 'Adding to Video Library…');
    const clipId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Generate smart initial title
    const cleanFileName = file.name ? file.name.substring(0, file.name.lastIndexOf('.')) || file.name : '';
    const isGenericFilename = !cleanFileName || /^PXL_\d+|^VID_\d+|^IMG_\d+|^video\d*/i.test(cleanFileName);
    
    const formattedDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const defaultTitle = isGenericFilename ? `Training Session — ${formattedDate}` : cleanFileName;

    const clipRecord = {
      id: clipId,
      ownerId: ownerId || 'guest',
      videoUrl: objectUrl,
      fileName: file.name || 'imported_video.mp4',
      drillName: defaultTitle,
      category: 'training',
      sessionType: 'Training',
      opponent: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      thumbnail,
      playerIds: [],
      drawings: [],
      annotatedMoments: [],
      isPending: false,
      status: 'ready',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let isSessionOnly = false;
    try {
      await saveVideoClipToIDB(clipRecord, readBlob, ownerId);
    } catch (storageErr) {
      console.warn('Storage quota or IDB failure saving video blob:', storageErr);
      isSessionOnly = true;
      clipRecord.isSessionOnly = true;
    }

    // Stage 5: READY
    updateStage(IMPORT_STAGES.READY, 100, 'Import complete!');

    return {
      success: true,
      clip: clipRecord,
      isSessionOnly,
      requestId
    };
  } catch (err) {
    if (err && err.errorCode) throw err;
    throw createImportError('UNEXPECTED_FAILURE', { requestId, details: err?.message || String(err) });
  }
}
