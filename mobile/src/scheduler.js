// 로컬 알림으로 알람을 예약한다 (Expo Go에서 무료로 동작하는 1단계 방식).
// 2단계에서 AlarmKit(개발자 계정 필요)으로 바꿀 때는 이 파일만 교체하면 된다.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { planNotifications } from "./logic/alarmPlan";
import { VOICE_STAGES } from "./logic/voiceStages";

const CHANNEL_ID = "alarm";

// 앱이 켜져 있을 때 알림이 와도 배너/소리를 보여준다 (화면은 App.js가 울림 화면으로 전환)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  if (Platform.OS === "android") {
    // 안드로이드는 채널 중요도가 높아야 소리/팝업이 난다
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "알람",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 400, 200, 400],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** 기존 예약을 모두 지우고 계획대로 다시 예약 */
export async function rescheduleAlarm(state) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { alarm, nextRepeatAt, dismissedKeys, settings } = state;
  const plan = planNotifications(alarm, nextRepeatAt, new Date(), dismissedKeys);
  const lang = settings.voiceLang === "en" ? "en" : "ko";

  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${VOICE_STAGES[item.stage][lang]}`,
        body: lang === "en" ? "Tap to open and walk 5 steps (3m) to stop it." : "눌러서 앱을 열고 5걸음(3m) 걸어야 꺼져요.",
        sound: "default",
        data: { type: "alarm", key: item.key },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.date,
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
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
