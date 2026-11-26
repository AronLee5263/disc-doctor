// 울리는 동안: 알람음 반복 재생 + 화면 꺼짐 방지 + 걸음 측정
import { useEffect, useRef, useState } from "react";
import { Accelerometer, Pedometer } from "expo-sensors";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { StepCounter } from "../logic/stepCounter";

const G = 9.81; // expo-sensors 가속도 단위는 g → m/s^2로 변환
const KEEP_AWAKE_TAG = "walk-mission";

export function useWalkMission({ active, targetSteps, onComplete }) {
  const [steps, setSteps] = useState(0);
  const [sensorInfo, setSensorInfo] = useState({ pedometer: null, accelerometer: null });
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return undefined;
    completedRef.current = false;
    setSteps(0);

    let pedometerSteps = 0;
    let accelSteps = 0;
    const subs = [];
    const counter = new StepCounter();
    const startedAt = Date.now();

    const update = () => {
      // 하드웨어 만보기와 가속도 계산 중 큰 값 (만보기가 늦게 업데이트되는 걸 보완)
      const s = Math.max(pedometerSteps, accelSteps);
      setSteps(s);
      if (s >= targetSteps && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.({ steps: s, seconds: Math.round((Date.now() - startedAt) / 1000) });
      }
    };

    // 알람음: 무음 모드에서도 소리 나게
    const player = createAudioPlayer(require("../../assets/sounds/alarm.wav"));
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: false })
      .catch(() => {})
      .finally(() => {
        player.loop = true;
        player.volume = 1;
        player.play();
      });

    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    (async () => {
      // 1) 하드웨어 만보기 (iOS CMPedometer) - "동작 및 피트니스" 권한 필요
      try {
        const available = await Pedometer.isAvailableAsync();
        const perm = available ? await Pedometer.requestPermissionsAsync() : null;
        const ok = available && perm?.granted;
        setSensorInfo((p) => ({ ...p, pedometer: ok }));
        if (ok) {
          subs.push(
            Pedometer.watchStepCount((r) => {
              pedometerSteps = r.steps; // 구독 시작 이후 걸음 수
              update();
            })
          );
        }
      } catch {
        setSensorInfo((p) => ({ ...p, pedometer: false }));
      }

      // 2) 가속도 센서로 직접 계산 (권한 불필요, 즉시 반응)
      try {
        const ok = await Accelerometer.isAvailableAsync();
        setSensorInfo((p) => ({ ...p, accelerometer: ok }));
        if (ok) {
          Accelerometer.setUpdateInterval(20); // 50Hz
          subs.push(
            Accelerometer.addListener(({ x, y, z }) => {
              accelSteps = counter.addSample({ x: x * G, y: y * G, z: z * G }, Date.now());
              update();
            })
          );
        }
      } catch {
        setSensorInfo((p) => ({ ...p, accelerometer: false }));
      }
    })();

    return () => {
      subs.forEach((s) => s.remove());
      try {
        player.pause();
        player.remove();
      } catch {
        /* 이미 해제됨 */
      }
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [active, targetSteps]);

  return { steps, sensorInfo };
}
