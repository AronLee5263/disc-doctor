// 알람 해제용 이동 감지 로직 (React/브라우저 API와 분리된 순수 로직이라 테스트 가능)
//
// 왜 GPS만으로는 안 되는가?
//  - 스마트폰 GPS 오차는 실외에서도 보통 3~10m, 실내에서는 20m 이상이다.
//  - 즉 "3m 이동"은 GPS 오차보다 작아서, GPS만 쓰면 가만히 있어도 꺼지거나(오차로 튐)
//    아무리 걸어도 안 꺼진다(실내에서 위치가 안 바뀜). 예전에 실패한 이유가 이것일 가능성이 크다.
//
// 그래서 두 가지 센서를 함께 쓴다.
//  1) 가속도계 걸음 감지 (주 센서): 걸음 수 x 보폭 = 이동 거리. 실내에서도 동작.
//  2) GPS (보조 센서): 정확도(accuracy)가 이동 거리보다 좋을 때만, 연속으로 확인된 경우에만 인정.

export const DEFAULT_OPTIONS = {
  targetMeters: 3, // 이 거리 이상 움직이면 알람 해제
  strideMeters: 0.7, // 평균 보폭 (성인 약 0.6~0.8m)

  // 걸음 감지 파라미터 (가속도 크기 m/s^2 기준)
  stepThreshold: 1.2, // 평균(중력) 대비 이만큼 튀어야 걸음 후보
  minStepIntervalMs: 280, // 이보다 빠른 피크는 같은 걸음(또는 흔들기)으로 간주
  maxStepIntervalMs: 2000, // 이보다 간격이 길면 걸음 리듬이 끊긴 것
  minRhythmSteps: 2, // 리듬이 이어진 걸음이 이 이상일 때부터 거리로 인정 (단발 충격 무시)

  // GPS 파라미터
  maxGpsAccuracy: 15, // 이보다 부정확한 GPS 값은 버림
  gpsBaselineSamples: 3, // 기준점을 잡을 때 평균낼 샘플 수
  gpsConfirmSamples: 2, // 목표 거리 초과가 연속 몇 번 확인돼야 인정할지
};

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

/** 두 위경도 좌표 사이 거리(m) - 하버사인 공식 */
export function haversineMeters(a, b) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 가속도 샘플로 걸음을 센다.
 * 가속도 크기에서 천천히 따라가는 평균(중력 성분)을 빼고, 임계값을 넘는 피크를 걸음으로 본다.
 */
export class StepCounter {
  constructor(options = {}) {
    this.opt = { ...DEFAULT_OPTIONS, ...options };
    this.reset();
  }

  reset() {
    this.baseline = null; // 느린 평균 (중력 + 기기 기울기)
    this.smoothed = 0; // 빠른 평균 (노이즈 제거)
    this.aboveThreshold = false;
    this.peakValue = 0;
    this.lastStepTime = null;
    this.rhythmSteps = 0; // 현재 이어지고 있는 리듬의 걸음 수
    this.pendingSteps = 0; // 리듬이 확인되기 전까지 보류 중인 걸음
    this.steps = 0; // 확정된 걸음 수
  }

  /** @param {{x:number,y:number,z:number}} acc accelerationIncludingGravity, @param {number} t ms */
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
      this.peakValue = Math.max(this.peakValue, signal);
    } else if (this.aboveThreshold && signal < this.opt.stepThreshold * 0.4) {
      // 피크를 지나 다시 내려옴 → 걸음 한 번 후보
      this.aboveThreshold = false;
      this.peakValue = 0;
      this.registerStep(t);
    }
    return this.steps;
  }

  registerStep(t) {
    const { minStepIntervalMs, maxStepIntervalMs, minRhythmSteps } = this.opt;
    if (this.lastStepTime !== null) {
      const dt = t - this.lastStepTime;
      if (dt < minStepIntervalMs) {
        // 사람이 걸을 수 없는 속도: 흔들기/진동으로 보고 리듬을 끊는다
        this.lastStepTime = t;
        this.rhythmSteps = 0;
        this.pendingSteps = 0;
        return;
      }
      if (dt > maxStepIntervalMs) {
        // 리듬 끊김: 새 리듬 시작, 보류 걸음은 버림
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

/** GPS 좌표로 기준점 대비 이동 거리를 추정한다. 정확도가 나쁘면 무시한다. */
export class GpsTracker {
  constructor(options = {}) {
    this.opt = { ...DEFAULT_OPTIONS, ...options };
    this.reset();
  }

  reset() {
    this.baselineSamples = [];
    this.baseline = null;
    this.lastAccuracy = null;
    this.distance = 0; // 최근 측정 거리 (참고용)
    this.confirmCount = 0;
    this.confirmed = false;
  }

  /** @param {{latitude:number,longitude:number,accuracy:number}} coords */
  addPosition(coords) {
    if (!coords) return;
    this.lastAccuracy = coords.accuracy;
    if (coords.accuracy == null || coords.accuracy > this.opt.maxGpsAccuracy) return;

    if (!this.baseline) {
      this.baselineSamples.push(coords);
      if (this.baselineSamples.length >= this.opt.gpsBaselineSamples) {
        const n = this.baselineSamples.length;
        this.baseline = {
          latitude: this.baselineSamples.reduce((s, c) => s + c.latitude, 0) / n,
          longitude: this.baselineSamples.reduce((s, c) => s + c.longitude, 0) / n,
          accuracy: Math.max(...this.baselineSamples.map((c) => c.accuracy)),
        };
      }
      return;
    }

    this.distance = haversineMeters(this.baseline, coords);
    // 이동 거리가 목표를 넘고, 그 거리가 (현재 오차 + 기준점 오차의 절반)보다 커야 진짜 이동으로 인정
    const noise = coords.accuracy + this.baseline.accuracy / 2;
    const reliable = this.distance >= this.opt.targetMeters && this.distance > noise;
    this.confirmCount = reliable ? this.confirmCount + 1 : 0;
    if (this.confirmCount >= this.opt.gpsConfirmSamples) this.confirmed = true;
  }
}

/** 걸음 + GPS를 합쳐서 "목표 거리 이동 완료" 여부를 판단한다. */
export class MovementDetector {
  constructor(options = {}) {
    this.opt = { ...DEFAULT_OPTIONS, ...options };
    this.stepCounter = new StepCounter(this.opt);
    this.gps = new GpsTracker(this.opt);
  }

  reset() {
    this.stepCounter.reset();
    this.gps.reset();
  }

  addMotion(acc, t) {
    this.stepCounter.addSample(acc, t);
  }

  addPosition(coords) {
    this.gps.addPosition(coords);
  }

  get steps() {
    return this.stepCounter.steps;
  }

  get stepMeters() {
    return this.stepCounter.steps * this.opt.strideMeters;
  }

  /** 화면 표시용 이동 거리: 걸음 기반과 (신뢰 가능한) GPS 기반 중 큰 값 */
  get meters() {
    const gpsMeters = this.gps.confirmed ? this.gps.distance : 0;
    return Math.max(this.stepMeters, gpsMeters);
  }

  get done() {
    return this.stepMeters >= this.opt.targetMeters || this.gps.confirmed;
  }

  snapshot() {
    return {
      steps: this.steps,
      meters: this.meters,
      done: this.done,
      gpsAccuracy: this.gps.lastAccuracy,
      gpsDistance: this.gps.distance,
      gpsReady: !!this.gps.baseline,
      targetMeters: this.opt.targetMeters,
    };
  }
}
