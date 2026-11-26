import { test } from "node:test";
import assert from "node:assert/strict";
import { StepCounter, confirmedSteps } from "../stepCounter.js";
import {
  planNotifications,
  ringingOccurrence,
  nextRepeatAfter,
  nextAlarmTime,
  occurrenceKey,
  TARGET_STEPS,
  timeUntilText,
} from "../alarmPlan.js";
import { stageForElapsed, isMutedByWalking, VOICE_STAGES } from "../voiceStages.js";

const G = 9.81;
const DT = 20;
function rng(seed) {
  let r = seed;
  return () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5);
}
function walk(c, { seconds, hz = 1.8, amp = 3, start = 0 }) {
  const n = rng(1);
  let t = start;
  for (; t < start + seconds * 1000; t += DT)
    c.addSample({ x: n() * 0.4, y: n() * 0.4, z: G + amp * Math.sin(2 * Math.PI * hz * (t / 1000)) + n() * 0.4 }, t);
  return t;
}
function still(c, { seconds, start = 0 }) {
  const n = rng(7);
  let t = start;
  for (; t < start + seconds * 1000; t += DT) c.addSample({ x: n() * 0.3, y: n() * 0.3, z: G + n() * 0.3 }, t);
  return t;
}

test("목표 걸음은 3m / 0.7m = 5걸음", () => assert.equal(TARGET_STEPS, 5));

test("가만히 있으면 0걸음", () => {
  const c = new StepCounter();
  still(c, { seconds: 30 });
  assert.equal(c.steps, 0);
});

test("10초 걸으면 약 18걸음", () => {
  const c = new StepCounter();
  walk(c, { seconds: 10 });
  assert.ok(c.steps >= 15 && c.steps <= 19, `steps=${c.steps}`);
});

test("빠르게 흔들기(8Hz)는 걸음 아님", () => {
  const c = new StepCounter();
  walk(c, { seconds: 5, hz: 8, amp: 6 });
  assert.ok(c.steps <= 2, `steps=${c.steps}`);
});

test("제자리에서 손을 좌우로 흔드는 건(걷는 박자여도) 걸음 아님", () => {
  const c = new StepCounter();
  const n = rng(3);
  // 폰을 세워 든 채(중력 = z) 좌우(x)로 1.8Hz, 크게 흔들기
  for (let t = 0; t < 8000; t += DT)
    c.addSample({ x: 6 * Math.sin(2 * Math.PI * 1.8 * (t / 1000)) + n() * 0.3, y: n() * 0.3, z: G + n() * 0.3 }, t);
  assert.ok(c.steps <= 1, `steps=${c.steps}`);
});

test("폰을 눕혀 들고 걸어도(중력 = y) 걸음으로 셈", () => {
  const c = new StepCounter();
  const n = rng(5);
  for (let t = 0; t < 10000; t += DT)
    c.addSample({ x: n() * 0.4, y: G + 3 * Math.sin(2 * Math.PI * 1.8 * (t / 1000)), z: n() * 0.4 }, t);
  assert.ok(c.steps >= 15, `steps=${c.steps}`);
});

test("손목을 돌리며 흔들기(폰 방향이 계속 바뀜)는 걸음 아님", () => {
  const c = new StepCounter();
  // 폰이 ±60도로 기울었다 돌아오면서 위아래로도 출렁이는 손 흔들기
  for (let t = 0; t < 8000; t += DT) {
    const s = t / 1000;
    const tilt = (Math.PI / 3) * Math.sin(2 * Math.PI * 1.8 * s);
    const bounce = 4 * Math.sin(2 * Math.PI * 1.8 * s); // 흔드는 박자마다 위아래로도 출렁임
    c.addSample({ x: (G + bounce) * Math.sin(tilt), y: 0, z: (G + bounce) * Math.cos(tilt) }, t);
  }
  assert.ok(c.steps <= 1, `steps=${c.steps}`);
});

test("두 센서가 동의하는 만큼만 걸음 인정", () => {
  // 만보기가 손 흔들기에 속아 8걸음을 세도 가속도가 0이면 2걸음까지만
  assert.equal(confirmedSteps({ pedometer: 8, accel: 0, pedometerOk: true, accelOk: true }), 2);
  // 진짜 걸으면 둘 다 셈
  assert.equal(confirmedSteps({ pedometer: 5, accel: 4, pedometerOk: true, accelOk: true }), 5);
  // 가속도가 흔들기에 속아도 만보기가 0이면 0
  assert.equal(confirmedSteps({ pedometer: 0, accel: 9, pedometerOk: true, accelOk: true }), 0);
  // 만보기 권한이 없으면 가속도만
  assert.equal(confirmedSteps({ pedometer: 0, accel: 5, pedometerOk: false, accelOk: true }), 5);
});

