import { useEffect, useState } from "react";
import { getPhotoBlob } from "../../lib/devicePhotos";
import { ImageOff } from "lucide-react";

/**
 * Renders a photo stored in the browser's IndexedDB (device-only storage).
 * Shows a "not on this device" placeholder if the photo isn't found locally —
 * happens when the same inspection is viewed on a different device.
 */
export function DevicePhoto({ photoId, alt = "", className = "", style, onClick, ...rest }) {
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setMissing(false);
    setUrl(null);
    (async () => {
      const blob = await getPhotoBlob(photoId);
      if (cancelled) return;
      if (!blob) { setMissing(true); return; }
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
      {...rest}
    />
  );
}
