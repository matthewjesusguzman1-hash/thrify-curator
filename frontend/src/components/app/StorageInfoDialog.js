import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  X, Shield, Smartphone, Download, AlertTriangle, CheckCircle2, HardDrive, Info, Calendar,
} from "lucide-react";
import {
  requestPersistentStorage,
  getPersistentStatus,
  getStorageEstimate,
  isRunningAsPWA,
  isIOSSafari,
  daysSinceLastExport,
} from "../../lib/storageManager";
import { listAllMetadata } from "../../lib/devicePhotos";

/**
 * "About Photo Storage" — a plain-language explanation for inspectors and
 * their supervisors. Shows current device status (persistent? PWA installed?
 * storage used? days since last export?) and gives clear actions.
 */
export function StorageInfoDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [persist, setPersist] = useState({ supported: false, persisted: false });
  const [estimate, setEstimate] = useState(null);
  const [pwa, setPwa] = useState({ installed: false, ios: false });
  const [photoCount, setPhotoCount] = useState(0);
  const [photoBytes, setPhotoBytes] = useState(0);
  const [lastExport, setLastExport] = useState(null);
  const [persistLoading, setPersistLoading] = useState(false);

  const refresh = async () => {
    setPersist(await getPersistentStatus());
    setEstimate(await getStorageEstimate());
    setPwa({ installed: isRunningAsPWA(), ios: isIOSSafari() });
    setLastExport(daysSinceLastExport());
    try {
      const list = await listAllMetadata();
      setPhotoCount(list.length);
      setPhotoBytes(list.reduce((s, m) => s + (m.size || 0), 0));
    } catch { /* ignore */ }
  };

  useEffect(() => { if (open) refresh(); }, [open]);

  const fmtBytes = (b) => {
    if (!b) return "0 B";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const enablePersistent = async () => {
    setPersistLoading(true);
    await requestPersistentStorage();
    await refresh();
    setPersistLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-xl" data-testid="storage-info-dialog">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#002855] rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>About Photo Storage</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0 rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[13px] text-[#0F172A] leading-relaxed">

          {/* Plain-language summary */}
          <section className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-3">
            <p className="font-bold text-[#166534] mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Photos never leave your device</p>
            <p className="text-[#166534] text-[12px]">
              Inspection photos are saved <strong>only on this device</strong> — they are never uploaded to any server.
              This protects driver and carrier information. The inspection details (violations, weights,
              tie-down data, notes) are public data and saved on the server so they can be accessed from any device.
            </p>
          </section>

          {/* Your device right now */}
          <section>
            <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Your device right now</h3>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-md border bg-white p-2.5">
                <p className="text-[10px] uppercase text-[#94A3B8] font-bold">Photos on device</p>
                <p className="text-lg font-bold text-[#002855]">{photoCount}</p>
                <p className="text-[10px] text-[#94A3B8]">{fmtBytes(photoBytes)}</p>
              </div>
              <div className="rounded-md border bg-white p-2.5">
                <p className="text-[10px] uppercase text-[#94A3B8] font-bold">Browser storage used</p>
                <p className="text-lg font-bold text-[#002855]">{estimate ? fmtBytes(estimate.usage) : "—"}</p>
                <p className="text-[10px] text-[#94A3B8]">of {estimate ? fmtBytes(estimate.quota) : "—"} available</p>
              </div>
            </div>
          </section>

          {/* Protection status */}
          <section>
            <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Protection status</h3>
            <div className="space-y-2">
              {/* Persistent storage */}
              <div className={`rounded-md border p-3 ${persist.persisted ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF3C7] border-[#FDE68A]"}`} data-testid="persist-status">
                <div className="flex items-start gap-2">
                  {persist.persisted ? <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0F172A]">
                      {persist.persisted ? "Permanent storage enabled" : "Permanent storage NOT enabled"}
                    </p>
                    <p className="text-[11px] text-[#475569] mt-0.5">
                      {persist.persisted
                        ? "Your browser will not auto-delete photos when storage gets low. Photos stay until you clear them yourself."
                        : "Your browser may auto-delete photos if the device runs low on storage. Click 'Enable permanent storage' below to protect them."}
                    </p>
                    {!persist.persisted && persist.supported && (
                      <Button onClick={enablePersistent} disabled={persistLoading} size="sm" className="mt-2 bg-[#002855] text-white h-8 text-xs" data-testid="enable-persist-btn">
                        {persistLoading ? "Requesting…" : "Enable permanent storage"}
                      </Button>
                    )}
                    {!persist.supported && (
                      <p className="text-[10px] text-[#94A3B8] italic mt-1">This browser doesn't support storage protection.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* PWA status */}
              <div className={`rounded-md border p-3 ${pwa.installed ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF3C7] border-[#FDE68A]"}`} data-testid="pwa-status">
                <div className="flex items-start gap-2">
                  {pwa.installed ? <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" /> : <Smartphone className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0F172A]">
                      {pwa.installed ? "App is installed on your home screen" : "Add to home screen recommended"}
                    </p>
                    {pwa.installed ? (
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        You're running the installed version. Photos are safe from Safari's 7-day auto-purge.
                      </p>
                    ) : pwa.ios ? (
                      <div className="text-[11px] text-[#475569] mt-0.5 space-y-1">
                        <p><strong className="text-[#991B1B]">Important for iPhone/iPad users:</strong> Safari deletes data for any website you don't visit for 7 days. To prevent this, add Inspection Navigator to your Home Screen:</p>
                        <ol className="list-decimal pl-4 space-y-0.5">
                          <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari.</li>
                          <li>Scroll and tap <strong>"Add to Home Screen"</strong>.</li>
                          <li>Tap <strong>Add</strong> in the top right.</li>
                        </ol>
                        <p>Then always open the app from the Home Screen icon — not Safari.</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        Install this app on your device for the best experience. Look for the "Install" option in your browser's menu (⋮), or tap the install icon in the address bar if shown.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Retention reminder */}
          <section className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3" data-testid="retention-info">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[#1E40AF] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1E40AF] mb-1">Export inspection reports for retention</p>
                <p className="text-[11px] text-[#1E3A8A]">
                  Your agency may require you to retain inspection records for a specific period.
                  The safest way is to <strong>Share</strong> each inspection report as a PDF (saved to your
                  files, emailed to yourself, or uploaded to your agency's records system) as soon as the inspection is complete.
                </p>
                <p className="text-[11px] text-[#1E3A8A] mt-2">
                  <strong>Last export:</strong>{" "}
                  {lastExport === null ? (
                    <span className="text-[#991B1B]">never — export one now to start the reminder timer</span>
                  ) : lastExport === 0 ? (
                    <span className="text-[#166534]">today</span>
                  ) : lastExport === 1 ? (
                    "yesterday"
                  ) : (
                    <>{lastExport} days ago{lastExport >= 14 ? <span className="text-[#991B1B] font-bold"> — export overdue</span> : null}</>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* What deletes photos */}
          <section>
            <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" /> What will delete your photos</h3>
            <ul className="text-[11px] text-[#475569] space-y-1 list-disc pl-5">
              <li>Clearing browser data / site data / cookies from the browser settings</li>
              <li>Safari's 7-day auto-purge (prevented by adding to Home Screen — see above)</li>
              <li>Uninstalling or resetting the browser</li>
              <li>Factory-resetting the device</li>
              <li>Using Private / Incognito mode (photos vanish when you close the tab)</li>
              <li>Very low device storage (prevented by enabling permanent storage — see above)</li>
            </ul>
          </section>

          {/* Won't delete */}
          <section>
            <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> What will NOT delete your photos</h3>
            <ul className="text-[11px] text-[#475569] space-y-1 list-disc pl-5">
              <li>Closing the browser, the tab, or the app</li>
              <li>Rebooting the device</li>
              <li>Normal browser updates</li>
              <li>Signing out of the app (PIN change, Sign Out button)</li>
              <li>Losing network / being offline</li>
            </ul>
          </section>

          {/* TL;DR */}
          <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
            <p className="text-[11px] text-[#92400E]">
              <strong>Bottom line:</strong> finish each inspection, tap <strong>Share</strong> to save the PDF
              somewhere safe (email, Drive, agency records), and photos on the device are for working reference only.
              Treat the device like a field notebook — the PDF is the permanent record.
            </p>
          </section>

          <div className="pt-2">
            <Button
              onClick={() => { onOpenChange(false); navigate("/inspections"); }}
              className="w-full bg-[#002855] text-white hover:bg-[#001a3a] h-10 text-sm font-semibold"
              data-testid="storage-info-goto-inspections-btn"
            >
              <Download className="w-4 h-4 mr-2" /> Go to my inspections to export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
