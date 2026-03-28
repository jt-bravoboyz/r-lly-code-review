import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock navigator.geolocation
Object.defineProperty(navigator, "geolocation", {
  value: {
    getCurrentPosition: (success: PositionCallback) =>
      success({
        coords: { latitude: 40.7128, longitude: -74.006, accuracy: 10 } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition),
    watchPosition: () => 0,
    clearWatch: () => {},
  },
});

// Mock sessionStorage
const store: Record<string, string> = {};
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  },
});
