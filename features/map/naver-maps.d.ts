// Minimal typings for the parts of NAVER Maps JS API v3 this app uses.
// Loaded from https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...
// Marker/Event/getCenter behavior is to be confirmed against a live key
// (specs/decisions.md §12, B-04).

declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface MapOptions {
    center: LatLng;
    zoom?: number;
  }

  class Map {
    constructor(element: HTMLElement | string, options: MapOptions);
    getCenter(): LatLng;
    setCenter(center: LatLng): void;
    destroy(): void;
  }

  interface HtmlIcon {
    content: string | HTMLElement;
    anchor?: Point;
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    icon?: HtmlIcon;
    zIndex?: number;
    clickable?: boolean;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setIcon(icon: HtmlIcon): void;
    setZIndex(zIndex: number): void;
  }

  interface MapEventListener {
    readonly __brand: "MapEventListener";
  }

  namespace Event {
    function addListener(
      target: object,
      eventName: string,
      listener: (...args: unknown[]) => void,
    ): MapEventListener;
    function removeListener(listener: MapEventListener): void;
  }
}

interface Window {
  naver?: { maps: typeof naver.maps };
  navermap_authFailure?: () => void;
}
