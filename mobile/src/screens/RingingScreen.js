import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWalkMission } from "../hooks/useWalkMission";
import { STRIDE_METERS, TARGET_METERS, TARGET_STEPS } from "../logic/alarmPlan";
import { VOICE_STAGES } from "../logic/voiceStages";
import { colors } from "../theme";

// 울리는 화면. 강제 모드면 끄기 버튼 없음 → 걸어야만 꺼진다.
export default function RingingScreen({ startedAt, settings, onComplete, onStop }) {
  const insets = useSafeAreaInsets();
  const lang = settings.voiceLang === "en" ? "en" : "ko";
  const { steps, stage, muted, sensorInfo } = useWalkMission({
    startedAt,
    voiceLang: lang,
    forceMode: settings.forceMode,
    targetSteps: TARGET_STEPS,
    onComplete,
  });

  const shown = Math.min(steps, TARGET_STEPS);
  const meters = Math.min(shown * STRIDE_METERS, TARGET_METERS);
  const noSensor = sensorInfo.pedometer === false && sensorInfo.accelerometer === false;
  const urgent = stage >= 2;

  return (
    <View
      style={[
        styles.screen,
        urgent && styles.urgent,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.center}>
        <Text style={[styles.title, stage === 3 && styles.titleMax]}>{VOICE_STAGES[stage][lang]}</Text>
        <Text style={styles.sub}>
          {muted
            ? "좋아요! 걷는 동안은 조용히 할게요"
            : `폰을 들고 ${TARGET_STEPS}걸음(약 ${TARGET_METERS}m) 걸으면 꺼져요`}
        </Text>

        <View style={styles.dots}>
          {Array.from({ length: TARGET_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i < shown && styles.dotOn]} />
          ))}
        </View>

        <Text style={styles.count} testID="step-count">
          {shown} / {TARGET_STEPS}걸음
        </Text>
        <Text style={styles.meters}>{meters.toFixed(1)}m 이동</Text>

        {sensorInfo.pedometer === false && !noSensor ? (
          <Text style={styles.hint}>'동작 및 피트니스' 권한이 꺼져 있어 가속도 센서로만 측정해요.</Text>
        ) : null}
        {noSensor ? <Text style={styles.hint}>이 기기에서는 걸음 센서를 쓸 수 없어요.</Text> : null}
      </View>

      {!settings.forceMode ? (
        <Pressable style={({ pressed }) => [styles.stop, pressed && { opacity: 0.6 }]} onPress={onStop}>
          <Text style={styles.stopText}>그냥 끄기</Text>
        </Pressable>
      ) : (
        <Text style={styles.force}>강제 모드: 걸어야만 꺼져요</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: 24 },
  urgent: { backgroundColor: "#ef4444" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "white", textAlign: "center" },
  titleMax: { fontSize: 40 },
  sub: { marginTop: 10, fontSize: 16, color: "white", opacity: 0.9, textAlign: "center" },
  dots: { flexDirection: "row", marginTop: 48, gap: 12 },
  dot: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { backgroundColor: "white" },
  count: { marginTop: 28, fontSize: 44, fontWeight: "800", color: "white", fontVariant: ["tabular-nums"] },
  meters: { marginTop: 4, fontSize: 16, color: "white", opacity: 0.85 },
  hint: { marginTop: 32, fontSize: 13, color: "white", opacity: 0.85, textAlign: "center" },
  stop: { alignSelf: "center", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  stopText: { color: "white", fontSize: 15, fontWeight: "600" },
  force: { alignSelf: "center", color: "white", opacity: 0.7, fontSize: 13 },
});
