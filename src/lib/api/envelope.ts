import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/types/api";

/**
 * Helpers so every route handler returns the same envelope shape. Centralised
 * because a single endpoint returning a bare array would break the client's
 * unwrapping for that one call, in a way types would not catch.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function fail(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json(
    { ok: false as const, error: { code, message } },
    { status },
  );
}
