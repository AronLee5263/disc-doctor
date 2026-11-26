// 폰 로컬 저장소 (회원가입 없이 바로 사용)
// 나중에 유료 기능 + 회원가입을 붙이면, 이 데이터를 그대로 서버에 백업/복원하면 된다.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "discdoctor:v1";

export const DEFAULT_STATE = {
  alarm: { hour: 7, minute: 0, enabled: false },
  dismissedDay: null, // 미션을 완료한 마지막 알람 날짜 (YYYY-MM-DD)
  history: [], // [{ dayKey, steps, seconds, at }] 미션 완료 기록 (최근 60개)
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...saved, alarm: { ...DEFAULT_STATE.alarm, ...saved.alarm } };
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
