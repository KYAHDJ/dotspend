import { useState } from "react";

interface LocationInputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

// Geo-locator: lets the user type a custom location OR auto-detect their
// current city/area via the browser geolocation API + OpenStreetMap reverse
// geocoding (no API key required).
export default function LocationInput({
  value,
  onChange,
  onKeyDown,
  placeholder = "Location",
}: LocationInputProps) {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = async () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setDetecting(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        })
      );

      const { latitude, longitude } = pos.coords;
      let name = "";

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        name =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.municipality ||
          data?.address?.suburb ||
          data?.display_name?.split(",")[0] ||
          "";
      } catch {
        name = "";
      }

      if (name.trim()) {
        onChange(name.trim());
      } else {
        // Fallback: round coords so the user still gets something useful.
        onChange(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
      }
    } catch (err) {
      const e = err as GeolocationPositionError;
      setError(e?.code === 1 ? "Location blocked" : "Could not detect location");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "#A1A1AA" }}
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full text-sm pl-8 pr-9 py-2.5 rounded-lg outline-none placeholder:text-[#A1A1AA] transition-all duration-200"
        style={{ background: "#0F0F12", border: `1px solid ${error ? "#FF6B6B" : "#2A2A32"}`, color: "white" }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5"; }}
        onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = error ? "#FF6B6B" : "#2A2A32"; }}
      />
      <button
        type="button"
        onClick={detect}
        disabled={detecting}
        title={detecting ? "Detecting location..." : "Auto-detect location"}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-md transition-colors"
        style={{ color: detecting ? "#CBE353" : "#9B6EFF" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          if (!detecting) el.style.background = "#2A2A32";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          if (!detecting) el.style.background = "transparent";
        }}
      >
        {detecting ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: "#CBE353" }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
          </svg>
        )}
      </button>
      {error && (
        <p className="text-[#FF6B6B] text-[10px] mt-1 pl-1">{error}</p>
      )}
    </div>
  );
}
