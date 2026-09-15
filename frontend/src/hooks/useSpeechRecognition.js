import { useState, useRef, useCallback, useEffect } from "react";

// Short confirmation beep using Web Audio API
function playConfirmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

/**
 * Hook for browser-native speech recognition (Web Speech API).
 * Works on Chrome, Edge, Safari. Falls back gracefully if unsupported.
 * Plays a confirmation tone when speech is recognized.
 */
export default function useSpeechRecognition({ onResult, onEnd, continuous = false, lang = "en-US" } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const processedIndexRef = useRef(0);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    processedIndexRef.current = 0;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      // Only process NEW final results (not already-processed ones)
      let newText = "";
      for (let i = processedIndexRef.current; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + " ";
          processedIndexRef.current = i + 1;
        }
      }
      newText = newText.trim();
      if (newText) {
        playConfirmSound();
        if (onResult) onResult(newText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (onEnd) onEnd();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, continuous, onResult, onEnd]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, isSupported, start, stop, toggle };
}
