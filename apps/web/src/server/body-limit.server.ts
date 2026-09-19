/** Inspect a bounded clone so framework deserialization still receives the body. */
export async function bodyWithinLimit(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") ?? 0) > limit) return false;
  if (!request.body) return true;
  const reader = request.clone().body?.getReader();
  if (!reader) return true;
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return true;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        void reader.cancel();
        return false;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