test("한 번 툭 치는 충격은 걸음 아님", () => {
  const c = new StepCounter();
  let t = still(c, { seconds: 2 });
  for (let i = 0; i < 5; i++, t += DT) c.addSample({ x: 0, y: 0, z: G + 8 }, t);
  still(c, { seconds: 3, start: t });
  assert.equal(c.steps, 0);
});

const alarm = { hour: 7, minute: 0, enabled: true };
const at = (d, h, m, sec = 0) => new Date(2026, 10, d, h, m, sec);

test("꺼진 알람 + 반복 없음이면 예약 없음", () => {
  assert.deepEqual(planNotifications({ ...alarm, enabled: false }, null, at(26, 6, 0)), []);
});

test("재알림은 목소리 단계와 같은 0, 1, 3, 10분", () => {
  const plan = planNotifications(alarm, null, at(26, 6, 0));
  assert.deepEqual(plan.slice(0, 4).map((p) => p.date.getMinutes()), [0, 1, 3, 10]);
  assert.deepEqual(plan.slice(0, 4).map((p) => p.stage), [0, 1, 2, 3]);
  assert.equal(plan[4].date.getTime(), at(27, 7, 0).getTime());
  assert.ok(plan.length <= 60);
});

test("미션 완료한 회차는 남은 재알림을 예약하지 않음", () => {
  const now = at(26, 7, 2);
  const plan = planNotifications(alarm, null, now, [occurrenceKey(at(26, 7, 0))]);
  assert.equal(plan[0].date.getTime(), at(27, 7, 0).getTime());
});

test("미완료면 남은 재알림(7:03, 7:10)만", () => {
  const plan = planNotifications(alarm, null, at(26, 7, 2));
  assert.deepEqual(plan.slice(0, 2).map((p) => p.date.getMinutes()), [3, 10]);
});

test("알람 시각 ~30분 사이에만 울림 화면, 완료하면 안 울림", () => {
  assert.equal(ringingOccurrence(alarm, null, at(26, 6, 59)), null);
  const r = ringingOccurrence(alarm, null, at(26, 7, 10));
  assert.equal(r.key, "2026-11-26T07:00");
  assert.equal(r.startedAt.getTime(), at(26, 7, 0).getTime());
  assert.equal(ringingOccurrence(alarm, null, at(26, 7, 31)), null);
  assert.equal(ringingOccurrence(alarm, null, at(26, 7, 10), ["2026-11-26T07:00"]), null);
});

test("자정을 넘어도 어제 23:50 알람을 인식", () => {
  const late = { hour: 23, minute: 50, enabled: true };
  assert.equal(ringingOccurrence(late, null, at(27, 0, 10)).key, "2026-11-26T23:50");
});

test("반복: 7:04에 다 걸으면 30분 뒤 7:34에 다시 울림", () => {
  const done = at(26, 7, 4, 20);
  const next = nextRepeatAfter(done, 30);
  assert.equal(next.getTime(), at(26, 7, 34).getTime());
  const dismissed = ["2026-11-26T07:00"];
  const plan = planNotifications(alarm, next, done, dismissed);
  assert.deepEqual(plan.slice(0, 4).map((p) => p.key), Array(4).fill("2026-11-26T07:34"));
  assert.equal(ringingOccurrence(alarm, next, at(26, 7, 40), dismissed).key, "2026-11-26T07:34");
  assert.equal(nextAlarmTime(alarm, next, done, dismissed).getTime(), next.getTime());
});

test("반복 꺼짐이면 다음 반복 없음", () => {
  assert.equal(nextRepeatAfter(at(26, 7, 4), 0), null);
});

test("매일 알람은 꺼도 반복 알람은 따로 동작", () => {
  const off = { ...alarm, enabled: false };
  const plan = planNotifications(off, at(26, 9, 0), at(26, 8, 0));
  assert.equal(plan.length, 4);
});

test("남은 시간 문구", () => {
  assert.equal(timeUntilText(at(26, 7, 0), at(26, 6, 30)), "30분 후에 울려요");
  assert.equal(timeUntilText(at(27, 7, 0), at(26, 22, 15)), "8시간 45분 후에 울려요");
});

test("목소리 단계: 0초 조용히 → 1분 → 3분 → 10분 최대", () => {
  assert.deepEqual([0, 59, 60, 179, 180, 599, 600, 3000].map(stageForElapsed), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.ok(VOICE_STAGES[0].volume < VOICE_STAGES[3].volume);
});

test("걷기 시작하면 조용, 30초 안 걸으면 다시 울림", () => {
  assert.equal(isMutedByWalking(null, 1000), false);
  assert.equal(isMutedByWalking(1000, 20000), true);
  assert.equal(isMutedByWalking(1000, 31001), false);
});
