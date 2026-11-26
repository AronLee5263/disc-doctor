// 가속도 센서 값으로 걸음을 세는 순수 로직 (React Native 의존성 없음 → node로 테스트 가능)
//
// 아이폰에서는 CMPedometer(하드웨어 만보기)를 기준으로 쓰고,
// 이 계산은 만보기를 쓸 수 없을 때(권한 거부 등)의 대체 수단 + "걷기 시작" 즉시 감지용이다.

export const STEP_DEFAULTS = {
  stepThreshold: 1.2, // m/s^2: 평균(중력) 대비 이만큼 튀면 걸음 후보
  minStepIntervalMs: 280, // 이보다 빠르면 흔들기로 간주
  maxStepIntervalMs: 2000, // 이보다 느리면 리듬이 끊긴 것
  minRhythmSteps: 2, // 리듬이 이어진 걸음부터 인정 (한 번 툭 치는 충격 무시)
  maxTurnDeg: 35, // 걸음 사이에 폰 방향이 이만큼 넘게 돌아가면 손 흔들기로 보고 무시
};

const unit = (v) => {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
};
const angleDeg = (a, b) => (Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z))) * 180) / Math.PI;

/**
 * 하드웨어 만보기와 가속도 계산을 합쳐 "인정할 걸음 수"를 정한다.
 * 둘 다 쓸 수 있으면 둘이 동의하는 만큼만 인정한다 (한쪽이 손 흔들기에 속아도 통과 못 함).
 * 가속도 계산은 만보기보다 조금 덜 셀 수 있어 2걸음 여유를 준다.
 */
export function confirmedSteps({ pedometer, accel, pedometerOk, accelOk }) {
  if (pedometerOk && accelOk) return Math.min(pedometer, accel + 2);
  if (pedometerOk) return pedometer;
  if (accelOk) return accel;
  return 0;
}

export class StepCounter {
  constructor(options = {}) {
    this.opt = { ...STEP_DEFAULTS, ...options };
    this.reset();
  }

  reset() {
    this.gravity = null; // 중력 방향 추정치 (천천히 따라가는 평균 벡터)
    this.smoothed = 0;
    this.aboveThreshold = false;
    this.lastStepTime = null;
    this.lastStepDir = null; // 직전 걸음 때의 폰 방향
    this.dir = null; // 폰 방향 (빠르게 따라가는 평균, 순간 충격 제거용)
    this.maxTurn = 0; // 직전 걸음 이후 폰 방향이 가장 많이 돌아간 각도
    this.rhythmSteps = 0;
    this.pendingSteps = 0;
    this.steps = 0;
  }

  /**
   * @param {{x:number,y:number,z:number}} acc 중력 포함 가속도(m/s^2), @param {number} t ms
   *
   * 걸을 때는 몸이 "위아래(중력 방향)"로 출렁인다. 그래서 전체 흔들림이 아니라
   * 중력 방향 성분만 본다. 제자리에서 손을 좌우/앞뒤로 흔드는 건 중력 방향 성분이 작아서 무시된다.
   */
  addSample(acc, t) {
    if (acc == null || acc.x == null || acc.y == null || acc.z == null) return this.steps;

    if (this.gravity === null) {
      this.gravity = { x: acc.x, y: acc.y, z: acc.z };
      return this.steps;
    }
    const a = 0.95;
    this.gravity = {
      x: this.gravity.x * a + acc.x * (1 - a),
      y: this.gravity.y * a + acc.y * (1 - a),
      z: this.gravity.z * a + acc.z * (1 - a),
    };
    // 폰 방향 추적: 직전 걸음 이후 가장 많이 돌아간 각도를 기록
    const u = unit(acc);
    this.dir = this.dir ? unit({ x: this.dir.x * 0.8 + u.x * 0.2, y: this.dir.y * 0.8 + u.y * 0.2, z: this.dir.z * 0.8 + u.z * 0.2 }) : u;
    if (this.lastStepDir) this.maxTurn = Math.max(this.maxTurn, angleDeg(this.lastStepDir, this.dir));

    const gMag = Math.hypot(this.gravity.x, this.gravity.y, this.gravity.z) || 1;
    // 중력을 뺀 순수 움직임을 중력 방향으로 투영 = 위아래 움직임
    const vertical =
      ((acc.x - this.gravity.x) * this.gravity.x +
        (acc.y - this.gravity.y) * this.gravity.y +
        (acc.z - this.gravity.z) * this.gravity.z) /
      gMag;

    this.smoothed = this.smoothed * 0.6 + vertical * 0.4;
    const signal = this.smoothed;

    if (signal > this.opt.stepThreshold) {
      this.aboveThreshold = true;
    } else if (this.aboveThreshold && signal < this.opt.stepThreshold * 0.4) {
      this.aboveThreshold = false;
      this.registerStep(t, this.dir);
    }
    return this.steps;
  }

  registerStep(t, dir) {
    const { minStepIntervalMs, maxStepIntervalMs, minRhythmSteps, maxTurnDeg } = this.opt;
    // 걷는 동안 폰 방향은 거의 그대로다. 걸음 사이에 크게 돌아갔다 왔으면 손목을 흔든 것.
    const turned = this.lastStepDir && this.maxTurn > maxTurnDeg;
    this.lastStepDir = dir;
    this.maxTurn = 0;
    if (turned) {
      this.lastStepTime = t;
      this.rhythmSteps = 0;
      this.pendingSteps = 0;
      return;
    }
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
