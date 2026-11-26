import { test } from "node:test";
import assert from "node:assert/strict";
import { MovementDetector, StepCounter, GpsTracker, haversineMeters } from "../movementDetector.js";

const G = 9.81;
const SAMPLE_MS = 20; // 50Hz (휴대폰 devicemotion 일반 주기)

// 걸을 때 가속도: 걸음마다 한 번씩 출렁이는 신호 + 약간의 노이즈
function feedWalking(counter, { seconds, stepsPerSec = 1.8, amp = 3, start = 0, seed = 1 }) {
  let rnd = seed;
  const noise = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647 - 0.5) * 0.4;
  let t = start;
  for (; t < start + seconds * 1000; t += SAMPLE_MS) {
    const z = G + amp * Math.sin(2 * Math.PI * stepsPerSec * (t / 1000)) + noise();
    counter.addSample({ x: noise(), y: noise(), z }, t);
  }
  return t;
}

function feedStill(counter, { seconds, start = 0, seed = 7 }) {
  let rnd = seed;
  const noise = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647 - 0.5) * 0.3;
  let t = start;
  for (; t < start + seconds * 1000; t += SAMPLE_MS) counter.addSample({ x: noise(), y: noise(), z: G + noise() }, t);
  return t;
}

test("가만히 있으면 걸음이 0", () => {
  const c = new StepCounter();
  feedStill(c, { seconds: 30 });
  assert.equal(c.steps, 0);
});

test("10초 걸으면 걸음 수가 대략 맞다 (1.8걸음/초)", () => {
  const c = new StepCounter();
  feedWalking(c, { seconds: 10 });
  assert.ok(c.steps >= 15 && c.steps <= 19, `steps=${c.steps}`);
});

test("한 번 툭 치는 충격은 걸음으로 세지 않는다", () => {
  const c = new StepCounter();
  let t = feedStill(c, { seconds: 2 });
  for (let i = 0; i < 5; i++, t += SAMPLE_MS) c.addSample({ x: 0, y: 0, z: G + 8 }, t);
  feedStill(c, { seconds: 3, start: t });
  assert.equal(c.steps, 0);
});

test("빠르게 흔들기(8Hz)는 걸음으로 세지 않는다", () => {
  const c = new StepCounter();
  feedWalking(c, { seconds: 5, stepsPerSec: 8, amp: 6 });
  assert.ok(c.steps <= 2, `steps=${c.steps}`);
});

test("5걸음 정도 걸으면 3m 달성으로 해제", () => {
  const d = new MovementDetector();
  const c = { addSample: (a, t) => d.addMotion(a, t) };
  feedStill(c, { seconds: 1 });
  assert.equal(d.done, false);
  feedWalking(c, { seconds: 3.5, start: 1000 }); // 약 6걸음
  assert.equal(d.done, true, JSON.stringify(d.snapshot()));
  assert.ok(d.meters >= 3);
});

test("하버사인 거리 계산", () => {
  const a = { latitude: 37.5665, longitude: 126.978 };
  const b = { latitude: 37.5665 + 3 / 111320, longitude: 126.978 };
  assert.ok(Math.abs(haversineMeters(a, b) - 3) < 0.05);
});

const offset = (base, northM, accuracy) => ({
  latitude: base.latitude + northM / 111320,
  longitude: base.longitude,
  accuracy,
});
const BASE = { latitude: 37.5665, longitude: 126.978 };

test("GPS 오차가 큰 값(실내 20m)은 무시해서 오작동하지 않는다", () => {
  const g = new GpsTracker();
  for (let i = 0; i < 10; i++) g.addPosition(offset(BASE, (i % 2) * 25, 20));
  assert.equal(g.confirmed, false);
});

test("정확도 좋은 GPS가 연속으로 3m 이상 이동을 보이면 해제", () => {
  const g = new GpsTracker();
  for (let i = 0; i < 3; i++) g.addPosition(offset(BASE, 0, 1.5));
  g.addPosition(offset(BASE, 4, 1.5));
  assert.equal(g.confirmed, false, "1회만으로는 인정 안 함");
  g.addPosition(offset(BASE, 4.5, 1.5));
  assert.equal(g.confirmed, true);
});

test("GPS가 한 번 튀었다 돌아오면 인정하지 않는다", () => {
  const g = new GpsTracker();
  for (let i = 0; i < 3; i++) g.addPosition(offset(BASE, 0, 2));
  g.addPosition(offset(BASE, 8, 2));
  g.addPosition(offset(BASE, 0.5, 2));
  g.addPosition(offset(BASE, 9, 2));
  assert.equal(g.confirmed, false);
});
