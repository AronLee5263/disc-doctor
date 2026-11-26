// 알람 예약 계획을 계산하는 순수 로직 (테스트 가능)
//
// 지금 단계(Expo Go, 무료)에서는 iOS "알림"으로 알람을 울린다.
// 알림은 사용자가 끄는 걸 막을 수 없으므로, 걷기 미션을 완료할 때까지
// 1분 간격 "재알림"을 미리 여러 개 예약해 두고, 미션을 완료하면 그날 남은 재알림을 취소한다.

export const TARGET_METERS = 3;
export const STRIDE_METERS = 0.7;
export const TARGET_STEPS = Math.ceil(TARGET_METERS / STRIDE_METERS); // 5걸음

export const PLAN_DAYS = 7; // 앱을 안 열어도 7일치는 미리 예약 (iOS 예약 알림 최대 64개)
export const REPEAT_MINUTES = [0, 1, 2, 3, 4, 5]; // 정각 + 1분 간격 재알림 5번
export const RING_WINDOW_MINUTES = 30; // 알람 시각 후 30분 안에 앱을 열면 미션 화면

/** 로컬 날짜 키 (YYYY-MM-DD) */
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 해당 날짜의 알람 시각 */
export function alarmTimeOn(day, alarm) {
  const d = new Date(day);
  d.setHours(alarm.hour, alarm.minute, 0, 0);
  return d;
}

/**
 * 앞으로 예약할 알림 목록.
 * @param alarm {hour, minute, enabled}
 * @param now Date
 * @param dismissedDay 오늘 미션을 이미 완료했다면 그 날짜 키
 * @returns [{date: Date, dayKey: string, repeatIndex: number}]
 */
export function planNotifications(alarm, now, dismissedDay = null) {
  if (!alarm || !alarm.enabled) return [];
  const result = [];
  for (let i = 0; i <= PLAN_DAYS; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const key = dateKey(day);
    if (key === dismissedDay) continue;
    const base = alarmTimeOn(day, alarm);
    for (let r = 0; r < REPEAT_MINUTES.length; r++) {
      const date = new Date(base.getTime() + REPEAT_MINUTES[r] * 60000);
      if (date > now) result.push({ date, dayKey: key, repeatIndex: r });
    }
  }
  return result.filter((_, idx) => idx < 60); // iOS 한도(64) 아래로 유지
}

/**
 * 지금 울리는 중이어야 하는 알람의 날짜 키. 없으면 null.
 * 알람 시각 ~ 30분 사이이고, 그 알람의 미션을 아직 안 했으면 해당 날짜 키를 준다.
 * (23:50 알람을 00:10에 여는 경우처럼 자정을 넘는 경우도 처리하려고 어제 알람도 확인)
 */
export function ringingDayKey(alarm, now, dismissedDay = null) {
  if (!alarm || !alarm.enabled) return null;
  for (const offset of [0, -1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const key = dateKey(day);
    if (key === dismissedDay) continue;
    const diff = now.getTime() - alarmTimeOn(day, alarm).getTime();
    if (diff >= 0 && diff <= RING_WINDOW_MINUTES * 60000) return key;
  }
  return null;
}

/** 다음 알람까지 남은 시간 문구 */
export function timeUntilText(alarm, now) {
  let next = alarmTimeOn(now, alarm);
  if (next <= now) next = new Date(next.getTime() + 24 * 3600000);
  const mins = Math.round((next - now) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분 후에 울려요`;
  return m === 0 ? `${h}시간 후에 울려요` : `${h}시간 ${m}분 후에 울려요`;
}
