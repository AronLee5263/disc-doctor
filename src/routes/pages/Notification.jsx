import classes from "./Notification.module.css";

import { useState } from "react";
import { Outlet } from "react-router-dom";

import { useMoveToDismissAlarm } from "../../alarm/useMoveToDismissAlarm";

const pad = (n) => String(n).padStart(2, "0");
const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function RingingOverlay({ progress, targetMeters, error }) {
  const meters = progress ? Math.min(progress.meters, targetMeters) : 0;
  const percent = Math.round((meters / targetMeters) * 100);

  return (
    <div className={classes.ringing} role="alertdialog" aria-live="assertive">
      <p className={classes.ringingTitle}>일어나서 걸으세요!</p>
      <p className={classes.ringingSub}>{targetMeters}m 걸으면 알람이 꺼져요</p>

      <div className={classes.meter} aria-label="이동 거리">
        <div className={classes.meterFill} style={{ width: `${percent}%` }} />
      </div>
      <p className={classes.meterText} data-testid="moved-meters">
        {meters.toFixed(1)}m / {targetMeters}m
      </p>

      <ul className={classes.debug}>
        <li>걸음 수: {progress?.steps ?? 0}</li>
        <li>
          GPS:{" "}
          {progress?.gpsAccuracy == null
            ? "수신 대기중"
            : `오차 ±${Math.round(progress.gpsAccuracy)}m${progress.gpsReady ? `, 이동 ${progress.gpsDistance.toFixed(1)}m` : ""}`}
        </li>
      </ul>
      {error && <p className={classes.error}>{error}</p>}
    </div>
  );
}

export default function Notification() {
  const alarm = useMoveToDismissAlarm({ targetMeters: 3 });
  const [time, setTime] = useState(alarm.alarmTime || "07:00");

  return (
    <>
      <Outlet />
      <main className={classes.page}>
        <h2 className={classes.title}>걸어야 꺼지는 알람</h2>
        <p className={classes.desc}>
          알람이 울리면 휴대폰을 들고 <b>{alarm.targetMeters}m</b> 이상 걸어야 꺼져요.
          <br />
          걸음(가속도 센서)과 GPS를 함께 사용해 실내에서도 동작해요.
        </p>

        {alarm.status === "armed" ? (
          <section className={classes.card}>
            <p className={classes.armedLabel}>알람 대기중</p>
            <p className={classes.armedTime}>{alarm.ringAt && formatTime(alarm.ringAt)}</p>
            <p className={classes.notice}>⚠️ 이 화면을 켜 둔 채로 두세요. 브라우저를 닫거나 다른 앱으로 가면 울리지 않아요.</p>
            <button type="button" className={classes.secondary} onClick={alarm.cancel}>
              알람 취소
            </button>
          </section>
        ) : (
          <section className={classes.card}>
            {alarm.status === "dismissed" && <p className={classes.success}>✅ 잘했어요! 알람이 꺼졌어요.</p>}
            <label className={classes.label} htmlFor="alarm-time">
              알람 시간
            </label>
            <input
              id="alarm-time"
              type="time"
              className={classes.timeInput}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <button type="button" className={classes.primary} onClick={() => alarm.arm(time)}>
              알람 설정
            </button>
            <button type="button" className={classes.secondary} onClick={alarm.testNow}>
              지금 울려보기 (테스트)
            </button>
          </section>
        )}

        {alarm.permissions && (
          <p className={classes.perm}>
            동작 센서: {alarm.permissions.motion === "granted" ? "허용됨" : "사용 불가"} · 위치:{" "}
            {alarm.permissions.location === "granted" ? "허용됨" : "사용 불가"}
          </p>
        )}
        {alarm.error && alarm.status !== "ringing" && <p className={classes.error}>{alarm.error}</p>}
      </main>

      {alarm.status === "ringing" && (
        <RingingOverlay progress={alarm.progress} targetMeters={alarm.targetMeters} error={alarm.error} />
      )}
    </>
  );
}
