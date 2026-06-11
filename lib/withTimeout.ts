/** Rejects if `promise` does not settle within `ms` (avoids infinite pending UI). */
export async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number,
  message = "Request timed out. Check your connection and Supabase settings."
): Promise<T> {
  let id: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    clearTimeout(id!);
  }
}
