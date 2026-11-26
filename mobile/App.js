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
import { nextRepeatAfter, ringingOccurrence } from "./src/logic/alarmPlan";

// 데이터 로딩이 끝날 때까지만 스플래시(로고)를 보여준다. 일부러 기다리게 하지 않음.
SplashScreen.preventAutoHideAsync().catch(() => {});

const TEST_KEY = "test";

export default function App() {
  const [state, setState] = useState(null);
  const [ringing, setRinging] = useState(null); // null | { key, startedAt }
  const [doneResult, setDoneResult] = useState(null);
  const [notice, setNotice] = useState("");
  const stateRef = useRef(null);
  const rescheduleTimer = useRef(null);
  stateRef.current = state;

  /** 상태 저장 + (필요하면) 알람 다시 예약 */
  const commit = useCallback((next, { reschedule = false, debounce = 0 } = {}) => {
    stateRef.current = next;
    setState(next);
    saveState(next);
    if (!reschedule) return;
    clearTimeout(rescheduleTimer.current);
    rescheduleTimer.current = setTimeout(() => {
      rescheduleAlarm(stateRef.current).catch(() => {});
    }, debounce);
  }, []);

  // 지금이 알람 시각(~30분)인데 아직 안 걸었으면 울림 화면으로
  const checkRinging = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const occ = ringingOccurrence(s.alarm, s.nextRepeatAt, new Date(), s.dismissedKeys);
    if (occ) setRinging((cur) => cur ?? occ);
  }, []);

  // 1) 앱 시작: 저장된 데이터 로드 → 울릴 때인지 확인 → 스플래시 닫기 → 7일치 다시 예약
  useEffect(() => {
    (async () => {
      const loaded = await loadState();
      stateRef.current = loaded;
      setState(loaded);
      checkRinging();
      SplashScreen.hideAsync().catch(() => {});
      rescheduleAlarm(loaded).catch(() => {});
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

  const askPermission = useCallback(async () => {
    const granted = await ensureNotificationPermission();
    setNotice(granted ? "" : "알림 권한이 꺼져 있어요. 설정 > 알림에서 허용해야 알람이 울려요.");
  }, []);

  const onChangeAlarm = useCallback(
    (alarm) => {
      if (alarm.enabled) askPermission();
      // 시간 휠을 돌리는 동안 매번 예약하지 않도록 잠깐 기다렸다가 예약
      commit({ ...stateRef.current, alarm }, { reschedule: true, debounce: 700 });
    },
    [commit, askPermission]
  );

  const onChangeSettings = useCallback(
    (patch) => {
      const s = stateRef.current;
      commit({ ...s, settings: { ...s.settings, ...patch } }, { reschedule: true });
    },
    [commit]
  );

  const onCancelRepeat = useCallback(() => {
    commit({ ...stateRef.current, nextRepeatAt: null }, { reschedule: true });
  }, [commit]);

  /** 울림 종료 처리. walked=false면 '그냥 끄기'(강제 모드 꺼짐일 때만 가능) */
  const finishRinging = useCallback(
    (result, walked) => {
      const occ = ringing;
      setRinging(null);
      setDoneResult(walked ? result : null);
      if (!occ || occ.key === TEST_KEY) return;

      const s = stateRef.current;
      const now = new Date();
      const next = {
        ...s,
        dismissedKeys: [...s.dismissedKeys.filter((k) => k !== occ.key), occ.key].slice(-30),
        // 다 걸었으면 설정한 간격 뒤에 다시 울림. '그냥 끄기'면 반복도 멈춤.
        nextRepeatAt: walked ? nextRepeatAfter(now, s.settings.repeatMinutes)?.toISOString() ?? null : null,
        history: walked ? [...s.history, { key: occ.key, ...result, at: now.toISOString() }].slice(-60) : s.history,
      };
      clearDeliveredAlarms();
      commit(next, { reschedule: true }); // 이번 회차의 남은 재알림 취소 + 반복 예약
    },
    [ringing, commit]
  );

  if (!state) return null;

  let screen;
  if (ringing) {
    screen = (
      <RingingScreen
        key={ringing.key}
        startedAt={ringing.startedAt}
        settings={state.settings}
        onComplete={(r) => finishRinging(r, true)}
        onStop={() => finishRinging(null, false)}
      />
    );
  } else if (doneResult) {
    screen = (
      <DoneScreen
        result={doneResult}
        nextRepeatAt={state.nextRepeatAt}
        onClose={() => setDoneResult(null)}
      />
    );
  } else {
    screen = (
      <HomeScreen
        state={state}
        notice={notice}
        onChangeAlarm={onChangeAlarm}
        onChangeSettings={onChangeSettings}
        onCancelRepeat={onCancelRepeat}
        onTestNow={() => setRinging({ key: TEST_KEY, startedAt: new Date() })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={ringing ? "light" : "dark"} />
      {screen}
    </SafeAreaProvider>
  );
}
