type SR = { start: () => void; stop: () => void; onresult: ((e: any) => void) | null; onend: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };

export function sttSupported(): boolean {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Start dictation; returns a stop() function. Calls onText with the final transcript,
 *  and onEnd whenever recognition ends (result, silence timeout, no-match, or error). */
export function startDictation(onText: (t: string) => void, onEnd?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return () => {};
  const rec: SR = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (e: any) => {
    const t = e?.results?.[0]?.[0]?.transcript;
    if (t) onText(t);
  };
  rec.onend = () => onEnd?.(); // fires even when no result (silence/timeout/error) — clears the "listening" indicator
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
