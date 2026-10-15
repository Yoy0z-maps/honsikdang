import { describe, expect, it } from "vitest";
import { chooseInitialCamera, readLastRegion, writeLastRegion } from "./camera";

const fallback = { center: { lat: 37.5663, lng: 126.9779 }, zoom: 15 };
const url = { center: { lat: 37.5, lng: 127.0 }, zoom: 16 };
const lastRegion = { center: { lat: 35.1, lng: 129.0 }, zoom: 14 };
const here = { lat: 37.49, lng: 127.02 };

describe("chooseInitialCamera", () => {
  it("prefers an explicit URL position", () => {
    expect(
      chooseInitialCamera({ url, grantedLocation: here, lastRegion, fallback }),
    ).toEqual({ camera: url, source: "url" });
  });

  it("then an already-granted location", () => {
    expect(
      chooseInitialCamera({
        url: null,
        grantedLocation: here,
        lastRegion,
        fallback,
      }),
    ).toEqual({ camera: { center: here, zoom: 15 }, source: "location" });
  });

  it("then the last explicitly chosen region", () => {
    expect(
      chooseInitialCamera({
        url: null,
        grantedLocation: null,
        lastRegion,
        fallback,
      }),
    ).toEqual({ camera: lastRegion, source: "last-region" });
  });

  it("falls back to the default without permission or history", () => {
    expect(
      chooseInitialCamera({
        url: null,
        grantedLocation: null,
        lastRegion: null,
        fallback,
      }),
    ).toEqual({ camera: fallback, source: "default" });
  });
});

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("last region storage", () => {
  it("round-trips a camera", () => {
    const storage = memoryStorage();
    writeLastRegion(storage, lastRegion);
    expect(readLastRegion(storage)).toEqual(lastRegion);
  });

  it("ignores corrupt or out-of-range data", () => {
    const storage = memoryStorage();
    storage.setItem("honsikdang:last-region", "{not json");
    expect(readLastRegion(storage)).toBeNull();
    storage.setItem(
      "honsikdang:last-region",
      JSON.stringify({ center: { lat: 127, lng: 37 }, zoom: 15 }),
    );
    expect(readLastRegion(storage)).toBeNull();
  });

  it("tolerates missing or throwing storage", () => {
    expect(readLastRegion(null)).toBeNull();
    const throwing = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error("blocked");
      },
    } as Storage;
    expect(() => writeLastRegion(throwing, lastRegion)).not.toThrow();
  });
});
