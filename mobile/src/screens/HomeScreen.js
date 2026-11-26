import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TARGET_METERS, TARGET_STEPS, timeUntilText } from "../logic/alarmPlan";
import { colors } from "../theme";

const pad = (n) => String(n).padStart(2, "0");

export default function HomeScreen({ state, notice, onChangeAlarm, onTestNow }) {
  const insets = useSafeAreaInsets();
  const { alarm, history } = state;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const pickerValue = new Date();
  pickerValue.setHours(alarm.hour, alarm.minute, 0, 0);
  const last = history[history.length - 1];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.appName}>disc doctor</Text>
      </View>

      <Text style={styles.title}>걸어야 꺼지는 알람</Text>
      <Text style={styles.desc}>
        알람이 울리면 {TARGET_STEPS}걸음(약 {TARGET_METERS}m) 걸어야 꺼져요.{"\n"}회원가입 없이 바로 쓰세요.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.time, !alarm.enabled && styles.timeOff]}>
            {pad(alarm.hour)}:{pad(alarm.minute)}
          </Text>
          <Switch
            value={alarm.enabled}
            onValueChange={(enabled) => onChangeAlarm({ ...alarm, enabled })}
            trackColor={{ true: colors.brand }}
            accessibilityLabel="알람 켜기"
          />
        </View>
        <Text style={styles.until}>{alarm.enabled ? timeUntilText(alarm, now) : "알람이 꺼져 있어요"}</Text>

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

      <Pressable style={({ pressed }) => [styles.testButton, pressed && styles.pressed]} onPress={onTestNow}>
        <Text style={styles.testText}>지금 울려보기 (테스트)</Text>
      </Pressable>

      <View style={styles.tips}>
        <Text style={styles.tipTitle}>꼭 알아두세요</Text>
        <Text style={styles.tip}>• 알람이 울리면 알림을 눌러 앱을 열고 걸으세요.</Text>
        <Text style={styles.tip}>• 걷기 전까지 1분마다 5번 다시 울려요.</Text>
        <Text style={styles.tip}>• 무음 모드면 알림 소리가 안 날 수 있어요. 앱을 열면 무음이어도 울려요.</Text>
        {last ? (
          <Text style={styles.tip}>
            • 최근 기록: {last.dayKey} {last.steps}걸음 / {last.seconds}초 만에 해제
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
  testButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  pressed: { opacity: 0.6 },
  testText: { fontSize: 16, fontWeight: "700", color: colors.text },
  tips: { marginTop: 24 },
  tipTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
  tip: { fontSize: 13, lineHeight: 20, color: colors.sub },
});
