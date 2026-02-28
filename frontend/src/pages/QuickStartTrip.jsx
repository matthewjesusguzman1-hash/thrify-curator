import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation, PlayCircle, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuickStartTrip() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking, ready, starting, started, error
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Redirect to login if not authenticated
      toast.error("Please log in first");
      navigate("/admin");
      return;
    }

    // Get current location
    if (navigator.geolocation) {
      setStatus("getting_location");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setStatus("ready");
        },
        (error) => {
          console.error("Location error:", error);
          setErrorMsg("Could not get your location. Please enable location services.");
          setStatus("error");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
      setStatus("error");
    }
  }, [navigate]);

  const startTrip = async () => {
    if (!location) {
      toast.error("Location not available");
      return;
    }

    setStatus("starting");
    
    try {
      // Check for existing active trip first
      const activeResponse = await axios.get(`${API}/admin/mileage/active-trip`, getAuthHeader());
      
      if (activeResponse.data) {
        toast.info("You already have an active trip!");
        navigate("/admin");
        return;
      }

      // Start the trip
      const response = await axios.post(
        `${API}/admin/mileage/start-trip`,
        {
          start_location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          start_address: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        },
        getAuthHeader()
      );

      if (response.data) {
        // Store active trip in localStorage for the main app
        localStorage.setItem("thrifty_curator_active_trip", JSON.stringify({
          id: response.data.id,
          start_time: response.data.start_time,
          start_location: response.data.start_location
        }));
        
        setStatus("started");
        toast.success("Trip started!");
        
        // Redirect to main dashboard after a short delay
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to start trip:", error);
      setErrorMsg(error.response?.data?.detail || "Failed to start trip");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        {/* Logo/Icon */}
        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <Navigation className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quick Start Trip</h1>
        
        {/* Status Messages */}
        {status === "checking" && (
          <p className="text-gray-500 mb-6">Checking authentication...</p>
        )}
        
        {status === "getting_location" && (
          <div className="mb-6">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Getting your location...</p>
          </div>
        )}

        {status === "ready" && location && (
          <div className="mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Location Ready</span>
              </div>
              <p className="text-sm text-gray-500">
                Accuracy: {Math.round(location.accuracy)}m
              </p>
            </div>
            <Button
              onClick={startTrip}
              className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
            >
              <PlayCircle className="w-6 h-6 mr-2" />
              Start Trip Now
            </Button>
          </div>
        )}

        {status === "starting" && (
          <div className="mb-6">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Starting your trip...</p>
          </div>
        )}

        {status === "started" && (
          <div className="mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-emerald-600 font-medium">Trip Started!</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-red-600 font-medium mb-2">Error</p>
            <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {/* Back link */}
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-gray-400 hover:text-gray-600 mt-4"
        >
          ← Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
