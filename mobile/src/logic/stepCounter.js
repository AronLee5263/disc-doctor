// 가속도 센서 값으로 걸음을 세는 순수 로직 (React Native 의존성 없음 → node로 테스트 가능)
//
// 아이폰에는 CMPedometer(하드웨어 만보기)가 있어서 그걸 주로 쓰지만,
// CMPedometer는 업데이트가 몇 초씩 늦게 오는 경우가 있어서 이 계산을 같이 돌려 둘 중 큰 값을 쓴다.

export const STEP_DEFAULTS = {
  stepThreshold: 1.2, // m/s^2: 평균(중력) 대비 이만큼 튀면 걸음 후보
  minStepIntervalMs: 280, // 이보다 빠르면 흔들기로 간주
  maxStepIntervalMs: 2000, // 이보다 느리면 리듬이 끊긴 것
  minRhythmSteps: 2, // 리듬이 이어진 걸음부터 인정 (한 번 툭 치는 충격 무시)
};

export class StepCounter {
  constructor(options = {}) {
    this.opt = { ...STEP_DEFAULTS, ...options };
    this.reset();
  }

  reset() {
    this.baseline = null;
    this.smoothed = 0;
    this.aboveThreshold = false;
    this.lastStepTime = null;
    this.rhythmSteps = 0;
    this.pendingSteps = 0;
    this.steps = 0;
  }

  /** @param {{x:number,y:number,z:number}} acc m/s^2 단위, @param {number} t ms */
  addSample(acc, t) {
    if (acc == null || acc.x == null || acc.y == null || acc.z == null) return this.steps;
    const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

    if (this.baseline === null) {
      this.baseline = mag;
      this.smoothed = mag;
      return this.steps;
    }
    this.baseline = this.baseline * 0.95 + mag * 0.05;
    this.smoothed = this.smoothed * 0.6 + mag * 0.4;
    const signal = this.smoothed - this.baseline;

    if (signal > this.opt.stepThreshold) {
      this.aboveThreshold = true;
    } else if (this.aboveThreshold && signal < this.opt.stepThreshold * 0.4) {
      this.aboveThreshold = false;
      this.registerStep(t);
    }
    return this.steps;
  }

  registerStep(t) {
    const { minStepIntervalMs, maxStepIntervalMs, minRhythmSteps } = this.opt;
    if (this.lastStepTime !== null) {
      const dt = t - this.lastStepTime;
      if (dt < minStepIntervalMs) {
        this.lastStepTime = t;
        this.rhythmSteps = 0;
        this.pendingSteps = 0;
        return;
      }
      if (dt > maxStepIntervalMs) {
        this.rhythmSteps = 0;
        this.pendingSteps = 0;
      }
    }
    this.lastStepTime = t;
    this.rhythmSteps += 1;

    if (this.rhythmSteps < minRhythmSteps) {
      this.pendingSteps += 1;
    } else {
      this.steps += this.pendingSteps + 1;
      this.pendingSteps = 0;
    }
  }
}
