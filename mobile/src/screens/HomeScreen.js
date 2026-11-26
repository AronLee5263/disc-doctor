import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer } from "expo-audio";

import { TARGET_METERS, TARGET_STEPS, nextAlarmTime, timeUntilText } from "../logic/alarmPlan";
import { VOICE_STAGES } from "../logic/voiceStages";
import { VOICE_FILES } from "../voices";
import { colors } from "../theme";

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const STAGE_LABELS = ["바로", "1분 뒤", "3분 뒤", "10분 뒤"];

function Segmented({ options, value, onChange, label }) {
  return (
    <View style={styles.segment} accessibilityLabel={label}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          style={[styles.segmentItem, value === o.value && styles.segmentOn]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// 목소리 미리듣기 (단계별 볼륨 그대로 1번 재생)
function useVoicePreview() {
  const playerRef = useRef(null);
  useEffect(() => {
    playerRef.current = createAudioPlayer(null);
    return () => playerRef.current?.remove();
  }, []);
  return (lang, stage) => {
    const p = playerRef.current;
    if (!p) return;
    p.replace(VOICE_FILES[lang][stage]);
    p.loop = false;
    p.volume = VOICE_STAGES[stage].volume;
    p.play();
  };
}

export default function HomeScreen({ state, notice, onChangeAlarm, onChangeSettings, onCancelRepeat, onTestNow }) {
  const insets = useSafeAreaInsets();
  const { alarm, settings, history, nextRepeatAt, dismissedKeys } = state;
  const [now, setNow] = useState(new Date());
  const preview = useVoicePreview();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const pickerValue = new Date();
  pickerValue.setHours(alarm.hour, alarm.minute, 0, 0);
  const next = nextAlarmTime(alarm, nextRepeatAt, now, dismissedKeys);
  const repeatPending = nextRepeatAt && new Date(nextRepeatAt) > now;
  const last = history[history.length - 1];
  const lang = settings.voiceLang;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.header}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.appName}>disc doctor</Text>
      </View>

      <Text style={styles.title}>걸어야 꺼지는 알람</Text>
      <Text style={styles.desc}>
        알람이 울리면 {TARGET_STEPS}걸음(약 {TARGET_METERS}m) 걸어야 꺼져요.{"\n"}회원가입 없이 바로 쓰세요.
      </Text>

      {/* 알람 시간 */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.time, !alarm.enabled && styles.timeOff]}>
            {pad(alarm.hour)}:{pad(alarm.minute)}
          </Text>
          <Switch
            value={alarm.enabled}
            onValueChange={(enabled) => onChangeAlarm({ ...alarm, enabled })}
            trackColor={{ true: colors.brand }}
            accessibilityLabel="매일 알람 켜기"
          />
        </View>
        <Text style={styles.until}>
          {next ? `다음 알람 ${hhmm(next)} · ${timeUntilText(next, now)}` : "알람이 꺼져 있어요"}
        </Text>
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display="spinner"
          locale="ko-KR"
          onChange={(_, date) => {
            if (date) onChangeAlarm({ hour: date.getHours(), minute: date.getMinutes(), enabled: true });
          }}
        />
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {/* 설정 */}
      <View style={styles.card}>
        <Text style={styles.label}>다 걸은 뒤 다시 울리기</Text>
        <Segmented
          label="반복 간격"
          value={settings.repeatMinutes}
          onChange={(repeatMinutes) => onChangeSettings({ repeatMinutes })}
          options={[
            { value: 0, label: "안 함" },
            { value: 30, label: "30분마다" },
            { value: 60, label: "1시간마다" },
          ]}
        />
        {repeatPending ? (
          <View style={styles.repeatRow}>
            <Text style={styles.small}>반복 알람 {hhmm(new Date(nextRepeatAt))} 예정</Text>
            <Pressable onPress={onCancelRepeat} hitSlop={8}>
              <Text style={styles.link}>이번 반복 취소</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.row, styles.settingRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>강제 모드</Text>
            <Text style={styles.small}>켜면 끄기 버튼이 없고, 무음 모드여도 울려요</Text>
          </View>
          <Switch
            value={settings.forceMode}
            onValueChange={(forceMode) => onChangeSettings({ forceMode })}
            trackColor={{ true: "#ef4444" }}
            accessibilityLabel="강제 모드"
          />
        </View>

        <Text style={[styles.label, styles.settingRow]}>목소리</Text>
        <Segmented
          label="목소리 언어"
          value={lang}
          onChange={(voiceLang) => onChangeSettings({ voiceLang })}
          options={[
            { value: "ko", label: "한국어" },
            { value: "en", label: "English" },
          ]}
        />
        <View style={styles.previewList}>
          {VOICE_STAGES.map((s, i) => (
            <Pressable key={i} style={({ pressed }) => [styles.previewItem, pressed && styles.pressed]} onPress={() => preview(lang, i)}>
              <Text style={styles.previewWhen}>{STAGE_LABELS[i]}</Text>
              <Text style={styles.previewText}>{s[lang]}</Text>
              <Text style={styles.previewPlay}>▶︎</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.testButton, pressed && styles.pressed]} onPress={onTestNow}>
        <Text style={styles.testText}>지금 울려보기 (테스트)</Text>
      </Pressable>

      <View style={styles.tips}>
        <Text style={styles.tipTitle}>꼭 알아두세요</Text>
        <Text style={styles.tip}>• 알람이 울리면 알림을 눌러 앱을 열고 걸으세요.</Text>
        <Text style={styles.tip}>• 걷기 시작하면 바로 조용해지고, 다 걸으면 완전히 꺼져요.</Text>
        <Text style={styles.tip}>• 앱을 열기 전 알림 소리는 폰 기본음이에요. 목소리는 앱을 열면 나와요.</Text>
        {last ? (
          <Text style={styles.tip}>
            • 최근 기록: {last.key.replace("T", " ")} · {last.steps}걸음 / {last.seconds}초 만에 해제
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  logo: { width: 32, height: 32, borderRadius: 8, marginRight: 8 },
  appName: { fontSize: 16, fontWeight: "700", color: colors.text },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  desc: { marginTop: 6, fontSize: 15, lineHeight: 22, color: colors.sub },
  card: { marginTop: 20, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { fontSize: 56, fontWeight: "800", color: colors.brand, fontVariant: ["tabular-nums"] },
  timeOff: { color: "#b8c3cc" },
  until: { fontSize: 14, color: colors.sub, marginBottom: 4 },
  notice: { marginTop: 12, fontSize: 14, color: "#b45309" },
  label: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  small: { fontSize: 13, color: colors.sub },
  link: { fontSize: 13, color: colors.brand, fontWeight: "700" },
  settingRow: { marginTop: 20 },
  repeatRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  segment: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentOn: { backgroundColor: "white", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segmentText: { fontSize: 14, color: colors.sub, fontWeight: "600" },
  segmentTextOn: { color: colors.text },
  previewList: { marginTop: 10 },
  previewItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewWhen: { width: 64, fontSize: 13, color: colors.sub },
  previewText: { flex: 1, fontSize: 15, color: colors.text },
  previewPlay: { fontSize: 14, color: colors.brand },
  testButton: { marginTop: 20, paddingVertical: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.line, alignItems: "center" },
  pressed: { opacity: 0.6 },
  testText: { fontSize: 16, fontWeight: "700", color: colors.text },
  tips: { marginTop: 24 },
  tipTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
  tip: { fontSize: 13, lineHeight: 20, color: colors.sub },
});
