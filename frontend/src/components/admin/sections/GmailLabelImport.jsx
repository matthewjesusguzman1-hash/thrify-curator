import { useState, useEffect } from "react";
import { Mail, RefreshCw, Loader2, Download, Check, AlertCircle, Link2, Tag, X, FileText, Bug } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GmailLabelImport({ getAuthHeader, onImported }) {
  const [connected, setConnected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showPanel, setShowPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  // Check for ?gmail=connected or ?gmail=error in URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setConnected(true);
      toast.success("Gmail connected!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gmail") === "error") {
      const reason = params.get("reason") || "Unknown error";
      toast.error("Gmail connection failed: " + decodeURIComponent(reason));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await axios.get(`${API}/gmail/status`, getAuthHeader());
      setConnected(data.connected);
    } catch {
      setConnected(false);
    }
  };

  const connectGmail = async () => {
    try {
      const { data } = await axios.get(`${API}/gmail/auth`, getAuthHeader());
      window.location.href = data.auth_url;
    } catch (err) {
      toast.error("Failed to start Gmail connection");
    }
  };

  const disconnectGmail = async () => {
    try {
      await axios.delete(`${API}/gmail/disconnect`, getAuthHeader());
      setConnected(false);
      setEmails([]);
      toast.success("Gmail disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const scanEmails = async () => {
    setScanning(true);
    setEmails([]);
    setSelected(new Set());
    setDebugInfo(null);
    try {
      const { data } = await axios.get(`${API}/gmail/scan`, {
        ...getAuthHeader(),
        params: { after: dateFrom, before: dateTo },
      });
      setEmails(data.emails || []);
      if (data.debug) setDebugInfo(data.debug);
      // Auto-select all that have labels and aren't imported yet
      const autoSelect = new Set();
      (data.emails || []).forEach((e) => {
        if (e.has_label && !e.already_imported) autoSelect.add(e.message_id);
      });
      setSelected(autoSelect);
      if (data.emails?.length === 0) {
        toast.info(`No shipping label emails found between ${dateFrom} and ${dateTo}`);
      } else {
        toast.success(`Found ${data.emails.length} shipping email(s)`);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to scan emails";
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const importSelected = async () => {
    if (selected.size === 0) {
      toast.info("Select at least one email to import");
      return;
    }
    setImporting(true);
    try {
      const { data } = await axios.post(
        `${API}/gmail/import`,
        { message_ids: Array.from(selected) },
        getAuthHeader()
      );
      const count = data.imported?.filter((i) => i.status === "imported").length || 0;
      const dupes = data.imported?.filter((i) => i.status === "already_exists").length || 0;
      const errCount = data.errors?.length || 0;

      if (count > 0) toast.success(`Imported ${count} label(s)` + (dupes ? ` (${dupes} already existed)` : ""));
      if (errCount > 0) toast.error(`${errCount} label(s) failed to import`);

      // Mark imported in local state
      const importedIds = new Set(data.imported?.map((i) => i.message_id) || []);
      setEmails((prev) =>
        prev.map((e) => importedIds.has(e.message_id) ? { ...e, already_imported: true } : e)
      );
      setSelected(new Set());
      if (onImported) onImported();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const platformColors = {
    poshmark: "bg-pink-100 text-pink-700",
    mercari: "bg-red-100 text-red-700",
    ebay: "bg-blue-100 text-blue-700",
    depop: "bg-green-100 text-green-700",
  };

  // Collapsed state — just the connect/scan button
  if (!showPanel) {
    return (
      <button
        onClick={() => {
          setShowPanel(true);
          if (connected && emails.length === 0) scanEmails();
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#ccc] hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all text-sm text-[#888] hover:text-[#FF6B35]"
        data-testid="gmail-import-btn"
      >
        <Mail className="w-4 h-4" />
        {connected ? "Import from Gmail" : "Connect Gmail to Import Labels"}
      </button>
    );
  }

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-4 bg-white" data-testid="gmail-import-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#FF6B35]" />
          <span className="font-medium text-sm text-[#333]">Gmail Label Import</span>
          {connected && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Connected</span>
          )}
        </div>
        <button onClick={() => setShowPanel(false)} className="text-[#aaa] hover:text-[#666]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Not connected */}
      {connected === false && (
        <div className="text-center py-4">
          <p className="text-sm text-[#888] mb-3">Connect your Gmail to automatically pull shipping labels and SKUs</p>
          <button
            onClick={connectGmail}
            className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E85D2C] transition-colors"
            data-testid="connect-gmail-btn"
          >
            <Mail className="w-4 h-4 inline mr-1.5" />
            Connect Gmail
          </button>
        </div>
      )}

      {/* Connected — scan controls */}
      {connected && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-[#888] font-medium">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white"
                data-testid="gmail-date-from"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-[#888] font-medium">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white"
                data-testid="gmail-date-to"
              />
            </div>
            <button
              onClick={scanEmails}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B35] text-white text-xs font-medium hover:bg-[#E85D2C] transition-colors disabled:opacity-50"
              data-testid="gmail-scan-btn"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {scanning ? "Scanning..." : "Scan"}
            </button>
            {selected.size > 0 && (
              <button
                onClick={importSelected}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 ml-auto"
                data-testid="gmail-import-selected-btn"
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Import {selected.size}
              </button>
            )}
            <button
              onClick={disconnectGmail}
              className="text-[10px] text-[#aaa] hover:text-red-500 ml-auto transition-colors"
              data-testid="gmail-disconnect-btn"
            >
              Disconnect
            </button>
          </div>

          {/* Debug diagnostics — togglable */}
          {debugInfo && (
            <div className="mb-3">
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-[#aaa] hover:text-[#FF6B35] transition-colors"
                data-testid="gmail-toggle-debug"
              >
                <Bug className="w-3 h-3" />
                {showDebug ? "Hide" : "Show"} scan diagnostics
              </button>
              {showDebug && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-[#f8f8f8] border border-[#eee] text-[11px] font-mono text-[#666] space-y-1.5" data-testid="gmail-debug-panel">
                  <div><span className="text-[#999]">Date filter:</span> {debugInfo.date_filter}</div>
                  <div><span className="text-[#999]">Platform:</span> {debugInfo.platform_filter}</div>
                  <div><span className="text-[#999]">Total candidates:</span> {debugInfo.total_candidates}</div>
                  <div><span className="text-[#999]">Parsed results:</span> {debugInfo.parsed_results}</div>
                  {debugInfo.queries?.map((q, i) => (
                    <div key={i} className="pl-2 border-l-2 border-[#ddd]">
                      <div className="text-[#888] font-semibold">{q.label}</div>
                      <div className="truncate text-[#aaa]">{q.query}</div>
                      {q.error
                        ? <div className="text-red-500">Error: {q.error}</div>
                        : <div>Found: {q.total_found} ({q.new_unique} new)</div>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email results */}
          {emails.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.message_id}
                  onClick={() => !email.already_imported && toggleSelect(email.message_id)}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    email.already_imported
                      ? "border-[#e5e5e5] bg-[#fafafa] opacity-60 cursor-default"
                      : selected.has(email.message_id)
                      ? "border-[#FF6B35] bg-[#FF6B35]/5"
                      : "border-[#e5e5e5] hover:border-[#ccc]"
                  }`}
                  data-testid={`gmail-email-${email.message_id}`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    email.already_imported
                      ? "border-green-400 bg-green-100"
                      : selected.has(email.message_id)
                      ? "border-[#FF6B35] bg-[#FF6B35]"
                      : "border-[#ccc]"
                  }`}>
                    {(email.already_imported || selected.has(email.message_id)) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platformColors[email.platform] || "bg-gray-100 text-gray-700"}`}>
                        {email.platform_name}
                      </span>
                      {email.has_label && (
                        <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                          {email.has_download_link ? <Link2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          Label
                        </span>
                      )}
                      {!email.has_label && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                          No label
                        </span>
                      )}
                      {email.sku && (
                        <span className="text-[10px] text-purple-600 flex items-center gap-0.5" title={email.sku_source ? `Matched from Vendoo CSV (${email.sku_source})` : "From email"}>
                          <Tag className="w-3 h-3" />
                          {email.sku}
                          {email.sku_source && (
                            <span className="text-[9px] text-purple-400 ml-0.5">
                              (CSV {email.sku_source})
                            </span>
                          )}
                        </span>
                      )}
                      {email.already_imported && (
                        <span className="text-[10px] text-green-600 ml-auto">Already imported</span>
                      )}
                    </div>
                    <p className="text-[#555] truncate">{email.subject}</p>
                    {email.item_title && email.item_title !== email.subject && (
                      <p className="text-[#999] truncate mt-0.5">Item: {email.item_title}</p>
                    )}
                    <p className="text-[#bbb] mt-0.5">{email.date}</p>
                    {/* Depop debug: show found links if no label detected */}
                    {email._debug_links && email._debug_links.length > 0 && (
                      <div className="mt-1 text-[10px] text-amber-600 space-y-0.5">
                        <span className="font-medium">Links found in email:</span>
                        {email._debug_links.map((link, i) => (
                          <p key={i} className="truncate text-[#aaa]">{link}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {scanning && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#888]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning your inbox...
            </div>
          )}
        </>
      )}
    </div>
  );
}
