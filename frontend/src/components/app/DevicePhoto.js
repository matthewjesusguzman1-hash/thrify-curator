import { useEffect, useRef, useState } from "react";
import { getPhotoBlob } from "../../lib/devicePhotos";
import { ImageOff } from "lucide-react";

/**
 * Renders a photo stored in the browser's IndexedDB (device-only storage).
 *
 * Uses an internal cache + ref-based objectURL lifecycle so thumbnails never
 * flash or show the native broken-image icon — a problem we hit when React 18
 * StrictMode re-runs the effect on mount and the old cleanup revoked the
 * objectURL before the `<img>` element finished loading it.
 *
 * Cache: module-level Map keyed by photo_id → objectURL. URLs are reference
 * counted; revoked only when no mounted DevicePhoto is using them.
 */
const URL_CACHE = new Map(); // photo_id -> { url, refs }

function acquireUrl(photoId, blob) {
  const existing = URL_CACHE.get(photoId);
  if (existing) { existing.refs += 1; return existing.url; }
  const url = URL.createObjectURL(blob);
  URL_CACHE.set(photoId, { url, refs: 1 });
  return url;
}

function releaseUrl(photoId) {
  const entry = URL_CACHE.get(photoId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    URL.revokeObjectURL(entry.url);
    URL_CACHE.delete(photoId);
  }
}

export function DevicePhoto({ photoId, alt = "", className = "", style, onClick, ...rest }) {
  const [url, setUrl] = useState(() => URL_CACHE.get(photoId)?.url || null);
  const [missing, setMissing] = useState(false);
  const activeIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);

    // Fast path: if another mounted DevicePhoto has already loaded this blob,
    // reuse its URL and just increment the refcount.
    const cached = URL_CACHE.get(photoId);
    if (cached) {
      cached.refs += 1;
      activeIdRef.current = photoId;
      setUrl(cached.url);
      return () => { releaseUrl(photoId); };
    }

    (async () => {
      const blob = await getPhotoBlob(photoId);
      if (cancelled) return;
      if (!blob) { setMissing(true); return; }
      const createdUrl = acquireUrl(photoId, blob);
      activeIdRef.current = photoId;
      setUrl(createdUrl);
    })();

    return () => {
      cancelled = true;
      if (activeIdRef.current === photoId) {
        releaseUrl(photoId);
        activeIdRef.current = null;
      }
    };
  }, [photoId]);

  if (missing) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center gap-1 bg-[#F1F5F9] text-[#94A3B8] text-[9px] leading-tight ${className}`}
        style={style}
        onClick={onClick}
        {...rest}
      >
        <ImageOff className="w-3.5 h-3.5" />
        <span>Not on this device</span>
      </div>
    );
  }

  if (!url) {
    return <div className={`bg-[#F1F5F9] animate-pulse ${className}`} style={style} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      // If the browser still somehow fails to load (corrupt blob, etc.),
      // flip to the "missing" placeholder instead of the native broken-image.
      onError={() => setMissing(true)}
      {...rest}
    />
  );
}
