#!/usr/bin/env bash
# 목소리 알람 임시 파일 생성 스크립트 (진짜 목소리 녹음으로 덮어쓰기 전까지 사용)
#  - en: ffmpeg 내장 영어 음성합성(flite)으로 생성
#  - ko: 한국어 음성합성이 없어서 단계별로 점점 다급해지는 신호음으로 대신함
# 실행: bash scripts/make-placeholder-voices.sh   (ffmpeg 필요)
set -euo pipefail
cd "$(dirname "$0")/.."

EN=("Wake up." "Wake up. That's enough sleep." "Okay. Really. Wake up." "Seriously! Get up! Get up now!")
for i in 0 1 2 3; do
  # 음성 뒤에 1.5초 쉬고 반복되도록 무음을 붙임
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "flite=text='${EN[$i]}':voice=slt" \
    -af "apad=pad_dur=1.5" -ar 22050 -ac 1 -c:a aac -b:a 64k "assets/voices/en/stage$i.m4a"
done

# 한국어 자리: 0단계 차임 1번 → 3단계 빠른 경보음
ko_tone() {
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$1" -ar 22050 -ac 1 -c:a aac -b:a 64k "$2"
}
ko_tone "sine=f=660:d=0.4,afade=t=out:st=0.1:d=0.3,apad=pad_dur=2" assets/voices/ko/stage0.m4a
ko_tone "aevalsrc='sin(2*PI*880*t)*lt(mod(t,0.35),0.2)':d=0.9,apad=pad_dur=1.5" assets/voices/ko/stage1.m4a
ko_tone "aevalsrc='sin(2*PI*1046*t)*lt(mod(t,0.25),0.15)':d=1.2,apad=pad_dur=1" assets/voices/ko/stage2.m4a
ko_tone "aevalsrc='(2*gte(sin(2*PI*1318*t),0)-1)*0.6*lt(mod(t,0.15),0.1)':d=1.5,apad=pad_dur=0.5" assets/voices/ko/stage3.m4a
echo "임시 목소리 파일 생성 완료"
