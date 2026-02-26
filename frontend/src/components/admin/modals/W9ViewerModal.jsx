import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  FileText,
  CheckCircle,
  Upload,
  Download,
  Trash2,
  Clock
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function W9ViewerModal({
  isOpen,
  onClose,
  viewingW9,
  employeeW9List,
  selectedW9Index,
  onSelectW9,
  loading,
  fromPortal = false,
  onApproveDoc,
  onDeleteDoc,
  onUploadW9,
  getAuthHeader
}) {
  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!viewingW9) return;
    try {
      const response = await axios.get(`${API}/admin/employees/${viewingW9.employeeId}/w9/${viewingW9.docId}`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', viewingW9.filename || 'w9.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("W-9 downloaded!");
    } catch (error) {
      toast.error("Failed to download W-9");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1A1A2E] to-[#16213E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {viewingW9?.employeeName}'s W-9 Forms
              </h3>
              <div className="flex items-center gap-3 text-white/60 text-xs">
                <span>{employeeW9List.length} document{employeeW9List.length !== 1 ? 's' : ''} on file</span>
                {viewingW9?.employeeStartDate && (
                  <>
                    <span className="text-white/30">•</span>
                    <span>Started: {new Date(viewingW9.employeeStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content with sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* W-9 List Sidebar */}
          {employeeW9List.length > 0 && (
            <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-3 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">W-9 Documents</p>
              </div>
              <div className="p-2 space-y-1">
                {employeeW9List.map((doc, index) => (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      index === selectedW9Index 
                        ? 'bg-[#FF1493]/10 border border-[#FF1493]' 
                        : 'hover:bg-gray-100 border border-transparent'
                    }`}
                    onClick={() => onSelectW9(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1A2E] truncate">
                          {doc.filename || `W-9 #${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          doc.status === 'approved' 
                            ? 'bg-green-100 text-green-700'
                            : doc.status === 'needs_correction'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {doc.status === 'approved' ? 'Approved' : 
                           doc.status === 'needs_correction' ? 'Needs Fix' : 'On File'}
                        </span>
                      </div>
                      {/* Only show approve button when NOT from portal view */}
                      {!fromPortal && (
                        <div className="flex flex-col gap-1">
                          {doc.status !== 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onApproveDoc(viewingW9.employeeId, doc.id);
                              }}
                              className="text-green-500 hover:text-green-700 hover:bg-green-50 p-1 h-auto"
                              title="Approve this W-9"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Add W-9 button - only show when NOT from portal view */}
              {!fromPortal && (
                <div className="p-3 border-t border-gray-200">
                  <label className="w-full">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file && viewingW9?.employeeId) {
                          await onUploadW9(viewingW9.employeeId, file);
                        }
                      }}
                    />
                    <span className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm bg-[#FF1493] text-white rounded-lg cursor-pointer hover:bg-[#E91E8C] transition-colors">
                      <Upload className="w-4 h-4" />
                      Add W-9
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Document Preview */}
          <div className="flex-1 overflow-auto p-4 bg-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF]"></div>
              </div>
            ) : viewingW9 ? (
              <div className="w-full h-full min-h-[500px]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {viewingW9.filename} • Uploaded {new Date(viewingW9.uploadedAt).toLocaleDateString()}
                  </p>
                  {viewingW9.status === 'approved' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                  )}
                </div>
                {viewingW9.contentType?.includes('pdf') ? (
                  <iframe
                    src={viewingW9.url}
                    className="w-full h-full min-h-[500px] rounded-lg border border-gray-200"
                    title="W-9 Document"
                  />
                ) : viewingW9.contentType?.includes('image') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={viewingW9.url}
                      alt="W-9 Document"
                      className="max-w-full max-h-[600px] rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Preview not available for this file type</p>
                    <Button
                      onClick={() => window.open(viewingW9.url, '_blank')}
                      className="mt-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">Failed to load document</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-16 border-t border-gray-200 flex justify-between items-center bg-white">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <div className="flex gap-2">
            {viewingW9 && (
              <>
                {/* Only show Approve button when NOT from portal view */}
                {!fromPortal && viewingW9.status !== 'approved' && (
                  <Button
                    variant="outline"
                    onClick={() => onApproveDoc(viewingW9.employeeId, viewingW9.docId)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
                {/* Only show Delete button when NOT from portal view */}
                {!fromPortal && (
                  <Button
                    variant="outline"
                    onClick={() => onDeleteDoc(viewingW9.employeeId, viewingW9.docId)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
