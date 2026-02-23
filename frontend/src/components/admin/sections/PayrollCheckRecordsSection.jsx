import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  X,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PayrollCheckRecordsSection({ getAuthHeader }) {
  // Section visibility
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check records state
  const [checkRecords, setCheckRecords] = useState([]);
  const [checkThumbnails, setCheckThumbnails] = useState({});
  const [loadingCheckRecords, setLoadingCheckRecords] = useState(false);
  const [uploadingCheck, setUploadingCheck] = useState(false);
  const [viewingCheckImage, setViewingCheckImage] = useState(null);
  const [checkUploadData, setCheckUploadData] = useState({
    description: "",
    check_date: new Date().toISOString().split('T')[0],
    amount: "",
    employee_name: ""
  });
  const [pendingCheckImage, setPendingCheckImage] = useState(null);
  const [editingCheckRecord, setEditingCheckRecord] = useState(null);
  const [checkSearchQuery, setCheckSearchQuery] = useState("");
  const [expandedCheckRecords, setExpandedCheckRecords] = useState({});
  const checkInputRef = useRef(null);

  // Helper: Filter check records
  const getFilteredCheckRecords = () => {
    if (!checkSearchQuery.trim()) return checkRecords;
    const query = checkSearchQuery.toLowerCase();
    return checkRecords.filter(record => 
      (record.employee_name?.toLowerCase() || '').includes(query) ||
      (record.description?.toLowerCase() || '').includes(query) ||
      (record.check_date || '').includes(query) ||
      (record.amount?.toString() || '').includes(query)
    );
  };

  // Fetch check records
  const fetchCheckRecords = useCallback(async () => {
    setLoadingCheckRecords(true);
    try {
      const response = await axios.get(`${API}/admin/payroll/check-records`, getAuthHeader());
      setCheckRecords(response.data);
      
      // Load thumbnails for each record
      const thumbnails = {};
      for (const record of response.data) {
        try {
          const imgResponse = await axios.get(`${API}/admin/payroll/check-records/${record.id}/image`, {
            ...getAuthHeader(),
            responseType: 'blob'
          });
          const blob = new Blob([imgResponse.data], { type: imgResponse.headers['content-type'] });
          thumbnails[record.id] = window.URL.createObjectURL(blob);
        } catch (err) {
          console.error(`Failed to load thumbnail for ${record.id}`);
        }
      }
      setCheckThumbnails(thumbnails);
    } catch (error) {
      console.error("Failed to fetch check records:", error);
    } finally {
      setLoadingCheckRecords(false);
    }
  }, [getAuthHeader]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchCheckRecords();
  }, [fetchCheckRecords]);

  // Handle image file selection
  const handleCheckImageUpload = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    
    // Convert to base64 and store for preview
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setPendingCheckImage({
      base64,
      filename: file.name,
      content_type: file.type,
      previewUrl
    });
    
    toast.success("Image ready for upload. Fill in details and click Submit.");
  };

  // Submit check record (create or update)
  const handleSubmitCheckRecord = async () => {
    if (!pendingCheckImage && !editingCheckRecord) {
      toast.error("Please select an image first");
      return;
    }
    
    setUploadingCheck(true);
    
    try {
      // Helper to parse amount (strip $ and parse as float)
      const parseAmount = (value) => {
        if (!value) return null;
        const cleaned = value.toString().replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      
      if (editingCheckRecord) {
        // Update existing record
        const payload = {
          description: checkUploadData.description || null,
          check_date: checkUploadData.check_date || null,
          amount: parseAmount(checkUploadData.amount),
          employee_name: checkUploadData.employee_name || null
        };
        
        // If new image was selected, include it
        if (pendingCheckImage) {
          payload.image_data = pendingCheckImage.base64;
          payload.filename = pendingCheckImage.filename;
          payload.content_type = pendingCheckImage.content_type;
        }
        
        await axios.put(`${API}/admin/payroll/check-records/${editingCheckRecord.id}`, payload, getAuthHeader());
        toast.success("Check record updated successfully!");
        setEditingCheckRecord(null);
      } else {
        // Create new record
        const payload = {
          image_data: pendingCheckImage.base64,
          filename: pendingCheckImage.filename,
          content_type: pendingCheckImage.content_type,
          description: checkUploadData.description || null,
          check_date: checkUploadData.check_date || null,
          amount: parseAmount(checkUploadData.amount),
          employee_name: checkUploadData.employee_name || null
        };
        
        await axios.post(`${API}/admin/payroll/check-records`, payload, getAuthHeader());
        toast.success("Check record saved successfully!");
      }
      
      // Reset form
      setCheckUploadData({ 
        description: "", 
        check_date: new Date().toISOString().split('T')[0], 
        amount: "", 
        employee_name: "" 
      });
      
      // Cleanup preview URL
      if (pendingCheckImage?.previewUrl) {
        URL.revokeObjectURL(pendingCheckImage.previewUrl);
      }
      setPendingCheckImage(null);
      
      fetchCheckRecords();
    } catch (error) {
      toast.error(editingCheckRecord ? "Failed to update check record" : "Failed to save check record");
    } finally {
      setUploadingCheck(false);
      if (checkInputRef.current) {
        checkInputRef.current.value = "";
      }
    }
  };

  // Edit existing record
  const handleEditCheckRecord = (record) => {
    setEditingCheckRecord(record);
    // Format the amount with $ and .00 when loading for edit
    const formattedAmount = record.amount ? `$${parseFloat(record.amount).toFixed(2)}` : "";
    setCheckUploadData({
      description: record.description || "",
      check_date: record.check_date || new Date().toISOString().split('T')[0],
      amount: formattedAmount,
      employee_name: record.employee_name || ""
    });
    // Clear any pending image
    if (pendingCheckImage?.previewUrl) {
      URL.revokeObjectURL(pendingCheckImage.previewUrl);
    }
    setPendingCheckImage(null);
    toast.info("Edit mode: Update the fields and click Submit to save changes.");
  };

  // Cancel edit mode
  const handleCancelCheckEdit = () => {
    setEditingCheckRecord(null);
    setCheckUploadData({
      description: "",
      check_date: new Date().toISOString().split('T')[0],
      amount: "",
      employee_name: ""
    });
    if (pendingCheckImage?.previewUrl) {
      URL.revokeObjectURL(pendingCheckImage.previewUrl);
    }
    setPendingCheckImage(null);
    if (checkInputRef.current) {
      checkInputRef.current.value = "";
    }
  };

  // Delete record
  const handleDeleteCheckRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this check record?")) return;
    
    try {
      await axios.delete(`${API}/admin/payroll/check-records/${recordId}`, getAuthHeader());
      toast.success("Check record deleted");
      fetchCheckRecords();
    } catch (error) {
      toast.error("Failed to delete check record");
    }
  };

  // View full-size image
  const handleViewCheckImage = async (recordId) => {
    try {
      const response = await axios.get(`${API}/admin/payroll/check-records/${recordId}/image`, {
        ...getAuthHeader(),
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      setViewingCheckImage({ url, recordId });
    } catch (error) {
      toast.error("Failed to load check image");
    }
  };

  // Close image viewer
  const closeCheckImageViewer = () => {
    if (viewingCheckImage?.url) {
      window.URL.revokeObjectURL(viewingCheckImage.url);
    }
    setViewingCheckImage(null);
  };

  // Toggle expand/collapse for individual record
  const toggleRecordExpand = (recordId) => {
    setExpandedCheckRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Expand/collapse all records
  const toggleAllRecords = (expand) => {
    const newState = {};
    checkRecords.forEach(record => {
      newState[record.id] = expand;
    });
    setExpandedCheckRecords(newState);
  };

  const filteredRecords = getFilteredCheckRecords();
  const allExpanded = checkRecords.length > 0 && checkRecords.every(r => expandedCheckRecords[r.id]);

  return (
    <>
      <div className="dashboard-card">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => {
            const willOpen = !isExpanded;
            setIsExpanded(willOpen);
            if (willOpen) {
              fetchCheckRecords();
            }
          }}
          data-testid="check-records-section-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#333]">Payroll Check Records</h2>
              <p className="text-xs text-[#888]">{checkRecords.length} records stored</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); fetchCheckRecords(); }}
              className="text-[#888]"
            >
              Refresh
            </Button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#888]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#888]" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[#eee]">
                {/* Upload Section */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl mb-4">
                  <h3 className="font-medium text-[#333] mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-600" />
                    {editingCheckRecord ? 'Edit Check Record' : 'Upload Check Photo'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-[#666]">Employee Name</Label>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        value={checkUploadData.employee_name}
                        onChange={(e) => setCheckUploadData({ ...checkUploadData, employee_name: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#666]">Check Date</Label>
                      <Input
                        type="date"
                        value={checkUploadData.check_date}
                        onChange={(e) => setCheckUploadData({ ...checkUploadData, check_date: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#666]">Amount ($)</Label>
                      <Input
                        type="text"
                        placeholder="$0.00"
                        value={checkUploadData.amount}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9.]/g, '');
                          setCheckUploadData({ ...checkUploadData, amount: value });
                        }}
                        onBlur={(e) => {
                          let value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value) {
                            const num = parseFloat(value);
                            if (!isNaN(num)) {
                              setCheckUploadData({ ...checkUploadData, amount: `$${num.toFixed(2)}` });
                            }
                          }
                        }}
                        onFocus={(e) => {
                          let value = e.target.value.replace(/[^0-9.]/g, '');
                          setCheckUploadData({ ...checkUploadData, amount: value });
                        }}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#666]">Description</Label>
                      <Input
                        type="text"
                        placeholder="Weekly pay"
                        value={checkUploadData.description}
                        onChange={(e) => setCheckUploadData({ ...checkUploadData, description: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Image Upload */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs text-[#666] block mb-1">
                        {editingCheckRecord ? 'Replace Image (optional)' : 'Select Image'}
                      </Label>
                      <input
                        ref={checkInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCheckImageUpload(e.target.files[0])}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-purple-50 file:text-purple-700
                          hover:file:bg-purple-100"
                      />
                    </div>
                    
                    {/* Preview */}
                    {pendingCheckImage && (
                      <div className="relative">
                        <img 
                          src={pendingCheckImage.previewUrl} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-lg border-2 border-purple-300"
                        />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(pendingCheckImage.previewUrl);
                            setPendingCheckImage(null);
                            if (checkInputRef.current) checkInputRef.current.value = "";
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    {/* Existing image in edit mode */}
                    {editingCheckRecord && checkThumbnails[editingCheckRecord.id] && !pendingCheckImage && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={checkThumbnails[editingCheckRecord.id]} 
                          alt="Current" 
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <span className="text-xs text-gray-500">Current image</span>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {editingCheckRecord && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelCheckEdit}
                          className="text-gray-600"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSubmitCheckRecord}
                        disabled={uploadingCheck || (!pendingCheckImage && !editingCheckRecord)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {uploadingCheck ? "Saving..." : editingCheckRecord ? "Update" : "Submit"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Search and filters */}
                {checkRecords.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name, description, date, or amount..."
                        value={checkSearchQuery}
                        onChange={(e) => setCheckSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                      {checkSearchQuery && (
                        <button
                          onClick={() => setCheckSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAllRecords(!allExpanded)}
                      className="text-xs"
                    >
                      {allExpanded ? 'Collapse All' : 'Expand All'}
                    </Button>
                    <span className="text-xs text-gray-500">
                      Showing {filteredRecords.length} of {checkRecords.length}
                    </span>
                  </div>
                )}

                {/* Records List */}
                {loadingCheckRecords ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>{checkSearchQuery ? 'No matching records found' : 'No check records yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRecords.map((record) => (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        {/* Collapsed row */}
                        <div
                          className="flex items-center gap-3 p-3 bg-white cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleRecordExpand(record.id)}
                        >
                          {/* Thumbnail */}
                          {checkThumbnails[record.id] ? (
                            <img 
                              src={checkThumbnails[record.id]} 
                              alt="Check" 
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Camera className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#333] truncate">
                              {record.employee_name || 'Unnamed'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {record.check_date && (
                                <span>{new Date(record.check_date).toLocaleDateString()}</span>
                              )}
                              {record.amount && (
                                <span className="text-green-600 font-medium">
                                  ${parseFloat(record.amount).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCheckImage(record.id)}
                              className="text-blue-500 hover:text-blue-700 h-8 w-8 p-0"
                              title="View Image"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCheckRecord(record)}
                              className="text-amber-500 hover:text-amber-700 h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCheckRecord(record.id)}
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {/* Expand/collapse indicator */}
                          {expandedCheckRecords[record.id] ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Expanded content */}
                        <AnimatePresence>
                          {expandedCheckRecords[record.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 bg-gray-50 border-t border-gray-100">
                                <div className="flex gap-4">
                                  {/* Large image */}
                                  {checkThumbnails[record.id] && (
                                    <img 
                                      src={checkThumbnails[record.id]} 
                                      alt="Check" 
                                      className="w-48 h-auto max-h-64 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                                      onClick={() => handleViewCheckImage(record.id)}
                                    />
                                  )}
                                  
                                  {/* Details */}
                                  <div className="flex-1 space-y-2 text-sm">
                                    {record.description && (
                                      <div>
                                        <span className="text-gray-500">Description:</span>
                                        <span className="ml-2 text-[#333]">{record.description}</span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-gray-500">Uploaded:</span>
                                      <span className="ml-2 text-[#333]">
                                        {new Date(record.uploaded_at).toLocaleString()}
                                      </span>
                                    </div>
                                    {record.uploaded_by && (
                                      <div>
                                        <span className="text-gray-500">By:</span>
                                        <span className="ml-2 text-[#333]">{record.uploaded_by}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Check Image Viewer Modal */}
      {viewingCheckImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={closeCheckImageViewer}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingCheckImage.url}
              alt="Check"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={closeCheckImageViewer}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
