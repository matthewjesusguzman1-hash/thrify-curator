/**
 * HierarchicalTripList Component
 * Displays trip history in a hierarchical, collapsible format based on selected view
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CalendarDays, ChevronDown } from "lucide-react";
import TripRow from "./TripRow";

const HierarchicalTripList = ({
  tripHistory,
  summaryView,
  summary,
  onViewMap,
  onEdit,
  onDelete,
  getPurposeIcon,
  getPurposeLabel,
  formatDate
}) => {
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  if (!tripHistory || tripHistory.length === 0) {
    return null;
  }

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <h4 className="font-medium text-gray-700 text-sm">
          {summaryView === "today" ? "Today's Trips" : 
           summaryView === "month" ? `${summary?.this_month?.name || "This Month"}'s Trips` :
           `${summary?.year || new Date().getFullYear()} Trips`}
        </h4>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {/* TODAY VIEW - Simple list of today's trips */}
        {summaryView === "today" && (() => {
          const today = new Date().toISOString().split('T')[0];
          const todayTrips = tripHistory.filter(trip => 
            trip.start_time?.split('T')[0] === today
          );
          
          if (todayTrips.length === 0) {
            return (
              <div className="p-4 text-center text-gray-500 text-sm">
                No trips recorded today
              </div>
            );
          }
          
          return todayTrips.map(trip => (
            <TripRow 
              key={trip.id} 
              trip={trip} 
              onViewMap={onViewMap} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              getPurposeIcon={getPurposeIcon} 
              getPurposeLabel={getPurposeLabel} 
              formatDate={formatDate}
            />
          ));
        })()}
        
        {/* MONTH VIEW - Days collapsible, then trips */}
        {summaryView === "month" && (() => {
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          // Group trips by day for current month
          const tripsByDay = {};
          tripHistory.forEach(trip => {
            const tripDate = trip.start_time?.split('T')[0];
            if (tripDate?.startsWith(currentMonth)) {
              if (!tripsByDay[tripDate]) {
                tripsByDay[tripDate] = { trips: [], miles: 0 };
              }
              tripsByDay[tripDate].trips.push(trip);
              tripsByDay[tripDate].miles += trip.total_miles || 0;
            }
          });
          
          const sortedDays = Object.keys(tripsByDay).sort().reverse();
          
          if (sortedDays.length === 0) {
            return (
              <div className="p-4 text-center text-gray-500 text-sm">
                No trips this month
              </div>
            );
          }
          
          return sortedDays.map(day => (
            <div key={day} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                data-testid={`day-accordion-${day}`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm text-gray-700">
                    {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {tripsByDay[day].trips.length} trip{tripsByDay[day].trips.length !== 1 ? 's' : ''} • {tripsByDay[day].miles.toFixed(1)} mi
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              <AnimatePresence>
                {expandedDays[day] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-gray-50"
                  >
                    {tripsByDay[day].trips.map(trip => (
                      <TripRow 
                        key={trip.id} 
                        trip={trip} 
                        onViewMap={onViewMap} 
                        onEdit={onEdit} 
                        onDelete={onDelete} 
                        getPurposeIcon={getPurposeIcon} 
                        getPurposeLabel={getPurposeLabel} 
                        formatDate={formatDate}
                        compact
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ));
        })()}
        
        {/* YEAR VIEW - Months collapsible, then days, then trips */}
        {summaryView === "year" && (() => {
          const currentYear = summary?.year || new Date().getFullYear();
          
          // Group trips by month
          const tripsByMonth = {};
          tripHistory.forEach(trip => {
            const tripDate = trip.start_time?.split('T')[0];
            if (tripDate?.startsWith(String(currentYear))) {
              const month = tripDate.substring(0, 7); // "2026-03"
              if (!tripsByMonth[month]) {
                tripsByMonth[month] = { trips: [], miles: 0, byDay: {} };
              }
              tripsByMonth[month].trips.push(trip);
              tripsByMonth[month].miles += trip.total_miles || 0;
              
              // Also group by day within month
              if (!tripsByMonth[month].byDay[tripDate]) {
                tripsByMonth[month].byDay[tripDate] = { trips: [], miles: 0 };
              }
              tripsByMonth[month].byDay[tripDate].trips.push(trip);
              tripsByMonth[month].byDay[tripDate].miles += trip.total_miles || 0;
            }
          });
          
          const sortedMonths = Object.keys(tripsByMonth).sort().reverse();
          
          if (sortedMonths.length === 0) {
            return (
              <div className="p-4 text-center text-gray-500 text-sm">
                No trips this year
              </div>
            );
          }
          
          return sortedMonths.map(month => {
            const monthDate = new Date(month + '-01T12:00:00');
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const sortedDays = Object.keys(tripsByMonth[month].byDay).sort().reverse();
            
            return (
              <div key={month} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  data-testid={`month-accordion-${month}`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm text-gray-700">{monthName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {tripsByMonth[month].trips.length} trip{tripsByMonth[month].trips.length !== 1 ? 's' : ''} • {tripsByMonth[month].miles.toFixed(1)} mi
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedMonths[month] ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                <AnimatePresence>
                  {expandedMonths[month] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-gray-50"
                    >
                      {sortedDays.map(day => (
                        <div key={day}>
                          <button
                            onClick={() => toggleDay(day)}
                            className="w-full flex items-center justify-between p-2 pl-6 hover:bg-gray-100 transition-colors text-sm"
                            data-testid={`day-accordion-${day}`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-600">
                                {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {tripsByMonth[month].byDay[day].trips.length} • {tripsByMonth[month].byDay[day].miles.toFixed(1)} mi
                              </span>
                              <ChevronDown className={`w-3 h-3 text-gray-300 transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          
                          {/* Trips within Day */}
                          <AnimatePresence>
                            {expandedDays[day] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white"
                              >
                                {tripsByMonth[month].byDay[day].trips.map(trip => (
                                  <TripRow 
                                    key={trip.id} 
                                    trip={trip} 
                                    onViewMap={onViewMap} 
                                    onEdit={onEdit} 
                                    onDelete={onDelete} 
                                    getPurposeIcon={getPurposeIcon} 
                                    getPurposeLabel={getPurposeLabel} 
                                    formatDate={formatDate}
                                    compact
                                    nested
                                  />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default HierarchicalTripList;
