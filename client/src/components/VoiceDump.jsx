import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, Send } from 'lucide-react';

const AREA_PLACEHOLDERS = {
  jobs: 'Interviews, applications, status changes — type or tap the mic',
  health: 'Energy, sleep, exercise — type or tap the mic',
  play: 'What brought you joy — type or tap the mic',
  love: 'Relationships and connection — type or tap the mic',
  work: 'Work philosophy and direction — type or tap the mic',
  compass: 'Work and life meaning — type or tap the mic',
  overview: 'How life feels right now — type or tap the mic',
};

export default function VoiceDump({ onSubmit, processing, currentArea = 'overview' }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const areaPlaceholder = AREA_PLACEHOLDERS[currentArea] || AREA_PLACEHOLDERS.overview;

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setInterim(interimText);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [supported]);

  const toggleListening = () => {
    if (!supported || processing) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    const text = `${transcript} ${interim}`.trim();
    if (!text || processing) return;
    if (listening) recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
    await onSubmit(text);
    setTranscript('');
  };

  const displayText = `${transcript} ${interim}`.trim();
  const placeholder = listening
    ? 'Listening… keep talking'
    : supported
      ? areaPlaceholder
      : 'Type your update (voice needs Chrome or Safari)';

  return (
    <section className="voice-panel">
      <div className="voice-panel__header">
        <Sparkles size={20} />
        <h2>Voice update</h2>
      </div>

      <div className={`voice-compose ${listening ? 'voice-compose--live' : ''}`}>
        <textarea
          className="voice-compose__input"
          placeholder={placeholder}
          value={displayText}
          onChange={(e) => {
            setTranscript(e.target.value);
            setInterim('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={2}
          disabled={processing}
          aria-label="Your update"
        />

        <div className="voice-compose__actions">
          {supported && (
            <button
              type="button"
              className={`voice-compose__mic ${listening ? 'voice-compose__mic--active' : ''}`}
              onClick={toggleListening}
              disabled={processing}
              aria-label={listening ? 'Stop recording' : 'Start recording'}
              aria-pressed={listening}
            >
              {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}

          <button
            type="button"
            className="voice-compose__send"
            onClick={handleSubmit}
            disabled={!displayText || processing}
            aria-label={processing ? 'Processing update' : 'Send update'}
          >
            {processing ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </section>
  );
}
