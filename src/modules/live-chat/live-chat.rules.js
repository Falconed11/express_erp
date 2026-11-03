export const SEND_INTERVAL_MICROSECONDS = 2_000_000;

export const isSendRateLimited = (role, elapsedMicroseconds) =>
  role !== "super" &&
  elapsedMicroseconds != null &&
  Number(elapsedMicroseconds) < SEND_INTERVAL_MICROSECONDS;
