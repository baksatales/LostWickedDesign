import { useEffect, useRef, useState } from 'react';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = Event & { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = Event & { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function SpeechDictationButton({
  value,
  onChange,
  maxLength = 8000,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => () => recognition.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const browser = window as SpeechWindow;
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage('Dictation is not supported by this browser. You can still type your text.');
      return;
    }

    setMessage('Listening. Speak clearly, then select Stop dictation.');
    const instance = new Recognition();
    recognition.current = instance;
    instance.lang = 'en-IN';
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = event => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter(result => result.isFinal)
        .map(result => result[0].transcript.trim())
        .filter(Boolean)
        .join(' ');
      if (transcript) {
        const current = valueRef.current.trim();
        const next = `${current}${current ? ' ' : ''}${transcript}`.slice(0, maxLength);
        valueRef.current = next;
        onChangeRef.current(next);
        setMessage('Dictation added to the text field. Review it before using Sahayak.');
      }
    };
    instance.onerror = event => {
      setMessage(event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow it in your browser or type instead.'
        : `Dictation stopped (${event.error}). You can try again or type instead.`);
      setListening(false);
    };
    instance.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    try {
      instance.start();
      setListening(true);
    } catch {
      setListening(false);
      setMessage('Dictation could not start. Check microphone access or type instead.');
    }
  };

  return (
    <div className="bk-dictation">
      <button type="button" className="bk-btn secondary" aria-pressed={listening} onClick={toggle}>
        {listening ? 'Stop dictation' : 'Dictate with microphone'}
      </button>
      <small role="status" aria-live="polite">
        {message || 'Dictation is started only when you press this button. Browser speech support varies.'}
      </small>
    </div>
  );
}
