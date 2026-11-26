import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";

import HomeScreen from "./src/screens/HomeScreen";
import RingingScreen from "./src/screens/RingingScreen";
import DoneScreen from "./src/screens/DoneScreen";
import { loadState, saveState } from "./src/storage";
import { clearDeliveredAlarms, ensureNotificationPermission, rescheduleAlarm } from "./src/scheduler";
import { ringingDayKey } from "./src/logic/alarmPlan";

// 데이터 로딩이 끝날 때까지만 스플래시(로고)를 보여준다. 일부러 기다리게 하지 않음.
SplashScreen.preventAutoHideAsync().catch(() => {});

const TEST_RING = "test";

export default function App() {
  const [state, setState] = useState(null);
  const [ringing, setRinging] = useState(null); // null | 날짜 키 | TEST_RING
  const [doneResult, setDoneResult] = useState(null);
  const [notice, setNotice] = useState("");
  const stateRef = useRef(null);
  const rescheduleTimer = useRef(null);
  stateRef.current = state;

  const updateState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveState(next);
      return next;
    });
  }, []);

  // 지금이 알람 시각(~30분)인데 아직 안 걸었으면 울림 화면으로
  const checkRinging = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const key = ringingDayKey(s.alarm, new Date(), s.dismissedDay);
    if (key) setRinging((cur) => cur ?? key);
  }, []);

  // 1) 앱 시작: 저장된 데이터 로드 → 알람 다시 예약(7일치 보충) → 스플래시 닫기
  useEffect(() => {
    (async () => {
      const loaded = await loadState();
      setState(loaded);
      stateRef.current = loaded;
      checkRinging();
      SplashScreen.hideAsync().catch(() => {});
      if (loaded.alarm.enabled) rescheduleAlarm(loaded.alarm, loaded.dismissedDay).catch(() => {});
    })();
  }, [checkRinging]);

  // 2) 알림을 눌러서 들어오거나, 앱이 켜진 상태에서 알림이 오거나, 앱으로 돌아왔을 때
  useEffect(() => {
    const subs = [
      Notifications.addNotificationResponseReceivedListener(() => checkRinging()),
      Notifications.addNotificationReceivedListener((n) => {
        if (n.request.content.data?.type === "alarm") checkRinging();
      }),
      AppState.addEventListener("change", (s) => s === "active" && checkRinging()),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [checkRinging]);

  const onChangeAlarm = useCallback(
    async (alarm) => {
      updateState((prev) => ({ ...prev, alarm }));
      setNotice("");
      if (alarm.enabled) {
        const granted = await ensureNotificationPermission();
        if (!granted) setNotice("알림 권한이 꺼져 있어요. 설정 > 알림에서 허용해야 알람이 울려요.");
      }
      // 시간 휠을 돌리는 동안 매번 예약하지 않도록 잠깐 기다렸다가 예약
      clearTimeout(rescheduleTimer.current);
      rescheduleTimer.current = setTimeout(() => {
        rescheduleAlarm(alarm, stateRef.current?.dismissedDay).catch(() => {});
      }, 700);
    },
    [updateState]
  );

  const onComplete = useCallback(
    (result) => {
      const key = ringing;
      setRinging(null);
      setDoneResult(result);
      if (key && key !== TEST_RING) {
        const s = stateRef.current;
        const history = [...s.history, { dayKey: key, ...result, at: new Date().toISOString() }].slice(-60);
        updateState({ ...s, dismissedDay: key, history });
        clearDeliveredAlarms();
        rescheduleAlarm(s.alarm, key).catch(() => {}); // 오늘 남은 재알림 취소
      }
    },
    [ringing, updateState]
  );

  if (!state) return null;

  let screen;
  if (ringing) screen = <RingingScreen onComplete={onComplete} />;
  else if (doneResult) screen = <DoneScreen result={doneResult} onClose={() => setDoneResult(null)} />;
  else
    screen = (
      <HomeScreen state={state} notice={notice} onChangeAlarm={onChangeAlarm} onTestNow={() => setRinging(TEST_RING)} />
    );

  return (
    <SafeAreaProvider>
      <StatusBar style={ringing ? "light" : "dark"} />
      {screen}
    </SafeAreaProvider>
  );
}
