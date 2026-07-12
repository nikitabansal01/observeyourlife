import { Mic, Square, Loader2, Sparkles, Send } from 'lucide-react';
import useSpeechToText from '../hooks/useSpeechToText';

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
  const speech = useSpeechToText();
  const areaPlaceholder = AREA_PLACEHOLDERS[currentArea] || AREA_PLACEHOLDERS.overview;

  const handleSubmit = async () => {
    const text = speech.displayText.trim();
    if (!text || processing) return;
    if (speech.listening) speech.stop();
    await onSubmit(text);
    speech.reset();
  };

  const placeholder = speech.listening
    ? 'Listening… keep talking'
    : speech.supported
      ? areaPlaceholder
      : 'Type your update (voice needs Chrome or Safari)';

  return (
    <section className="voice-panel">
      <div className="voice-panel__header">
        <Sparkles size={20} />
        <h2>Voice update</h2>
      </div>

      <div className={`voice-compose ${speech.listening ? 'voice-compose--live' : ''}`}>
        <textarea
          className="voice-compose__input"
          placeholder={placeholder}
          value={speech.displayText}
          onChange={(e) => speech.setText(e.target.value)}
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
          {speech.supported && (
            <button
              type="button"
              className={`voice-compose__mic ${speech.listening ? 'voice-compose__mic--active' : ''}`}
              onClick={speech.toggle}
              disabled={processing}
              aria-label={speech.listening ? 'Stop recording' : 'Start recording'}
              aria-pressed={speech.listening}
            >
              {speech.listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}

          <button
            type="button"
            className="voice-compose__send"
            onClick={handleSubmit}
            disabled={!speech.displayText.trim() || processing}
            aria-label={processing ? 'Processing update' : 'Send update'}
          >
            {processing ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </section>
  );
}
