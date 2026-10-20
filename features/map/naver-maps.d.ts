// Minimal typings for the parts of NAVER Maps JS API v3 this app uses.
// Loaded from https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=...
// Map/LatLngBounds members checked against the official reference
// (navermaps.github.io/maps.js.ncp/docs, 2026-10-15); Marker options and
// Event were confirmed against a live key (specs/decisions.md §12).

declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface MapOptions {
    center: LatLng;
    zoom?: number;
    draggable?: boolean;
    pinchZoom?: boolean;
    scrollWheel?: boolean;
    keyboardShortcuts?: boolean;
  }

  class Map {
    constructor(element: HTMLElement | string, options: MapOptions);
    getCenter(): LatLng;
    getZoom(): number;
    setCenter(center: LatLng): void;
    setZoom(zoom: number, effect?: boolean): void;
    panTo(coord: LatLng): void;
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
    setPosition(position: LatLng): void;
  }

  // Circle: NAVER Maps v3 reference (WP-08 my-location accuracy ring).
  interface CircleOptions {
    map?: Map | null;
    center: LatLng;
    radius: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    clickable?: boolean;
    zIndex?: number;
  }

  class Circle {
    constructor(options: CircleOptions);
    setMap(map: Map | null): void;
    setCenter(center: LatLng): void;
    setRadius(radius: number): void;
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
