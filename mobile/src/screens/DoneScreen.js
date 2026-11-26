import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

const pad = (n) => String(n).padStart(2, "0");

export default function DoneScreen({ result, nextRepeatAt, onClose }) {
  const next = nextRepeatAt ? new Date(nextRepeatAt) : null;
  return (
    <View style={styles.screen}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>좋아요, 일어났네요!</Text>
      {result ? (
        <Text style={styles.sub}>
          {result.steps}걸음 · {result.seconds}초 만에 알람을 껐어요
        </Text>
      ) : null}
      {next && next > new Date() ? (
        <Text style={styles.sub}>
          다음 알람은 {pad(next.getHours())}:{pad(next.getMinutes())}에 다시 울려요
        </Text>
      ) : null}
      <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]} onPress={onClose}>
        <Text style={styles.buttonText}>확인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  emoji: { fontSize: 64 },
  title: { marginTop: 16, fontSize: 26, fontWeight: "800", color: colors.text },
  sub: { marginTop: 8, fontSize: 15, color: colors.sub },
  button: {
    marginTop: 40,
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 999,
  },
  buttonText: { color: "white", fontSize: 17, fontWeight: "700" },
});
