// 울리는 동안: 단계별 목소리 재생 + 화면 꺼짐 방지 + 걸음 측정
import { useEffect, useRef, useState } from "react";
import { Accelerometer, Pedometer } from "expo-sensors";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { StepCounter } from "../logic/stepCounter";
import { VOICE_STAGES, isMutedByWalking, stageForElapsed } from "../logic/voiceStages";
import { VOICE_FILES } from "../voices";

const G = 9.81; // expo-sensors 가속도 단위는 g → m/s^2로 변환
const KEEP_AWAKE_TAG = "walk-mission";

/**
 * @param startedAt 알람이 울리기 시작한 시각 (목소리 단계 계산 기준)
 * @param voiceLang "ko" | "en"
 * @param forceMode true면 무음 모드여도 소리가 난다
 */
export function useWalkMission({ startedAt, voiceLang, forceMode, targetSteps, onComplete }) {
  const [steps, setSteps] = useState(0);
  const [stage, setStage] = useState(() => stageForElapsed((Date.now() - startedAt.getTime()) / 1000));
  const [muted, setMuted] = useState(false);
  const [sensorInfo, setSensorInfo] = useState({ pedometer: null, accelerometer: null });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // 1) 걸음 측정
  const lastStepAtRef = useRef(null);
  useEffect(() => {
    let pedometerSteps = 0;
    let accelSteps = 0;
    let shown = 0;
    let completed = false;
    const subs = [];
    const counter = new StepCounter();
    const missionStartedAt = Date.now();

    const update = () => {
      // 하드웨어 만보기와 가속도 계산 중 큰 값 (만보기가 늦게 업데이트되는 걸 보완)
      const s = Math.max(pedometerSteps, accelSteps);
      if (s > shown) {
        shown = s;
        lastStepAtRef.current = Date.now();
        setSteps(s);
        setMuted(true); // 걷기 시작하면 즉시 조용히
      }
      if (s >= targetSteps && !completed) {
        completed = true;
        onCompleteRef.current?.({ steps: s, seconds: Math.round((Date.now() - missionStartedAt) / 1000) });
      }
    };

    (async () => {
      // 하드웨어 만보기 (iOS CMPedometer) - "동작 및 피트니스" 권한 필요
      try {
        const available = await Pedometer.isAvailableAsync();
        const perm = available ? await Pedometer.requestPermissionsAsync() : null;
        const ok = !!(available && perm?.granted);
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

      // 가속도 센서로 직접 계산 (권한 불필요, 즉시 반응)
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

    return () => subs.forEach((s) => s.remove());
  }, [targetSteps]);

  // 2) 0.5초마다 목소리 단계 / 다시 울릴지 확인
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setStage(stageForElapsed((now - startedAt.getTime()) / 1000));
      setMuted(isMutedByWalking(lastStepAtRef.current, now)); // 30초 동안 안 걸으면 다시 울림
    }, 500);
    return () => clearInterval(id);
  }, [startedAt]);

  // 3) 목소리 재생기 + 화면 꺼짐 방지
  const playerRef = useRef(null);
  useEffect(() => {
    playerRef.current = createAudioPlayer(null);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      try {
        playerRef.current?.pause();
        playerRef.current?.remove();
      } catch {
        /* 이미 해제됨 */
      }
      playerRef.current = null;
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: !!forceMode, interruptionMode: "doNotMix", shouldPlayInBackground: false }).catch(
      () => {}
    );
  }, [forceMode]);

  // 단계/언어가 바뀌면 파일과 볼륨 교체
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.replace(VOICE_FILES[voiceLang === "en" ? "en" : "ko"][stage]);
    player.loop = true;
    player.volume = VOICE_STAGES[stage].volume;
  }, [stage, voiceLang]);

  // 걷는 중이면 멈춤, 아니면 재생
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.pause();
    else player.play();
  }, [muted, stage, voiceLang]);

  return { steps, stage, muted, sensorInfo };
}
