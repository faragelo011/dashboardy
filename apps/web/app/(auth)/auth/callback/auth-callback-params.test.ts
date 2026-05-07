import { describe, expect, it } from "vitest";

import { parseEmailOtpType, safeNextPath } from "./auth-callback-params";

describe("safeNextPath", () => {
  it("defaults empty to root", () => {
    expect(safeNextPath(null)).toBe("/");
  });

  it("rejects non-relative paths", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("evil")).toBe("/");
  });

  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/set-password")).toBe("/set-password");
    expect(safeNextPath("/members")).toBe("/members");
  });
});

describe("parseEmailOtpType", () => {
  it("accepts invite and other email OTP types", () => {
    expect(parseEmailOtpType("invite")).toBe("invite");
    expect(parseEmailOtpType("signup")).toBe("signup");
    expect(parseEmailOtpType("recovery")).toBe("recovery");
  });

  it("rejects unknown or empty", () => {
    expect(parseEmailOtpType(null)).toBeNull();
    expect(parseEmailOtpType("")).toBeNull();
    expect(parseEmailOtpType("malicious")).toBeNull();
  });
});
