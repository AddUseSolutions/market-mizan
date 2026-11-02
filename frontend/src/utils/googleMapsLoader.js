const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let pending;

export function googleMapsKey() {
  return String(KEY || "").trim();
}

export function loadGoogleMaps() {
  const key = googleMapsKey();
  if (!key) return Promise.reject(new Error("Google Maps key is not set"));
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve(window.google.maps);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      const fail = (error) => {
        pending = null;
        reject(error);
      };
      script.onload = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else fail(new Error("Google Maps did not load"));
      };
      script.onerror = () => fail(new Error("Google Maps failed to load"));
      document.head.appendChild(script);
    });
  }
  return pending;
}
