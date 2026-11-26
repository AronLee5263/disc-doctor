// 알람음(assets/sounds/alarm.wav)을 생성하는 스크립트. 음원 저작권 걱정 없이 직접 만든 비프음.
// 실행: node scripts/make-alarm-sound.mjs
import { writeFileSync } from "node:fs";

const rate = 22050;
const totalSec = 1.2; // 이 길이를 반복 재생
const beeps = [
  [0.0, 880],
  [0.25, 880],
  [0.5, 1175],
];
const samples = new Int16Array(Math.floor(rate * totalSec));
for (const [start, freq] of beeps) {
  const s0 = Math.floor(start * rate);
  const len = Math.floor(0.18 * rate);
  for (let i = 0; i < len; i++) {
    const env = Math.min(1, i / 200, (len - i) / 400); // 클릭음 방지용 페이드
    const square = Math.sin((2 * Math.PI * freq * i) / rate) >= 0 ? 1 : -1;
    samples[s0 + i] = Math.round(square * env * 0.5 * 32767);
  }
}
const data = Buffer.from(samples.buffer);
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write("data", 36); h.writeUInt32LE(data.length, 40);
writeFileSync(new URL("../assets/sounds/alarm.wav", import.meta.url), Buffer.concat([h, data]));
console.log("assets/sounds/alarm.wav 생성 완료");
