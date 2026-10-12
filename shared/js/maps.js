/**
 * Carzen Google Maps Integration
 * API Key: AIzaSyCgX8fVnxc1Kajx4nNrGsgfdaws59A3Gk4
 */

export const GOOGLE_MAPS_KEY = "AIzaSyCgX8fVnxc1Kajx4nNrGsgfdaws59A3Gk4";

let googleMapsPromise = null;

/**
 * Dynamically loads Google Maps JavaScript API with libraries.
 * Returns a Promise that resolves when window.google.maps is ready.
 */
export function loadGoogleMaps() {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already injected
    const existing = document.querySelector("script[data-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-gmaps", "1");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry&loading=async`;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps loaded without window.google.maps"));
      }
    };

    script.onerror = (err) => {
      console.warn("Google Maps failed to load, falling back to Leaflet if available", err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Carzen subtle map styling for dark and light modes
 */
export const MAP_STYLES = {
  light: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#d2e4f0" }] },
  ],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#161b33" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#161b33" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ea4c8" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#222a4f" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1b2240" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2d3868" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1024" }] },
  ],
};

/**
 * Creates custom SVG icon for Google Maps markers
 */
export function createPinIcon({ color = "#1C2459", dotColor = "#F5FF67", size = 36 } = {}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <path d="M18 2C10.82 2 5 7.82 5 15c0 9.25 11.2 18.2 11.7 18.6a1.98 1.98 0 0 0 2.6 0C19.8 33.2 31 24.25 31 15c0-7.18-5.82-13-13-13z" fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="14" r="5" fill="${dotColor}"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size - 2),
  };
}

/**
 * Creates user location pulsing blue dot
 */
export function createUserDotIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="rgba(37,99,235,0.2)"/>
      <circle cx="16" cy="16" r="9" fill="rgba(37,99,235,0.35)"/>
      <circle cx="16" cy="16" r="6" fill="#1565C0" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16),
  };
}

/**
 * Creates custom Carzen car-wash pin with top price/rating badge and selected state
 */
export function createCarWashPinIcon({ price = 80, rating = 4.8, isSelected = false } = {}) {
  const width = isSelected ? 48 : 40;
  const height = isSelected ? 58 : 48;
  const mainColor = "#0B1F4B";
  const strokeColor = isSelected ? "#FFD54F" : "#FFFFFF";
  const strokeWidth = isSelected ? "2.5" : "1.5";
  const labelText = price ? `${price} ج.م` : `★ ${rating}`;
  const pillBg = isSelected ? "#FFD54F" : "#FFFFFF";
  const pillText = "#0B1F4B";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 40 48">
      <defs>
        <filter id="cz-pin-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(11,31,75,0.3)"/>
        </filter>
      </defs>
      <rect x="2" y="1" width="36" height="15" rx="7.5" fill="${pillBg}" stroke="${strokeColor}" stroke-width="1" filter="url(#cz-pin-sh)"/>
      <text x="20" y="11.5" text-anchor="middle" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="${pillText}">${labelText}</text>
      <path d="M20 18 C13.5 18 9 22.8 9 29 C9 36.5 18.5 44 20 45 C21.5 44 31 36.5 31 29 C31 22.8 26.5 18 20 18 Z" fill="${mainColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="url(#cz-pin-sh)"/>
      <circle cx="20" cy="29" r="4.5" fill="${isSelected ? '#FFD54F' : '#FFFFFF'}"/>
      <circle cx="20" cy="29" r="2.2" fill="${mainColor}"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height - 2),
  };
}
