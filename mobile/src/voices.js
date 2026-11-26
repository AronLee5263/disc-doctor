// 목소리 파일 목록. 직접 녹음한 파일을 같은 이름으로 덮어쓰면 그대로 적용된다.
// (React Native는 require 경로가 고정 문자열이어야 해서 이렇게 나열한다)
export const VOICE_FILES = {
  ko: [
    require("../assets/voices/ko/stage0.m4a"),
    require("../assets/voices/ko/stage1.m4a"),
    require("../assets/voices/ko/stage2.m4a"),
    require("../assets/voices/ko/stage3.m4a"),
  ],
  en: [
    require("../assets/voices/en/stage0.m4a"),
    require("../assets/voices/en/stage1.m4a"),
    require("../assets/voices/en/stage2.m4a"),
    require("../assets/voices/en/stage3.m4a"),
  ],
};
