import { useCallback, useEffect, useRef, useState } from "react";

import { MovementDetector } from "./movementDetector";
import { requestSensorPermissions, startSensors } from "./sensors";
import { startAlarmSound, stopAlarmSound, unlockAudio } from "./alarmSound";

const STORAGE_KEY = "disc-doctor-alarm-time";

const readStoredTime = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

/** "HH:MM" → 다음에 울릴 시각(Date) */
export function nextOccurrence(hhmm, now = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * 알람 상태: idle(꺼짐) → armed(대기) → ringing(울림, 3m 걸어야 꺼짐) → dismissed(해제됨)
 */
export function useMoveToDismissAlarm({ targetMeters = 3 } = {}) {
  const [status, setStatus] = useState("idle");
  const [alarmTime, setAlarmTime] = useState(readStoredTime);
  const [ringAt, setRingAt] = useState(null);
  const [progress, setProgress] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState("");

  const detectorRef = useRef(null);
  const stopSensorsRef = useRef(null);
  const wakeLockRef = useRef(null);

  // 화면이 꺼지면 웹앱의 타이머/센서가 멈추므로 대기 중에는 화면 꺼짐 방지
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => (wakeLockRef.current = null));
      }
    } catch {
      /* 지원 안 하거나 거부됨 - 무시 */
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stopSensors = useCallback(() => {
    stopSensorsRef.current?.();
    stopSensorsRef.current = null;
  }, []);

  const ring = useCallback(() => {
    const detector = new MovementDetector({ targetMeters });
    detectorRef.current = detector;
    setProgress(detector.snapshot());
    setStatus("ringing");
    startAlarmSound();

    stopSensors();
    stopSensorsRef.current = startSensors({
      onMotion: (acc, t) => detector.addMotion(acc, t),
      onPosition: (coords) => detector.addPosition(coords),
      onError: (err) => {
        // 타임아웃/일시적 수신 불가는 계속 재시도되므로 권한 거부만 알림
        if (err.code === err.PERMISSION_DENIED) setError("위치 권한이 거부되어 걸음 센서로만 감지해요.");
      },
    });
  }, [stopSensors, targetMeters]);

  // 울리는 중: 이동 거리 화면 갱신 + 목표 달성 시 해제
  useEffect(() => {
    if (status !== "ringing") return;
    const id = setInterval(() => {
      const snap = detectorRef.current.snapshot();
      setProgress(snap);
      if (snap.done) {
        stopAlarmSound();
        stopSensors();
        releaseWakeLock();
        setStatus("dismissed");
      }
    }, 200);
    return () => clearInterval(id);
  }, [status, stopSensors, releaseWakeLock]);

  // 대기 중: 1초마다 시각 확인
  useEffect(() => {
    if (status !== "armed" || !ringAt) return;
    const id = setInterval(() => {
      if (Date.now() >= ringAt.getTime()) ring();
    }, 1000);
    return () => clearInterval(id);
  }, [status, ringAt, ring]);

  // 탭을 다시 보면 wake lock 재요청 (브라우저가 탭 전환 시 자동 해제함)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && (status === "armed" || status === "ringing")) requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [status, requestWakeLock]);

  // 언마운트 정리
  useEffect(
    () => () => {
      stopAlarmSound();
      stopSensors();
      releaseWakeLock();
    },
    [stopSensors, releaseWakeLock]
  );

  /** 버튼 클릭 핸들러 안에서 호출해야 함 (권한/오디오 잠금해제) */
  const prepare = useCallback(async () => {
    setError("");
    unlockAudio();
    const perms = await requestSensorPermissions();
    setPermissions(perms);
    if (perms.motion !== "granted" && perms.location !== "granted") {
      setError("동작 센서와 위치 권한이 모두 없어 이동을 감지할 수 없어요. 브라우저 설정에서 허용해주세요.");
      return false;
    }
    await requestWakeLock();
    return true;
  }, [requestWakeLock]);

  const arm = useCallback(
    async (hhmm) => {
      if (!hhmm) return;
      // iOS는 클릭 직후 동기적으로 오디오를 깨워야 하므로 prepare 전에 먼저 호출
      unlockAudio();
      if (!(await prepare())) return;
      try {
        localStorage.setItem(STORAGE_KEY, hhmm);
      } catch {
        /* 저장 실패는 무시 */
      }
      setAlarmTime(hhmm);
      setRingAt(nextOccurrence(hhmm));
      setStatus("armed");
    },
    [prepare]
  );

  const testNow = useCallback(async () => {
    unlockAudio();
    if (!(await prepare())) return;
    ring();
  }, [prepare, ring]);

  const cancel = useCallback(() => {
    // 울리는 중에는 취소 불가 (걸어야만 꺼짐)
    if (status === "ringing") return;
    stopSensors();
    releaseWakeLock();
    setRingAt(null);
    setStatus("idle");
  }, [status, stopSensors, releaseWakeLock]);

  return { status, alarmTime, ringAt, progress, permissions, error, arm, testNow, cancel, targetMeters };
}
