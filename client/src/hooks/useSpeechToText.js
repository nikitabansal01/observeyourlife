import { useEffect, useRef, useState, useCallback } from 'react';

function combineText(transcript, interim) {
  if (!interim) return transcript;
  if (!transcript) return interim;
  return `${transcript} ${interim}`;
}

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Browser speech-to-text (Web Speech API). Progressive enhancement only.
 *
 * Chrome often ends a recognition session after brief silence even with
 * continuous=true. We treat "listening" as user intent and restart until
 * the user explicitly stops.
 */
export default function useSpeechToText({ lang = 'en-US', continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!supported) return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText) {
        setTranscript((prev) => combineText(prev, finalText));
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      // Brief silence / normal stop — keep intent if user still wants mic on.
      if (code === 'no-speech' || code === 'aborted') return;
      wantListeningRef.current = false;
      setListening(false);
      setInterim('');
    };

    recognition.onend = () => {
      if (!wantListeningRef.current) {
        setListening(false);
        setInterim('');
        return;
      }
      // Chrome dropped the session; restart so the mic stays active.
      try {
        recognition.start();
        setListening(true);
      } catch {
        // start() throws if already starting; retry shortly.
        window.setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            recognition.start();
            setListening(true);
          } catch {
            wantListeningRef.current = false;
            setListening(false);
          }
        }, 120);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [supported, lang, continuous]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    setInterim('');
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    wantListeningRef.current = true;
    setListening(true);
    try {
      recognitionRef.current?.start();
    } catch {
      // Already started — stay in listening intent.
    }
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (wantListeningRef.current || listening) stop();
    else start();
  }, [supported, listening, start, stop]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  const setText = useCallback((value) => {
    setTranscript(value);
    setInterim('');
  }, []);

  const displayText = combineText(transcript, interim);

  return {
    supported,
    listening,
    transcript,
    interim,
    displayText,
    start,
    stop,
    toggle,
    reset,
    setText,
  };
}
