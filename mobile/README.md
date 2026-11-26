# disc doctor — 걸어야 꺼지는 알람 (iOS 먼저, Android도 같은 코드)

알람이 울리면 **5걸음(약 3m)** 걸어야 꺼지는 아이폰 앱입니다.
회원가입 없이 설치하자마자 쓸 수 있고, 모든 데이터는 폰 안에만 저장됩니다.

## 지금 바로 내 아이폰에서 실행하기 (무료, 맥 없어도 됨)

1. 아이폰 App Store에서 **Expo Go** 앱을 설치합니다.
2. 컴퓨터(윈도우/맥 모두 가능)에 [Node.js LTS](https://nodejs.org)를 설치합니다.
3. 터미널에서:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

4. 화면에 나온 QR 코드를 아이폰 **기본 카메라**로 찍으면 Expo Go에서 앱이 열립니다.
   (컴퓨터와 아이폰이 같은 와이파이에 있어야 합니다. 안 되면 `npx expo start --tunnel`)

## 동작 방식

| 상황 | 동작 |
| --- | --- |
| 알람 시각 | 알림이 울림 (정각, 1분, 3분, 10분 뒤 재알림) |
| 알림을 눌러 앱을 엶 | 목소리가 시간이 지날수록 커지는 "걸으세요" 화면 |
| 걷기 시작 | 즉시 조용해짐 (30초 동안 안 걸으면 다시 울림) |
| 5걸음 다 걸음 | 완전히 꺼짐, 남은 재알림 취소, 기록 저장 |
| 반복 설정(30분/1시간) | 다 걸은 시각부터 그 간격 뒤에 다시 울림 |

### 목소리 단계

| 언제 | 볼륨 | 한국어 | English |
| --- | --- | --- | --- |
| 바로 | 아주 조용 (15%) | 일어나… | Wake up... |
| 1분 뒤 | 조금 크게 (45%) | 일어나, 이제 그만 | Wake up, that's enough |
| 3분 뒤 | 크게 (75%) | 이제 진짜 일어나~ | Okay, really, wake up~ |
| 10분 뒤 | 최대 (100%) | 아 진짜 일어나!!!! | Seriously, get up!!!! |

### 강제 모드

- **켜짐(기본)**: 끄기 버튼 없음, 무음 모드여도 목소리가 나옴. 걸어야만 꺼짐.
- **꺼짐**: "그냥 끄기" 버튼이 생기고 무음 모드를 따름. 그냥 끄면 반복 알람도 멈춤.

## 내 목소리 넣는 법

지금 들어 있는 파일은 **임시**입니다(영어는 기계 음성, 한국어는 신호음).
아이폰 **음성 메모** 앱으로 녹음해서 아래 이름으로 덮어쓰면 끝입니다.

```
assets/voices/ko/stage0.m4a   일어나…              (작게 속삭이듯)
assets/voices/ko/stage1.m4a   일어나, 이제 그만
assets/voices/ko/stage2.m4a   이제 진짜 일어나~
assets/voices/ko/stage3.m4a   아 진짜 일어나!!!!
assets/voices/en/stage0.m4a   Wake up...
assets/voices/en/stage1.m4a   Wake up, that's enough
assets/voices/en/stage2.m4a   Okay, really, wake up~
assets/voices/en/stage3.m4a   Seriously, get up!!!!
```

- 볼륨은 앱이 단계별로 조절하니 **녹음은 전부 같은 크기로, 또렷하게** 하세요.
- 파일은 반복 재생되므로 **말한 뒤 1~2초 쉬고** 녹음을 끝내세요.
- 음성 메모 → 공유 → "파일에 저장"하면 `.m4a`로 저장됩니다.
- 임시 파일을 다시 만들려면 `npm run make-voices` (ffmpeg 필요).

## 걸음 측정

- 걸음 측정: 아이폰 내장 만보기(CMPedometer) + 가속도 센서 직접 계산 중 큰 값.
  GPS는 실내 오차(20m 이상) 때문에 쓰지 않습니다.
- 흔들기(사람이 걸을 수 없는 속도)와 한 번 툭 치는 충격은 걸음으로 세지 않습니다.
- 앱을 안 열어도 7일치 알람이 미리 예약되고, 앱을 열 때마다 다시 채워집니다.

## 지금 단계(1단계)의 한계

- 알림 방식이라 **무음 모드/집중 모드에서는 알림 소리가 안 날 수 있습니다.**
  앱을 열고 나면 (강제 모드일 때) 무음이어도 목소리가 울립니다.
- **앱을 열기 전 알림 소리는 폰 기본음**입니다. 알림 소리 자체를 내 목소리로 바꾸는 건
  Expo Go에서는 안 되고, 2단계(직접 빌드)에서 가능합니다.
- 사용자가 알림을 무시하면 10분 뒤 마지막 재알림 후 멈춥니다.
- 이 한계는 2단계(AlarmKit)에서 해결합니다.

## 로드맵

1. **1단계 (지금)** — Expo Go로 무료 개발/테스트. 실제 아이폰에서 걸음 감도 조정.
2. **2단계 — 출시** (Apple 개발자 계정 필요, 연 $99)
   - AlarmKit(iOS 26+)로 교체: 무음/집중 모드에서도 시계 앱처럼 울림. `src/scheduler.js`만 바꾸면 됨.
   - `eas build`(클라우드 빌드, 맥 불필요) → TestFlight → App Store 제출.
3. **3단계 — 유료 기능** — 이때만 회원가입(Sign in with Apple) + 서버 백업.
   `src/storage.js`의 로컬 데이터를 그대로 서버로 올리면 기기 변경/삭제 후 복원 가능.

## 폴더 구조

```
mobile/
├─ App.js                  화면 전환(홈 / 울림 / 완료), 알림·앱 상태 감지
├─ app.json                앱 이름, 아이콘, 스플래시, iOS 권한 문구
├─ assets/                 아이콘·스플래시(기존 disc-doctor 로고), 목소리 파일
├─ scripts/make-placeholder-voices.sh   임시 목소리 생성 스크립트
└─ src/
   ├─ logic/               순수 로직 (테스트 있음: npm test)
   │  ├─ stepCounter.js    가속도 → 걸음 수
   │  ├─ alarmPlan.js      알람 예약 계획, 반복, 울림 여부 판단
   │  └─ voiceStages.js    목소리 단계(문구·볼륨), 걷는 중 음소거
   ├─ voices.js            목소리 파일 목록
   ├─ hooks/useWalkMission.js  알람음 + 화면 켜짐 유지 + 걸음 측정
   ├─ screens/             HomeScreen, RingingScreen, DoneScreen
   ├─ scheduler.js         iOS 알림 예약 (2단계에서 AlarmKit으로 교체)
   └─ storage.js           폰 로컬 저장 (회원가입 없음)
```

## 테스트

```bash
npm test
```
