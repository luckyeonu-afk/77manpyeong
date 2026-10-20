# 다국어 음성 대화

언어를 고르고 말하면 글로 써지고, 상대 언어로 번역되어 보이며, 🔊 로 번역문을 읽어 주는 짧은 질문/대답 화면입니다.

- `index.html`: 화면 (언어 선택 + 질문/대답 칸, 브라우저 음성인식·읽기)
- `worker.js`: 번역 서버 (Cloudflare Worker, Azure Translator 중계)

## 사용 방법

1. 위쪽 언어 메뉴에서 질문하는 사람과 대답하는 사람의 언어를 고릅니다.
2. **질문** 칸의 🎤 를 누르고 말하면 질문 칸에 글이 써지고, 아래에 대답자 언어 번역이 나옵니다.
3. 상대가 **대답** 칸의 🎤 를 누르고 말하면 대답 칸에 글이 써지고, 아래에 질문자 언어 번역이 나옵니다.
4. 번역 옆 🔊 를 누르면 번역문을 그 언어로 읽어 줍니다. (브라우저 내장 기능, 무료. 기기에 그 언어 음성이 없으면 어색하게 읽을 수 있습니다)

음성인식은 Chrome, Edge, Safari(iOS 포함)에서 동작하며 HTTPS(또는 localhost)에서만 마이크를 쓸 수 있습니다.

## 번역 켜기 (Azure Translator F0, 0원)

### 1. Azure 에서 번역 키 만들기

1. https://portal.azure.com 에서 Translator 리소스를 만듭니다.
2. **가격 책정 계층(Pricing tier)은 반드시 `Free F0`** 를 고릅니다.
   - F0 는 한 달 200만 자 무료이고, 넘으면 요금 없이 "할당량 초과"로 막힙니다.
   - **S1(유료) 으로 올리지 마세요.** S1 에는 무료분이 없습니다.
   - F0 는 구독당 하나만 만들 수 있으니 만든 것을 지우지 말고 계속 쓰세요.
3. 만든 리소스의 **키 및 엔드포인트(Keys and Endpoint)** 화면에서
   - **키 1(KEY 1)** 과
   - **위치/지역(Location/Region, 예: `koreacentral`)** 을 확인합니다.

### 2. Cloudflare Worker 만들기

1. https://dash.cloudflare.com → **Workers & Pages → Create → Create Worker** → 이름 입력 → Deploy
2. **Edit code** 에서 기존 코드를 지우고 `worker.js` 내용을 붙여 넣은 뒤 Deploy
3. **하루 사용량 저장소(KV) 만들기**
   - 왼쪽 메뉴 **Storage & Databases → KV → Create** (이름 예: `translate-usage`)
   - Worker 의 **Settings → Bindings → Add → KV namespace**
     - Variable name: `USAGE`
     - KV namespace: 방금 만든 것
4. Worker 의 **Settings → Variables and Secrets → Add** 로 Secret 두 개를 넣습니다.
   - `AZURE_KEY` = Azure 키 1
   - `AZURE_REGION` = Azure 지역 (예: `koreacentral`)
5. 화면에 나온 Worker 주소(`https://...workers.dev`) 를 `index.html` 의 `TRANSLATE_ENDPOINT` 에 넣습니다.

`TRANSLATE_ENDPOINT` 가 비어 있으면 번역 없이 받아쓰기만 동작합니다.

### 안전장치 (`worker.js` 위쪽에서 바꿀 수 있음)

- `ALLOWED_ORIGINS`: 이 주소(`https://luckyeonu-afk.github.io`) 에서 온 요청만 받습니다. 주소 잠금은 프로그램으로 속일 수 있어서 아래 한도가 실제 안전장치입니다.
- `DAILY_CHAR_LIMIT`: 하루(한국 시간) 최대 50,000자. 다 쓰면 다음 날까지 번역을 멈춥니다.
- `MAX_CHARS`: 한 번에 500자까지.
- Azure 키·지역·KV 중 하나라도 빠지면 번역하지 않습니다.
- Cloudflare 무료 KV 는 하루 쓰기 1,000번 제한이 있어 번역도 하루 약 1,000번까지 됩니다. 넘으면 번역만 멈추고 요금은 나가지 않습니다.
