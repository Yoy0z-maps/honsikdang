import { describe, expect, it } from "vitest";
import {
  NAVER_MAP_APP_STORE_URL,
  detectPlatform,
  directionsLink,
  naverRouteUrl,
} from "./directions";

const sicheong = { lat: 37.567, lng: 126.979, name: "[예시] 시청 국밥" };
const APP = "https://honsikdang.example";

describe("naverRouteUrl", () => {
  it("builds a walking route to the destination only (start = user's location in the app)", () => {
    const url = naverRouteUrl(sicheong, APP)!;
    expect(url.startsWith("nmap://route/walk?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("dlat")).toBe("37.5670000");
    expect(params.get("dlng")).toBe("126.9790000");
    expect(params.get("dname")).toBe("[예시] 시청 국밥");
    expect(params.get("appname")).toBe(APP);
    expect(params.has("slat")).toBe(false);
    expect(params.has("slng")).toBe(false);
  });

  it("percent-encodes names (spaces as %20, not +)", () => {
    const url = naverRouteUrl({ ...sicheong, name: "국밥 & 면" }, APP)!;
    expect(url).toContain("dname=%EA%B5%AD%EB%B0%A5%20%26%20%EB%A9%B4");
    expect(url).not.toContain("+");
  });

  it("supports other travel modes", () => {
    expect(naverRouteUrl(sicheong, APP, "public")).toMatch(
      /^nmap:\/\/route\/public\?/,
    );
  });

  it("returns null outside the scheme's coordinate range or for swapped coordinates", () => {
    expect(
      naverRouteUrl({ ...sicheong, lat: 126.979, lng: 37.567 }, APP),
    ).toBeNull();
    expect(
      naverRouteUrl({ ...sicheong, lat: 35.68, lng: 139.76 }, APP),
    ).toBeNull(); // Tokyo
  });

  it("requires appname", () => {
    expect(() => naverRouteUrl(sicheong, "")).toThrow(/appname/);
  });
});

describe("directionsLink", () => {
  it("uses an intent URL with the app package on Android (store fallback)", () => {
    const link = directionsLink(sicheong, "android", APP);
    expect(link.kind).toBe("android");
    if (link.kind !== "android") return;
    expect(link.href).toMatch(
      /^intent:\/\/route\/walk\?dlat=37\.5670000&dlng=126\.9790000&/,
    );
    expect(link.href).toContain("#Intent;scheme=nmap;");
    expect(link.href).toContain("package=com.nhn.android.nmap;end");
  });

  it("uses nmap:// with an App Store fallback on iOS", () => {
    const link = directionsLink(sicheong, "ios", APP);
    expect(link).toEqual({
      kind: "ios",
      href: naverRouteUrl(sicheong, APP),
      fallbackHref: NAVER_MAP_APP_STORE_URL,
    });
  });

  it("is unsupported on desktop and outside Korea", () => {
    expect(directionsLink(sicheong, "other", APP).kind).toBe("unsupported");
    expect(
      directionsLink({ ...sicheong, lat: 0, lng: 0 }, "android", APP).kind,
    ).toBe("unsupported");
  });
});

describe("detectPlatform", () => {
  it.each([
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124 Mobile",
      "android",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      "ios",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124",
      "other",
    ],
  ])("%s → %s", (ua, expected) => {
    expect(detectPlatform(ua)).toBe(expected);
  });
});
