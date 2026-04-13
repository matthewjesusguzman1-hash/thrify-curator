import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
  Search,
  RefreshCw,
  Users,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentRecordsSection({ getAuthHeader }) {
  // Section visibility
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Tab state - "employee" or "consignment"
  const [activeTab, setActiveTab] = useState("employee");
  
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
    employee_name: "",
    payment_type: "employee",
    consignment_client_email: "",
    commission_split: ""
  });
  const [pendingCheckImage, setPendingCheckImage] = useState(null);
  const [editingCheckRecord, setEditingCheckRecord] = useState(null);
  const [checkSearchQuery, setCheckSearchQuery] = useState("");
  const [expandedCheckRecords, setExpandedCheckRecords] = useState({});
  const checkInputRef = useRef(null);
  
  // Consignment clients for dropdown
  const [consignmentClients, setConsignmentClients] = useState([]);
  
  // Employees for dropdown
  const [employees, setEmployees] = useState([]);
  
  // Custom picker modal state (for iOS compatibility)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Helper: Filter check records by type and search
  const getFilteredCheckRecords = () => {
    let filtered = checkRecords.filter(record => 
      (record.payment_type || "employee") === activeTab
    );
    
    if (!checkSearchQuery.trim()) return filtered;
    const query = checkSearchQuery.toLowerCase();
    return filtered.filter(record => 
      (record.employee_name?.toLowerCase() || '').includes(query) ||
      (record.description?.toLowerCase() || '').includes(query) ||
      (record.check_date || '').includes(query) ||
      (record.amount?.toString() || '').includes(query) ||
      (record.consignment_client_email?.toLowerCase() || '').includes(query)
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

  // Fetch consignment clients (only approved agreements)
  const fetchConsignmentClients = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/payroll/consignment-clients`, getAuthHeader());
      console.log("Fetched consignment clients:", response.data.length, response.data);
      setConsignmentClients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch consignment clients:", error);
      setConsignmentClients([]);
    }
  }, [getAuthHeader]);

  // Fetch employees for payment dropdown (all employees except owners)
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/payroll/all-employees-for-payment`, getAuthHeader());
      console.log("Fetched employees for payment:", response.data.length, response.data);
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    }
  }, [getAuthHeader]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchCheckRecords();
    fetchConsignmentClients();
    fetchEmployees();
  }, [fetchCheckRecords, fetchConsignmentClients, fetchEmployees]);

  // Auto-refresh when section is expanded
  useEffect(() => {
    if (isExpanded) {
      fetchCheckRecords();
      fetchConsignmentClients();
      fetchEmployees();
    }
  }, [isExpanded, fetchCheckRecords, fetchConsignmentClients, fetchEmployees]);
  
  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "consignment") {
      fetchConsignmentClients();
    } else if (activeTab === "employee") {
      fetchEmployees();
    }
  }, [activeTab, fetchConsignmentClients, fetchEmployees]);

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
    
    // Validate consignment client selection
    if (activeTab === "consignment" && !checkUploadData.consignment_client_email && !editingCheckRecord) {
      toast.error("Please select a consignment client");
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
          employee_name: checkUploadData.employee_name || null,
          payment_type: checkUploadData.payment_type || activeTab,
          consignment_client_email: checkUploadData.consignment_client_email || null,
          commission_split: activeTab === "consignment" ? (checkUploadData.commission_split || null) : null
        };
        
        // If new image was selected, include it
        if (pendingCheckImage) {
          payload.image_data = pendingCheckImage.base64;
          payload.filename = pendingCheckImage.filename;
          payload.content_type = pendingCheckImage.content_type;
        }
        
        await axios.put(`${API}/admin/payroll/check-records/${editingCheckRecord.id}`, payload, getAuthHeader());
        toast.success("Payment record updated successfully!");
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
          employee_name: checkUploadData.employee_name || null,
          payment_type: activeTab,
          consignment_client_email: activeTab === "consignment" ? checkUploadData.consignment_client_email : null,
          commission_split: activeTab === "consignment" ? (checkUploadData.commission_split || null) : null
        };
        
        await axios.post(`${API}/admin/payroll/check-records`, payload, getAuthHeader());
        toast.success("Payment record saved successfully!");
      }
      
      // Reset form
      setCheckUploadData({ 
        description: "", 
        check_date: new Date().toISOString().split('T')[0], 
        amount: "", 
        employee_name: "",
        payment_type: activeTab,
        consignment_client_email: "",
        commission_split: ""
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
      employee_name: record.employee_name || "",
      payment_type: record.payment_type || "employee",
      consignment_client_email: record.consignment_client_email || "",
      commission_split: record.commission_split || ""
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
      employee_name: "",
      payment_type: activeTab,
      consignment_client_email: "",
      commission_split: ""
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
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    
    try {
      await axios.delete(`${API}/admin/payroll/check-records/${recordId}`, getAuthHeader());
      toast.success("Payment record deleted");
      fetchCheckRecords();
    } catch (error) {
      toast.error("Failed to delete payment record");
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
  const allExpanded = filteredRecords.length > 0 && filteredRecords.every(r => expandedCheckRecords[r.id]);
  
  // Count records by type
  const employeeRecordsCount = checkRecords.filter(r => (r.payment_type || "employee") === "employee").length;
  const consignmentRecordsCount = checkRecords.filter(r => r.payment_type === "consignment").length;

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
            <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#333]">Payment Records</h2>
              <p className="text-xs text-[#888]">{employeeRecordsCount} employee • {consignmentRecordsCount} consignment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => { setActiveTab("employee"); handleCancelCheckEdit(); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      activeTab === "employee"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    data-testid="tab-employee-payments"
                  >
                    <Users className="w-4 h-4" />
                    <span className="whitespace-nowrap">Employee</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === "employee" ? "bg-white/20" : "bg-gray-200"
                    }`}>{employeeRecordsCount}</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("consignment"); handleCancelCheckEdit(); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      activeTab === "consignment"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    data-testid="tab-consignment-payments"
                  >
                    <Package className="w-4 h-4" />
                    <span className="whitespace-nowrap">Consignment</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === "consignment" ? "bg-white/20" : "bg-gray-200"
                    }`}>{consignmentRecordsCount}</span>
                  </button>
                </div>

                {/* Upload Section */}
                <div className={`p-4 rounded-xl mb-4 ${
                  activeTab === "employee" 
                    ? "bg-gradient-to-r from-purple-50 to-purple-100" 
                    : "bg-gradient-to-r from-emerald-50 to-emerald-100"
                }`}>
                  <h3 className="font-medium text-[#333] mb-3 flex items-center gap-2">
                    <Upload className={`w-4 h-4 ${activeTab === "employee" ? "text-purple-600" : "text-emerald-600"}`} />
                    {editingCheckRecord ? 'Edit Payment Record' : activeTab === "employee" ? 'Upload Employee Payment' : 'Upload Consignment Payment'}
                  </h3>
                  
                  {/* Consignment Client Selection (only for consignment tab) */}
                  {activeTab === "consignment" && (
                    <div className="mb-3 relative z-10">
                      <Label className="text-xs text-[#666]">
                        Select Consignment Client * 
                        {consignmentClients.length > 0 && <span className="text-emerald-600 ml-1">({consignmentClients.length} available)</span>}
                      </Label>
                      <button
                        type="button"
                        onClick={() => { setPickerSearch(""); setShowClientPicker(true); }}
                        className="w-full h-10 text-sm border border-gray-300 rounded-md px-3 bg-white text-left flex items-center justify-between hover:border-emerald-500 transition-colors"
                        data-testid="select-consignment-client"
                      >
                        <span className={checkUploadData.consignment_client_email ? "text-gray-900" : "text-gray-500"}>
                          {checkUploadData.consignment_client_email 
                            ? consignmentClients.find(c => c.email === checkUploadData.consignment_client_email)?.full_name || checkUploadData.consignment_client_email
                            : "-- Tap to select a client --"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                  
                  {/* Commission Split (only for consignment tab) */}
                  {activeTab === "consignment" && (
                    <div className="mb-3">
                      <Label className="text-xs text-[#666]">
                        Commission Split
                        <span className="text-gray-400 ml-1">(e.g., 50/50, 60/40)</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="50/50"
                        value={checkUploadData.commission_split}
                        onChange={(e) => setCheckUploadData({ ...checkUploadData, commission_split: e.target.value })}
                        className="h-9 text-sm"
                        data-testid="commission-split-input"
                      />
                    </div>
                  )}
                  
                  {/* Employee Selection (only for employee tab) */}
                  {activeTab === "employee" && !editingCheckRecord && (
                    <div className="mb-3 relative z-10">
                      <Label className="text-xs text-[#666]">
                        Select Employee *
                        {employees.length > 0 && <span className="text-purple-600 ml-1">({employees.length} available)</span>}
                      </Label>
                      <button
                        type="button"
                        onClick={() => { setPickerSearch(""); setShowEmployeePicker(true); }}
                        className="w-full h-10 text-sm border border-gray-300 rounded-md px-3 bg-white text-left flex items-center justify-between hover:border-purple-500 transition-colors"
                        data-testid="select-employee"
                      >
                        <span className={checkUploadData.employee_name ? "text-gray-900" : "text-gray-500"}>
                          {checkUploadData.employee_name || "-- Tap to select an employee --"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-[#666]">{activeTab === "employee" ? "Employee Name" : "Client Name"}</Label>
                      <Input
                        type="text"
                        placeholder={activeTab === "employee" ? "John Doe" : "Client name"}
                        value={checkUploadData.employee_name}
                        onChange={(e) => setCheckUploadData({ ...checkUploadData, employee_name: e.target.value })}
                        className="h-9 text-sm"
                        disabled={!editingCheckRecord}
                        data-testid="payment-name-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#666]">Payment Date</Label>
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
                        placeholder={activeTab === "employee" ? "Weekly pay" : "Consignment payout"}
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
                        className={`block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          ${activeTab === "employee" 
                            ? "file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                            : "file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          }`}
                      />
                    </div>
                    
                    {/* Preview */}
                    {pendingCheckImage && (
                      <div className="relative">
                        <img 
                          src={pendingCheckImage.previewUrl} 
                          alt="Preview" 
                          className={`w-16 h-16 object-cover rounded-lg border-2 ${
                            activeTab === "employee" ? "border-purple-300" : "border-emerald-300"
                          }`}
                        />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(pendingCheckImage.previewUrl);
                            setPendingCheckImage(null);
                            if (checkInputRef.current) checkInputRef.current.value = "";
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-5 h-5" />
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
                        className={activeTab === "employee" 
                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
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
                          <X className="w-5 h-5" />
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
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                      activeTab === "employee" ? "border-purple-600" : "border-emerald-600"
                    }`}></div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {activeTab === "employee" ? (
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    ) : (
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    )}
                    <p>{checkSearchQuery ? 'No matching records found' : `No ${activeTab} payment records yet`}</p>
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
                              alt="Payment" 
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
                              {record.consignment_client_email && (
                                <span className="text-emerald-600 truncate max-w-[150px]" title={record.consignment_client_email}>
                                  {record.consignment_client_email}
                                </span>
                              )}
                              {record.commission_split && (
                                <span className="text-purple-600 text-xs bg-purple-50 px-2 py-0.5 rounded">
                                  {record.commission_split}
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
              alt="Payment"
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

      {/* Employee Picker Modal */}
      {showEmployeePicker && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => setShowEmployeePicker(false)}
        >
          <div
            className="bg-white w-[95%] sm:w-96 rounded-xl max-h-[70vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-purple-50">
                <h3 className="font-semibold text-purple-900">Select Employee</h3>
                <button onClick={() => setShowEmployeePicker(false)} className="p-1 hover:bg-purple-100 rounded">
                  <X className="w-5 h-5 text-purple-600" />
                </button>
              </div>
              <div className="p-3 border-b border-gray-100">
                <Input
                  type="text"
                  placeholder="Search employees..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-[50vh]">
                {employees.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Loading employees...</div>
                ) : (
                  employees
                    .filter(emp => 
                      emp.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                      emp.email?.toLowerCase().includes(pickerSearch.toLowerCase())
                    )
                    .map((employee, index) => (
                      <button
                        key={`picker-emp-${index}`}
                        onClick={() => {
                          setCheckUploadData({
                            ...checkUploadData,
                            employee_name: employee.name,
                            employee_email: employee.email
                          });
                          setShowEmployeePicker(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.email}</div>
                        </div>
                        {employee.role === 'admin' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Admin</span>
                        )}
                      </button>
                    ))
                )}
                {employees.length > 0 && employees.filter(emp => 
                  emp.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                  emp.email?.toLowerCase().includes(pickerSearch.toLowerCase())
                ).length === 0 && (
                  <div className="p-4 text-center text-gray-500">No employees match your search</div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Consignment Client Picker Modal */}
      {showClientPicker && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => setShowClientPicker(false)}
        >
          <div
            className="bg-white w-[95%] sm:w-96 rounded-xl max-h-[70vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-emerald-50">
              <h3 className="font-semibold text-emerald-900">Select Consignment Client</h3>
              <button onClick={() => setShowClientPicker(false)} className="p-1 hover:bg-emerald-100 rounded">
                <X className="w-5 h-5 text-emerald-600" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-100">
              <Input
                type="text"
                placeholder="Search clients..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {consignmentClients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Loading clients...</div>
              ) : (
                consignmentClients
                  .filter(client => 
                    client.full_name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    client.email?.toLowerCase().includes(pickerSearch.toLowerCase())
                  )
                  .map((client, index) => (
                    <button
                      key={`picker-client-${index}`}
                      onClick={() => {
                        setCheckUploadData({
                          ...checkUploadData,
                          consignment_client_email: client.email,
                          employee_name: client.full_name
                        });
                        setShowClientPicker(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{client.full_name}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{client.email}</span>
                        <span className="text-emerald-600">{client.payment_method || "No payment method"}</span>
                      </div>
                    </button>
                  ))
              )}
              {consignmentClients.length > 0 && consignmentClients.filter(client => 
                client.full_name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                client.email?.toLowerCase().includes(pickerSearch.toLowerCase())
              ).length === 0 && (
                <div className="p-4 text-center text-gray-500">No clients match your search</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
