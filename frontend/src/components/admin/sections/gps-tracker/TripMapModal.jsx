/**
 * TripMapModal Component
 * Modal for viewing trip route on a map
 */
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TripMap = lazy(() => import("@/components/TripMap"));

const TripMapModal = ({
  tripData,
  onClose,
  loading = false,
  formatDate,
  getPurposeLabel
}) => {
  if (!tripData) return null;

  const { trip, locations } = tripData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-800">Trip Route</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500"
              data-testid="close-map-modal-btn"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Trip Info */}
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Date:</span>
              <span className="ml-1 font-medium">{formatDate(trip.start_time)}</span>
            </div>
            <div>
              <span className="text-gray-500">Distance:</span>
              <span className="ml-1 font-medium">{trip.total_miles?.toFixed(2)} mi</span>
            </div>
            <div>
              <span className="text-gray-500">Purpose:</span>
              <span className="ml-1 font-medium">{getPurposeLabel(trip.purpose)}</span>
            </div>
          </div>
        </div>
        
        {/* Map */}
        <div className="p-4">
          {loading ? (
            <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <Suspense fallback={
              <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
              </div>
            }>
              <TripMap 
                locations={locations} 
                height="300px"
              />
            </Suspense>
          )}
        </div>
        
        {/* Trip Stats */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">{trip.total_miles?.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Miles</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">${trip.tax_deduction?.toFixed(2)}</p>
              <p className="text-xs text-gray-500">IRS Deduction</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{locations?.length || 0}</p>
              <p className="text-xs text-gray-500">GPS Points</p>
            </div>
          </div>
          
          {trip.notes && (
            <div className="mt-3 p-2 bg-white rounded border">
              <p className="text-xs text-gray-500">Notes:</p>
              <p className="text-sm">{trip.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TripMapModal;
