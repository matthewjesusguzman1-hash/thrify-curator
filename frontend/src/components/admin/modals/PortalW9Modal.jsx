import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  FileText,
  Eye,
  Download,
  Clock
} from "lucide-react";

export default function PortalW9Modal({
  isOpen,
  onClose,
  employee,
  documents,
  loading,
  onPreview,
  onDownload,
  onDownloadBlankW9,
  previewingDoc,
  onClosePreview
}) {
  if (!isOpen || !employee) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
          data-testid="portal-w9-modal"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="h-1.5 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF1493] rounded-full mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">W-9 Documents</h2>
                  <p className="text-sm text-white/60">{employee.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[50vh]">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D4FF] mx-auto mb-3"></div>
                <p className="text-white/60">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No W-9 submissions yet</p>
                <p className="text-sm text-white/40">Employee has not submitted any W-9 forms</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-xl border ${
                      doc.status === 'approved'
                        ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30'
                        : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className={`w-4 h-4 ${
                            doc.status === 'approved' ? 'text-[#00D4FF]' : 'text-[#8B5CF6]'
                          }`} />
                          <span className="font-medium text-white truncate">
                            {doc.filename || `W-9 #${index + 1}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.status === 'approved'
                              ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                              : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                          }`}>
                            {doc.status === 'approved' ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          {doc.uploaded_at && new Date(doc.uploaded_at).toString() !== 'Invalid Date' && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(doc)}
                        className="flex-1 text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownload(doc)}
                        className="px-3 text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadBlankW9}
              className="text-[#00D4FF] border-[#00D4FF]/30 hover:bg-[#00D4FF]/10 bg-transparent"
            >
              <FileText className="w-4 h-4 mr-1" />
              Get W-9 Form
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-white/80 border-white/20 hover:bg-white/10 bg-transparent"
            >
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] p-4"
            onClick={() => {
              if (previewingDoc.url) window.URL.revokeObjectURL(previewingDoc.url);
              onClosePreview();
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#8B5CF6]" />
                  <span className="font-medium">{previewingDoc.filename}</span>
                </div>
                <button
                  onClick={() => {
                    if (previewingDoc.url) window.URL.revokeObjectURL(previewingDoc.url);
                    onClosePreview();
                  }}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {previewingDoc.contentType?.includes('pdf') ? (
                  <iframe
                    src={previewingDoc.url}
                    className="w-full h-[70vh] rounded-lg border border-gray-200"
                    title="W-9 Preview"
                  />
                ) : previewingDoc.contentType?.includes('image') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={previewingDoc.url}
                      alt="W-9 Preview"
                      className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Preview not available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
