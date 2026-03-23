// Upload Service — module-level singleton
const listeners = new Set();

let queue = []; // Files waiting to be uploaded
let active = false; // Whether an upload is in progress
let results = []; // Completed results for display
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
  // Immediately send current state to new subscriber
  fn({ active, currentFile, currentIndex, totalFiles, results: [...results] });
  return () => listeners.delete(fn);
}

export function clearResults() {
  results = [];
  notify();
}

export async function enqueueFiles(files, onBatchComplete) {
  if (active) return; // Already processing — ignore duplicate calls

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
      // Fetch access token from Next.js server-side route
      const tokenRes = await fetch("/api/auth/access-token");
      if (!tokenRes.ok) throw new Error("Could not retrieve access token.");
      const { accessToken } = await tokenRes.json();

      const formData = new FormData();
      formData.append("file", file);

      // Upload goes directly from browser to backend — no Next.js proxy in the path, no proxy timeout
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/uploads/csv`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
          // No AbortSignal — this fetch must survive component unmount
        },
      );

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
