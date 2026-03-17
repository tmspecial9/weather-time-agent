# Weather Time Agent

以 [@nxtlinq/attest](https://www.npmjs.com/package/@nxtlinq/attest) 簽章與驗證的 AI Agent，提供**天氣查詢**（`get_weather`）與**時間查詢**（`get_time`），透過 OpenAI tool call 執行，僅會跑 manifest scope 內宣告的 tools。

## 需求

- Node.js 22+
- OpenAI API Key

## 使用方式

```bash
npm install
cp .env.example .env   # 編輯 .env，填入 OPENAI_API_KEY
npm run dev            # 或 npm run build && npm run start
```

## Attest（簽章與 CI 驗證）

**首次設定：**

1. `npm run attest:init` — 建立 `nxtlinq/` 與金鑰、manifest  
2. 編輯 `nxtlinq/agent.manifest.json` 的 `scope`（例：`["tool:get_weather", "tool:get_time"]`）  
3. `npm run attest:sign` — 產生簽章  
4. 提交 `nxtlinq/agent.manifest.json`、`nxtlinq/agent.manifest.sig`、`nxtlinq/public.key`（勿提交 `nxtlinq/private.key`）

**CI：** 專案內含 `.github/workflows/attest-verify.yml`，push/PR 時會執行 `npm run attest:verify` 驗證簽章與 artifact。
