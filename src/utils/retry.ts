type RetryOptions = {
  name?: string;
  retries: number;
  minDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitter: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (
    error: unknown,
    attempt: number,
    delayMs: number,
    name?: string
  ) => void;
};

const defaultOptions: RetryOptions = {
  retries: 3,
  minDelayMs: 100,
  maxDelayMs: 1000,
  factor: 2,
  jitter: 0.2
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeDelayMs(attempt: number, options: RetryOptions) {
  const expDelay = options.minDelayMs * Math.pow(options.factor, attempt);
  const bounded = Math.min(expDelay, options.maxDelayMs);
  const jitterAmount = bounded * options.jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(bounded + jitterAmount));
}

export async function retry<T>(
  name: string,
  fn: (attempt: number) => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const merged: RetryOptions = { ...defaultOptions, ...options };
  let attempt = 0;

  while (true) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= merged.retries) {
        throw error;
      }

      const shouldRetry = merged.shouldRetry?.(error, attempt) ?? true;
      if (!shouldRetry) {
        throw error;
      }

      const delayMs = computeDelayMs(attempt, merged);
      merged.onRetry?.(error, attempt, delayMs, name);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}
