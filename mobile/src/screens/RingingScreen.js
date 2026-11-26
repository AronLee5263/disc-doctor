import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWalkMission } from "../hooks/useWalkMission";
import { STRIDE_METERS, TARGET_METERS, TARGET_STEPS } from "../logic/alarmPlan";
import { colors } from "../theme";

// 울리는 화면: 끄기 버튼 없음. 걸어야만 꺼진다.
export default function RingingScreen({ onComplete }) {
  const insets = useSafeAreaInsets();
  const { steps, sensorInfo } = useWalkMission({ active: true, targetSteps: TARGET_STEPS, onComplete });

  const shown = Math.min(steps, TARGET_STEPS);
  const meters = Math.min(shown * STRIDE_METERS, TARGET_METERS);
  const noSensor = sensorInfo.pedometer === false && sensorInfo.accelerometer === false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityRole="alert">
      <Text style={styles.title}>일어나서 걸으세요!</Text>
      <Text style={styles.sub}>
        폰을 들고 {TARGET_STEPS}걸음(약 {TARGET_METERS}m) 걸으면 꺼져요
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: { fontSize: 34, fontWeight: "800", color: "white" },
  sub: { marginTop: 8, fontSize: 16, color: "white", opacity: 0.9, textAlign: "center" },
  dots: { flexDirection: "row", marginTop: 48, gap: 12 },
  dot: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { backgroundColor: "white" },
  count: { marginTop: 28, fontSize: 44, fontWeight: "800", color: "white", fontVariant: ["tabular-nums"] },
  meters: { marginTop: 4, fontSize: 16, color: "white", opacity: 0.85 },
  hint: { marginTop: 32, fontSize: 13, color: "white", opacity: 0.85, textAlign: "center" },
});
