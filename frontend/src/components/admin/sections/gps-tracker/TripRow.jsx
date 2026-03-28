/**
 * TripRow Component
 * Reusable row for displaying trip information in lists
 */
import { Button } from "@/components/ui/button";
import { Map, Pencil, Trash2 } from "lucide-react";

const TripRow = ({ 
  trip, 
  onViewMap, 
  onEdit, 
  onDelete, 
  getPurposeIcon, 
  getPurposeLabel, 
  formatDate, 
  compact = false, 
  nested = false 
}) => {
  const PurposeIcon = getPurposeIcon(trip.purpose);
  
  return (
    <div 
      className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} ${nested ? 'pl-12' : compact ? 'pl-6' : ''} hover:bg-gray-100 transition-colors border-b border-gray-50 last:border-b-0`}
      data-testid={`trip-row-${trip.id}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <PurposeIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} text-gray-800 truncate`}>
            {getPurposeLabel(trip.purpose)}
            {trip.notes && <span className="text-gray-500 font-normal"> - {trip.notes}</span>}
          </p>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
            {trip.total_miles?.toFixed(2)} mi • ${trip.tax_deduction?.toFixed(2)}
            {!compact && ` • ${formatDate(trip.start_time)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewMap(trip.id)}
          className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
          data-testid={`view-map-btn-${trip.id}`}
        >
          <Map className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(trip)}
          className="text-blue-500 hover:text-blue-700 h-7 w-7 p-0"
          data-testid={`edit-trip-btn-${trip.id}`}
        >
          <Pencil className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(trip.id)}
          className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
          data-testid={`delete-trip-btn-${trip.id}`}
        >
          <Trash2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        </Button>
      </div>
    </div>
  );
};

export default TripRow;
