# 다국어 음성 대화

언어를 고르고 말하면 글로 써지고, 상대 언어로 번역되어 보이는 짧은 질문/대답 화면입니다.

- `index.html`: 화면 (언어 선택 + 질문/대답 칸, 브라우저 음성인식)
- `worker.js`: 번역 서버 (Cloudflare Worker, Google Cloud Translation 프록시)

## 사용 방법

1. 위쪽 언어 메뉴에서 질문하는 사람과 대답하는 사람의 언어를 고릅니다.
2. **질문** 칸의 🎤 를 누르고 말하면 질문 칸에 글이 써지고, 아래에 대답자 언어 번역이 나옵니다.
3. 상대가 **대답** 칸의 🎤 를 누르고 말하면 대답 칸에 글이 써지고, 아래에 질문자 언어 번역이 나옵니다.

음성인식은 Chrome, Edge, Safari(iOS 포함)에서 동작하며 HTTPS(또는 localhost)에서만 마이크를 쓸 수 있습니다.

## 번역 켜기

1. Google Cloud 에서 Cloud Translation API 를 켜고 API 키를 만듭니다.
2. `worker.js` 를 Cloudflare Worker 로 배포하고 Secret `GOOGLE_API_KEY` 에 키를 등록합니다.
3. `index.html` 의 `TRANSLATE_ENDPOINT` 에 Worker 주소를 넣습니다.

`TRANSLATE_ENDPOINT` 가 비어 있으면 번역 없이 받아쓰기만 동작합니다.
