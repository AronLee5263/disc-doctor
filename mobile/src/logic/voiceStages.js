// 목소리 알람 단계 (순수 로직)
// 알람이 울린 뒤 시간이 지날수록 문구와 볼륨이 커진다.

export const VOICE_STAGES = [
  { atSec: 0, volume: 0.15, ko: "일어나…", en: "Wake up..." },
  { atSec: 60, volume: 0.45, ko: "일어나, 이제 그만", en: "Wake up, that's enough" },
  { atSec: 180, volume: 0.75, ko: "이제 진짜 일어나~", en: "Okay, really, wake up~" },
  { atSec: 600, volume: 1.0, ko: "아 진짜 일어나!!!!", en: "Seriously, get up!!!!" },
];

/** 알람 시작 후 경과 초 → 단계 번호(0~3) */
export function stageForElapsed(elapsedSec) {
  let stage = 0;
  VOICE_STAGES.forEach((s, i) => {
    if (elapsedSec >= s.atSec) stage = i;
  });
  return stage;
}

// 걷기 시작하면 바로 조용해지고, 30초 동안 걸음이 없으면(다시 누우면) 다시 울린다.
export const MUTE_AFTER_STEP_MS = 30000;

export function isMutedByWalking(lastStepAt, now) {
  return lastStepAt != null && now - lastStepAt < MUTE_AFTER_STEP_MS;
}
