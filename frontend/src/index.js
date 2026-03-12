import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import "@/index.css";
import App from "@/App";

// Check if running in Capacitor (mobile app)
const isCapacitor = window.Capacitor !== undefined;

// Only use reCAPTCHA on web, not in mobile app
const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Wrap with reCAPTCHA provider only on web (when site key is available and not in Capacitor)
const AppWithProviders = () => {
  if (reCaptchaSiteKey && !isCapacitor) {
    return (
      <GoogleReCaptchaProvider
        reCaptchaKey={reCaptchaSiteKey}
        language="en"
        scriptProps={{
          async: true,
          defer: true,
          appendTo: "head"
        }}
      >
        <App />
      </GoogleReCaptchaProvider>
    );
  }
  return <App />;
};

root.render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>,
);
