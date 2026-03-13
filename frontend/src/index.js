import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import "@/index.css";
import App from "@/App";

// Check if running in Capacitor (mobile app) or as a standalone PWA
const isCapacitor = window.Capacitor !== undefined;
const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true || // iOS Safari
                        document.referrer.includes('android-app://'); // Android TWA

// Only use reCAPTCHA on regular web browser, not in mobile app or PWA standalone mode
const reCaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";
const shouldUseRecaptcha = reCaptchaSiteKey && !isCapacitor && !isStandalonePWA;

const root = ReactDOM.createRoot(document.getElementById("root"));

// Wrap with reCAPTCHA provider only on regular web browser
const AppWithProviders = () => {
  if (shouldUseRecaptcha) {
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
