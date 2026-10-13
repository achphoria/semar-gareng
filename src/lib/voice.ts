// Suara Gareng sementara memakai suara bawaan browser (gratis). Tahap 2 diganti layanan TTS pilihan.
const MUTE_KEY = 'gareng-muted';

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* mode privat */ }
  if (v) window.speechSynthesis?.cancel();
}

function indonesianVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang === 'id-ID' && /google/i.test(v.name))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith('id'));
}
// daftar suara dimuat async di Chrome: panggil sekali di awal supaya sudah siap saat dipakai
window.speechSynthesis?.getVoices();

/** Ucapkan teks; onStart/onEnd dipakai orb untuk berganti ke keadaan "bicara" */
export function speak(text: string, onStart?: () => void, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth || isMuted()) { onEnd?.(); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = indonesianVoice();
  if (voice) u.voice = voice;
  u.lang = 'id-ID';
  u.rate = 1.05;
  u.pitch = 1.1;
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}

export const stopSpeaking = () => window.speechSynthesis?.cancel();
