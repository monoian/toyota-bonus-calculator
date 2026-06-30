# Codex Handoff｜Toyota 單筆成交獎金計算器

## 專案背景

這是一個給台灣 Toyota 一線銷售人員使用的「單筆成交獎金計算器」。使用者選一台車與車輛等級後，系統即時顯示本單總獎金與明細。

目前定位：

- 使用情境：單筆成交試算，不是月結報表。
- 使用對象：上百位業務同仁，主要用手機，也會用桌機。
- 部署方式：GitHub Pages 靜態網站優先。
- 車輛資料：預載台灣 Toyota 車系與等級，後續由業主調整獎金金額。
- 獎金規則：車輛獎金固定在車輛資料；階段獎金、業代累計獎金、所支援金、保險乙式、影音可調整。

## 目前檔案結構

```text
toyota-bonus-calculator/
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   ├── vehicles.tw.toyota.2026-06-21.json
│   └── rules.example.json
├── docs/
│   └── ARCHITECTURE.md
├── prompts/
│   └── codex-architecture-prompt.md
├── README.md
├── CHANGELOG.md
└── CODEX_HANDOFF.md
```

## 目前功能

- 車系選單。
- 車輛等級選單。
- 建議售價與試算基準金額。
- 車輛獎金：支援固定金額與百分比兩種模式。
- 階段獎金：依台數級距，也可單筆覆寫。
- 業代累計獎金：依台數級距，也可單筆覆寫。
- 所支援金：手動輸入。
- 保險乙式：勾選加計。
- 影音：勾選加計。
- 其他調整：可正可負。
- 即時計算總獎金。
- 複製試算結果。
- 清空重算。
- 響應式版面，手機版改成上下排列。

## 重要架構決策

### 1. 先維持純前端

目前不設資料庫與登入，原因是第一版要快速讓業務使用，且 GitHub Pages 只適合靜態網站。

### 2. 真實獎金不要放公開 repo

如果 repository 或 GitHub Pages 是公開的，`data/*.json` 的獎金資料會被讀到。正式版本應該至少考慮：

- 使用私有 GitHub repo + 受控發布環境。
- 或將真實規則放在公司內網/有登入的環境。
- 或將公開版只保留 0 元範例資料。

### 3. 車輛資料與規則資料分離

`vehicles.tw.toyota.2026-06-21.json`：

- 放車系、等級、動力、建議售價、車輛固定獎金或百分比。

`rules.example.json`：

- 放階段獎金、業代累計獎金、所支援金預設值、保險乙式、影音。

### 4. 不在 JavaScript 裡硬寫業務規則

`assets/app.js` 只做：

- 讀 JSON。
- 套規則。
- 顯示畫面。
- 複製結果。

金額與級距應盡量保留在 JSON，方便非工程人員修改。

## 下一階段建議

### Phase 1：資料維護安全化

- 加 `data/rules.template.json`，只放格式與 0 元範例。
- 加 `data/rules.private.example.json`，說明不要提交真實版本。
- `.gitignore` 加入 `data/rules.private.json`。
- README 清楚說明公開部署不要放真實獎金。

### Phase 2：管理者維護體驗

- 做一個 `admin.html`，讓主管用表單調整階段/累計/保險/影音數字。
- 支援匯出 JSON。
- 不一定要直接存檔，先讓主管產生 JSON 後交給維護者覆蓋。

### Phase 3：大量使用穩定性

- 加錯誤提示：資料檔讀不到、車款無等級、金額格式錯誤。
- 加版本顯示：規則月份、車輛資料驗證日期。
- 加測試案例，確認各獎金項目加總正確。
- 加公式註解，避免業務誤解。

### Phase 4：正式部署

- 確認公司是否允許把真實獎金放在 GitHub Pages。
- 如果不允許，改部署到公司內網或需要登入的靜態 hosting。
- 若仍用 GitHub Pages，建議只放公開可見資料，不放內部獎金。

## Codex 首次任務建議

請 Codex 先不要大改 UI，先做架構整理與可維護性強化：

1. 檢查 `assets/app.js` 是否有可拆分的計算邏輯。
2. 新增 `assets/calculator.js`，把純計算邏輯移出去。
3. 新增簡單測試檔，例如 `tests/calculator.test.js`。
4. 新增資料 schema 文件，說明 vehicles 與 rules JSON 欄位。
5. 新增 `.gitignore`，避免真實內部獎金規則被提交。
6. 更新 README 的部署與資安提醒。

## 驗收標準

- GitHub Pages 開啟後畫面正常。
- 選車系/等級後，車輛資訊會更新。
- 任一獎金欄位變更後，總獎金立即更新。
- 手機版 390px 寬度可正常操作。
- 不需要後端即可運作。
- 真實內部獎金資料不應被誤提交到公開 repo。
