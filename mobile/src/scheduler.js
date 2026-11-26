// iOS 로컬 알림으로 알람을 예약한다 (Expo Go에서 무료로 동작하는 1단계 방식).
// 2단계에서 AlarmKit(개발자 계정 필요)으로 바꿀 때는 이 파일만 교체하면 된다.
import * as Notifications from "expo-notifications";

import { planNotifications } from "./logic/alarmPlan";

const pad = (n) => String(n).padStart(2, "0");

// 앱이 켜져 있을 때 알림이 와도 배너/소리를 보여준다 (앱 화면은 App.js가 울림 화면으로 전환)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** 기존 예약을 모두 지우고 계획대로 다시 예약 */
export async function rescheduleAlarm(alarm, dismissedDay) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const plan = planNotifications(alarm, new Date(), dismissedDay);
  const label = `${pad(alarm.hour)}:${pad(alarm.minute)}`;

  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.repeatIndex === 0 ? `⏰ ${label} 알람` : "⏰ 아직 안 걸었어요!",
        body: "알림을 눌러 앱을 열고 5걸음(3m) 걸어야 꺼져요.",
        sound: "default",
        data: { type: "alarm", dayKey: item.dayKey },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
    });
  }
  return plan.length;
}

/** 이미 와 있는 알람 알림을 알림센터에서 정리 */
export async function clearDeliveredAlarms() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    /* 무시 */
  }
}
