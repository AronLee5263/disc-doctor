// 알람 예약 계획을 계산하는 순수 로직 (테스트 가능)
//
// "알람 1회" = occurrence. 매일 정해진 시각 알람 + (걷기 완료 후) N분 뒤 반복 알람.
// iOS 알림은 사용자가 끄는 걸 막을 수 없으므로, 걷기 미션을 끝낼 때까지 목소리 단계와 같은
// 시점(0, 1, 3, 10분)에 재알림을 미리 예약해 두고, 미션을 끝내면 그 회차의 남은 재알림을 취소한다.

import { VOICE_STAGES } from "./voiceStages.js";

export const TARGET_METERS = 3;
export const STRIDE_METERS = 0.7;
export const TARGET_STEPS = Math.ceil(TARGET_METERS / STRIDE_METERS); // 5걸음

export const PLAN_DAYS = 7; // 앱을 안 열어도 7일치는 미리 예약
export const REPEAT_OFFSETS_MIN = VOICE_STAGES.map((s) => s.atSec / 60); // [0, 1, 3, 10]
export const RING_WINDOW_MINUTES = 30; // 알람 시각 후 30분 안에 앱을 열면 미션 화면
export const MAX_NOTIFICATIONS = 60; // iOS 예약 알림 한도(64) 아래로

const pad = (n) => String(n).padStart(2, "0");

/** 로컬 날짜 키 (YYYY-MM-DD) */
export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 알람 1회를 구분하는 키 (YYYY-MM-DDTHH:MM) */
export function occurrenceKey(d) {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function alarmTimeOn(day, alarm) {
  const d = new Date(day);
  d.setHours(alarm.hour, alarm.minute, 0, 0);
  return d;
}

/**
 * 고려할 알람 회차들 (어제~7일 뒤의 매일 알람 + 반복 알람 1개)
 * @param alarm {hour, minute, enabled}
 * @param nextRepeatAt 다음 반복 알람 시각(ISO 문자열 | Date | null)
 */
export function occurrences(alarm, nextRepeatAt, now) {
  const list = [];
  if (alarm && alarm.enabled) {
    for (let i = -1; i <= PLAN_DAYS; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() + i);
      list.push(alarmTimeOn(day, alarm));
    }
  }
  if (nextRepeatAt) {
    const r = new Date(nextRepeatAt);
    r.setSeconds(0, 0);
    list.push(r);
  }
  const seen = new Set();
  return list
    .sort((a, b) => a - b)
    .filter((d) => {
      const k = occurrenceKey(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/**
 * 앞으로 예약할 알림 목록
 * @returns [{date, key, stage}]
 */
export function planNotifications(alarm, nextRepeatAt, now, dismissedKeys = []) {
  const result = [];
  for (const base of occurrences(alarm, nextRepeatAt, now)) {
    const key = occurrenceKey(base);
    if (dismissedKeys.includes(key)) continue;
    REPEAT_OFFSETS_MIN.forEach((min, stage) => {
      const date = new Date(base.getTime() + min * 60000);
      if (date > now) result.push({ date, key, stage });
    });
  }
  return result.sort((a, b) => a.date - b.date).slice(0, MAX_NOTIFICATIONS);
}

/**
 * 지금 울리고 있어야 하는 알람 회차. 없으면 null.
 * 알람 시각 ~ 30분 사이이고 아직 미션을 안 끝낸 회차 중 가장 최근 것.
 * @returns {key, startedAt: Date} | null
 */
export function ringingOccurrence(alarm, nextRepeatAt, now, dismissedKeys = []) {
  let found = null;
  for (const base of occurrences(alarm, nextRepeatAt, now)) {
    const key = occurrenceKey(base);
    if (dismissedKeys.includes(key)) continue;
    const diff = now.getTime() - base.getTime();
    if (diff >= 0 && diff <= RING_WINDOW_MINUTES * 60000) found = { key, startedAt: base };
  }
  return found;
}

/** 걷기 완료 후 다음 반복 알람 시각 (반복 꺼져 있으면 null) */
export function nextRepeatAfter(now, repeatMinutes) {
  if (!repeatMinutes) return null;
  const d = new Date(now.getTime() + repeatMinutes * 60000);
  d.setSeconds(0, 0);
  return d;
}

/** 다음 알람까지 남은 시간 문구 */
export function timeUntilText(target, now) {
  const mins = Math.max(0, Math.round((target - now) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분 후에 울려요`;
  return m === 0 ? `${h}시간 후에 울려요` : `${h}시간 ${m}분 후에 울려요`;
}

/** 다음에 울릴 알람 시각 (없으면 null) */
export function nextAlarmTime(alarm, nextRepeatAt, now, dismissedKeys = []) {
  const next = occurrences(alarm, nextRepeatAt, now).find(
    (d) => d > now && !dismissedKeys.includes(occurrenceKey(d))
  );
  return next || null;
}
