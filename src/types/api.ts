/**
 * Transport-level types.
 *
 * Everything the API returns is wrapped in an envelope so that success and
 * failure are distinguishable without relying on HTTP status alone, and so a
 * future addition (pagination meta, request id, deprecation notice) does not
 * change the shape of `data` itself.
 */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "MALFORMED_RESPONSE"
  | "NETWORK"
  | "TIMEOUT"
  | "SERVER_ERROR";

/**
 * A single error type for every failure mode the data layer can produce, so
 * UI code never has to distinguish "fetch threw" from "server said no" from
 * "the payload was not the shape we expected".
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;

  constructor(code: ApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }

  /** Message intended to be shown to a user, not logged. */
  get userMessage(): string {
    switch (this.code) {
      case "NOT_FOUND":
        return "We couldn't find what you were looking for.";
      case "NETWORK":
        return "We couldn't reach the server. Check your connection and try again.";
      case "TIMEOUT":
        return "The request took too long. Please try again.";
      case "MALFORMED_RESPONSE":
        return "The server returned data we couldn't read.";
      case "BAD_REQUEST":
        return "That request wasn't valid.";
      default:
        return "Something went wrong on our end. Please try again.";
    }
  }
}
