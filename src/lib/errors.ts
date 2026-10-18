export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach our servers. Check your internet connection and try again.";

export const UNEXPECTED_ERROR_MESSAGE =
  "Something went wrong on our end. Please try again in a moment.";

const networkErrorCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

// True for failed requests (DNS, offline, refused, timed out) as opposed to
// errors the server answered with.
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AuthRetryableFetchError") return true;
  if (error instanceof TypeError && /fetch/i.test(error.message)) return true;

  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && networkErrorCodes.has(code);
}

export function getUnexpectedErrorMessage(error: unknown) {
  return isNetworkError(error)
    ? NETWORK_ERROR_MESSAGE
    : UNEXPECTED_ERROR_MESSAGE;
}
