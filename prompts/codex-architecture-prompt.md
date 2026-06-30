# Codex Prompt｜接續 Toyota 獎金計算器架構討論

你正在接手一個純前端 GitHub Pages 專案：Toyota 單筆成交獎金計算器。

請先閱讀：

- `CODEX_HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `README.md`
- `assets/app.js`
- `data/vehicles.tw.toyota.2026-06-21.json`
- `data/rules.example.json`

## 背景

這個工具給台灣 Toyota 一線銷售人員使用。業務選一台車與車輛等級後，輸入階段台數、累計台數、所支援金、保險乙式、影音等資料，立即看到單筆成交總獎金。

目前第一版可以運作，但需要繼續討論與整理架構，讓未來維護更安全、穩定、容易交接。

## 請你先做架構 review，不要急著大改 UI

請輸出：

1. 目前架構的優點。
2. 目前架構的風險。
3. 建議的檔案拆分方式。
4. 是否需要 TypeScript / build tool；若不需要，請說明原因。
5. JSON 規則資料該怎麼避免外洩。
6. 未來若要支援多月份獎金規則，資料夾應怎麼設計。
7. 建議的第一個 PR 範圍，控制在小而安全。

## 約束

- 第一版仍以 GitHub Pages 靜態網站為主。
- 不能假設有後端或資料庫。
- 真實內部獎金資料不能放在公開 repo。
- 保持手機操作簡單。
- 公式透明，業務看得懂每一項明細。
