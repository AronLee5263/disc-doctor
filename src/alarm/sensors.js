// 브라우저 센서(가속도계, GPS) 권한 요청과 구독

/**
 * 권한 요청은 반드시 "사용자가 버튼을 누른 순간"에 호출해야 한다.
 * (iOS Safari는 클릭 이벤트 안에서만 DeviceMotion 권한 팝업을 띄워준다)
 */
export async function requestSensorPermissions() {
  const result = { motion: "unsupported", location: "unsupported" };

  if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        // iOS 13+: "granted" | "denied". 최신 크롬은 "prompt"를 줄 수도 있는데, 이 경우에도 이벤트는 들어오므로 일단 사용
        const state = await DeviceMotionEvent.requestPermission();
        result.motion = state === "denied" ? "denied" : "granted";
      } catch {
        result.motion = "granted"; // 권한 API 호출 실패 - 이벤트가 오면 쓰고, 안 오면 GPS로 대체
      }
    } else {
      result.motion = "granted"; // 안드로이드/기타: 별도 권한 없음
    }
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    result.location = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve("granted"),
        (err) => resolve(err.code === err.PERMISSION_DENIED ? "denied" : "granted"),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  return result;
}

/** 가속도 + GPS 구독 시작. 반환값은 구독 해제 함수 */
export function startSensors({ onMotion, onPosition, onError }) {
  const cleanups = [];

  if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
    const handler = (e) => {
      const a = e.accelerationIncludingGravity;
      if (a) onMotion({ x: a.x, y: a.y, z: a.z }, e.timeStamp || performance.now());
    };
    window.addEventListener("devicemotion", handler);
    cleanups.push(() => window.removeEventListener("devicemotion", handler));
  }

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        onPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => onError && onError(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    cleanups.push(() => navigator.geolocation.clearWatch(id));
  }

  return () => cleanups.forEach((fn) => fn());
}
