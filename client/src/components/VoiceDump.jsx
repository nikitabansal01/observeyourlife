import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';

export default function VoiceDump({ onSubmit, processing }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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
      setTranscript('');
      setInterim('');
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    const text = `${transcript} ${interim}`.trim();
    if (!text || processing) return;
    await onSubmit(text);
    setTranscript('');
    setInterim('');
  };

  const displayText = `${transcript} ${interim}`.trim();

  return (
    <section className="voice-panel">
      <div className="voice-panel__header">
        <Sparkles size={20} />
        <div>
          <h2>Voice dump</h2>
          <p>Talk through interviews, status updates, and next steps — I'll sort it out.</p>
        </div>
      </div>

      <div className={`voice-panel__transcript ${listening ? 'voice-panel__transcript--live' : ''}`}>
        {displayText || (
          <span className="voice-panel__placeholder">
            {listening
              ? 'Listening… tell me about your applications'
              : 'Hit the mic and ramble — company, role, interview date, what’s next'}
          </span>
        )}
      </div>

      <div className="voice-panel__actions">
        {supported ? (
          <button
            type="button"
            className={`mic-btn ${listening ? 'mic-btn--active' : ''}`}
            onClick={toggleListening}
            disabled={processing}
            aria-label={listening ? 'Stop recording' : 'Start recording'}
          >
            {listening ? <Square size={22} fill="currentColor" /> : <Mic size={26} />}
            <span>{listening ? 'Stop' : 'Record'}</span>
          </button>
        ) : (
          <p className="voice-panel__unsupported">Voice needs Chrome or Safari. Type below instead.</p>
        )}

        <textarea
          className="voice-panel__textarea"
          placeholder="Or type your update here…"
          value={displayText}
          onChange={(e) => {
            setTranscript(e.target.value);
            setInterim('');
          }}
          rows={3}
        />

        <button
          type="button"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!displayText || processing}
        >
          {processing ? (
            <>
              <Loader2 size={18} className="spin" /> Processing…
            </>
          ) : (
            'Update dashboard'
          )}
        </button>
      </div>
    </section>
  );
}
