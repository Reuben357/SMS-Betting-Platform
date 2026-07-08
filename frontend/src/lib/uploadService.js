// app/lib/uploadService.js
/**
 * Upload Service – module‑level singleton for CSV uploads.
 * Manages file queue, progress, and results.
 * Uses direct API call to backend (not through Next.js proxy) to avoid timeout limits.
 */

const listeners = new Set();
let queue = [];
let active = false;
let results = [];
let currentFile = null;
let currentIndex = 0;
let totalFiles = 0;

function notify() {
  listeners.forEach((fn) =>
    fn({
      active,
      currentFile,
      currentIndex,
      totalFiles,
      results: [...results],
    }),
  );
}

export function subscribe(fn) {
  listeners.add(fn);
  
  fn({ active, currentFile, currentIndex, totalFiles, results: [...results] });
  return () => listeners.delete(fn);
}

export function clearResults() {
  results = [];
  notify();
}

/**
 * Enqueue files for upload.
 * Fetches an access token from /api/auth/access-token, then uploads each file
 * directly to the backend `/api/uploads/csv` endpoint.
 */
export async function enqueueFiles(files, onBatchComplete) {
  if (active) return;

  queue = Array.from(files);
  results = [];
  totalFiles = queue.length;
  currentIndex = 0;
  active = true;
  notify();

  let anySuccess = false;

  for (let i = 0; i < queue.length; i++) {
    const file = queue[i];
    currentFile = file.name;
    currentIndex = i;
    notify();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/proxy/uploads/csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed.`);

      results = [...results, { file: file.name, success: true, ...data }];
      anySuccess = true;
    } catch (err) {
      results = [
        ...results,
        { file: file.name, success: false, error: err.message },
      ];
    }
    
    notify();
  }

  active = false;
  currentFile = null;
  notify();

  if (anySuccess) {
    onBatchComplete?.();
  }
}
