// 폰 로컬 저장소 (회원가입 없이 바로 사용)
// 나중에 유료 기능 + 회원가입을 붙이면, 이 데이터를 그대로 서버에 백업/복원하면 된다.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "discdoctor:v1";

export const DEFAULT_STATE = {
  alarm: { hour: 7, minute: 0, enabled: false },
  settings: {
    voiceLang: "ko", // "ko" | "en"
    forceMode: true, // 켜면: 끄기 버튼 없음 + 무음 모드여도 울림
    repeatMinutes: 0, // 다 걸은 뒤 다시 울릴 간격 (0 = 반복 안 함, 30, 60)
  },
  nextRepeatAt: null, // 다음 반복 알람 시각 (ISO)
  dismissedKeys: [], // 미션을 끝낸 알람 회차 키 (최근 30개)
  history: [], // [{ key, steps, seconds, at }] 완료 기록 (최근 60개)
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...saved,
      alarm: { ...DEFAULT_STATE.alarm, ...saved.alarm },
      settings: { ...DEFAULT_STATE.settings, ...saved.settings },
      dismissedKeys: Array.isArray(saved.dismissedKeys) ? saved.dismissedKeys : [],
      history: Array.isArray(saved.history) ? saved.history : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 실패해도 앱은 계속 동작
  }
}
