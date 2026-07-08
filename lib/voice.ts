type SpeechRecognitionResultEvent = {
  results?: { [index: number]: { [index: number]: { transcript?: string } } };
};

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function speechWindow(): WindowWithSpeech | undefined {
  return typeof window !== 'undefined' ? (window as WindowWithSpeech) : undefined;
}

export function sttSupported(): boolean {
  const w = speechWindow();
  return !!(w?.SpeechRecognition || w?.webkitSpeechRecognition);
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Start dictation; returns a stop() function. Calls onText with the final transcript,
 *  and onEnd whenever recognition ends (result, silence timeout, no-match, or error). */
export function startDictation(onText: (t: string) => void, onEnd?: () => void): () => void {
  const w = speechWindow();
  if (!w) return () => {};
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return () => {};
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript;
    if (t) onText(t);
  };
  rec.onend = () => onEnd?.();
  rec.start();
  return () => rec.stop();
}

export function speak(text: string) {
  if (!ttsSupported()) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function cancelSpeak() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
