import { test } from "node:test";
import assert from "node:assert/strict";
import { StepCounter } from "../stepCounter.js";
import { planNotifications, ringingDayKey, dateKey, TARGET_STEPS, timeUntilText } from "../alarmPlan.js";

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

test("한 번 툭 치는 충격은 걸음 아님", () => {
  const c = new StepCounter();
  let t = still(c, { seconds: 2 });
  for (let i = 0; i < 5; i++, t += DT) c.addSample({ x: 0, y: 0, z: G + 8 }, t);
  still(c, { seconds: 3, start: t });
  assert.equal(c.steps, 0);
});

const alarm = { hour: 7, minute: 0, enabled: true };

test("꺼진 알람은 예약하지 않음", () => {
  assert.deepEqual(planNotifications({ ...alarm, enabled: false }, new Date(2026, 10, 26, 6, 0)), []);
});

test("알람 전이면 오늘 정각 + 재알림 5개부터 예약, 60개 이하", () => {
  const plan = planNotifications(alarm, new Date(2026, 10, 26, 6, 0));
  assert.equal(plan[0].date.getTime(), new Date(2026, 10, 26, 7, 0).getTime());
  assert.equal(plan[5].date.getTime(), new Date(2026, 10, 26, 7, 5).getTime());
  assert.equal(plan[6].date.getTime(), new Date(2026, 10, 27, 7, 0).getTime());
  assert.ok(plan.length <= 60);
});

test("오늘 미션을 완료하면 오늘 남은 재알림은 예약하지 않음", () => {
  const now = new Date(2026, 10, 26, 7, 1, 30);
  const plan = planNotifications(alarm, now, dateKey(now));
  assert.equal(plan[0].dayKey, "2026-11-27");
});

test("미션 미완료면 남은 재알림(7:02~7:05)만 예약", () => {
  const plan = planNotifications(alarm, new Date(2026, 10, 26, 7, 1, 30));
  assert.deepEqual(plan.slice(0, 4).map((p) => p.date.getMinutes()), [2, 3, 4, 5]);
});

test("알람 시각 ~30분 사이에 앱을 열면 울림 화면", () => {
  assert.equal(ringingDayKey(alarm, new Date(2026, 10, 26, 6, 59)), null);
  assert.equal(ringingDayKey(alarm, new Date(2026, 10, 26, 7, 10)), "2026-11-26");
  assert.equal(ringingDayKey(alarm, new Date(2026, 10, 26, 7, 31)), null);
  assert.equal(ringingDayKey(alarm, new Date(2026, 10, 26, 7, 10), "2026-11-26"), null, "이미 완료");
});

test("자정을 넘어도 어제 23:50 알람을 인식", () => {
  const late = { hour: 23, minute: 50, enabled: true };
  assert.equal(ringingDayKey(late, new Date(2026, 10, 27, 0, 10)), "2026-11-26");
});

test("남은 시간 문구", () => {
  assert.equal(timeUntilText(alarm, new Date(2026, 10, 26, 6, 30)), "30분 후에 울려요");
  assert.equal(timeUntilText(alarm, new Date(2026, 10, 26, 7, 0)), "24시간 후에 울려요");
  assert.equal(timeUntilText(alarm, new Date(2026, 10, 26, 22, 15)), "8시간 45분 후에 울려요");
});
