// Web Audio API로 알람음 생성 (음원 파일 불필요)
// 브라우저 자동재생 정책 때문에, unlock()은 사용자 클릭 시점에 호출해야 나중에 소리가 난다.

let ctx = null;
let timer = null;

export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  // iOS 잠금 해제용 무음 1프레임 재생
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

function beep(at, freq) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

export function startAlarmSound() {
  stopAlarmSound();
  if (!ctx) unlockAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const pattern = () => {
    const t = ctx.currentTime;
    beep(t, 880);
    beep(t + 0.25, 880);
    beep(t + 0.5, 1175);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  };
  pattern();
  timer = setInterval(pattern, 1200);
}

export function stopAlarmSound() {
  if (timer) clearInterval(timer);
  timer = null;
  if (navigator.vibrate) navigator.vibrate(0);
}
