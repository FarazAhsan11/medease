// Turns getUserMedia failures into steps the user can act on.
export function describeMediaError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access is blocked. Allow it from the icon in your browser's address bar, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "We couldn't find a microphone. Connect one and try again.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera or microphone is being used by another app. Close it and try again.";
    default:
      return "We couldn't start your camera or microphone. Check your devices and try again.";
  }
}

// Missing camera (but maybe a working mic) is worth retrying audio-only.
export const isMissingDevice = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === "NotFoundError" || error.name === "OverconstrainedError");
