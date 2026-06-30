# Toyota 單筆成交獎金計算器

這是一個可直接部署到 GitHub Pages 的純前端專案，目標是讓一線銷售人員用手機或電腦快速計算「單筆成交總獎金」。

## 功能

- 選擇台灣 Toyota 車系、車輛等級與年式
- 預載目前台灣 Toyota 車系與等級資料
- 車輛獎金支援固定金額，也預留百分比模式
- 階段獎金依台數級距自動套用
- 業代累計獎金依台數級距自動套用
- 所支援金手動輸入
- 0利率負擔以正數輸入，計算時從總獎金扣除
- 外促活動內扣以正數輸入，計算時從總獎金扣除
- 保險乙式、影音勾選計算
- 可複製試算結果給主管或內部群組
- 車輛獎金後台可上傳 Excel，預覽後匯出新的車輛 JSON

## 檔案結構

```text
.
├── index.html
├── admin.html
├── assets/
│   ├── app.js
│   ├── admin.js
│   ├── styles.css
│   └── vendor/
│       ├── xlsx.full.min.js
│       └── xlsx.LICENSE.txt
└── data/
    ├── vehicles.tw.toyota.2026-06-21.json
    └── rules.example.json
```

## 你最常改的地方

### 0. 每月登入密碼

前台與後台會先要求輸入當月密碼。密碼設定在：

```text
data/access.json
```

檔案內只存 SHA-256 hash，不存明文密碼。目前已設定 2026-06、2026-07、2026-08 三個月份。

每月換密碼時：

1. 決定新的密碼。
2. 在 Mac 終端機執行：

```bash
printf %s '你的新密碼' | shasum -a 256
```

3. 把輸出的第一段 hash 貼到 `monthlyPasswords` 對應月份的 `passwordHash`。
4. 更新 `meta.version`、`meta.updatedAt`。
5. 提交並推送到 GitHub Pages。

這是靜態網站的簡易門檻，可以防止一般外部人員拿網址直接使用；若需要真正權限控管，請改用有登入驗證的部署平台。

### 1. 車輛固定獎金

請打開：

```text
data/vehicles.tw.toyota.2026-06-21.json
```

每個等級都有預設獎金欄位：

```json
{
  "name": "HYBRID 豪華",
  "listPriceWan": 104.0,
  "vehicleBonusMode": "fixed",
  "vehicleBonusFixed": 0
}
```

把 `vehicleBonusFixed` 改成公司公告的固定車輛獎金即可。金額單位是「元」。

若同一個車輛等級要依年式分開維護，後台匯出的 JSON 會在該等級下新增 `yearBonuses`：

```json
{
  "yearBonuses": {
    "pre-26": { "label": "準26", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 },
    "26": { "label": "正26", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 },
    "pre-27": { "label": "準27", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 }
  }
}
```

前台會優先使用所選年式的 `yearBonuses`；如果該年式沒有設定，才使用等級上的預設獎金欄位。

若未來某車款要用百分比，可改成：

```json
{
  "vehicleBonusMode": "percentage",
  "vehicleBonusRate": 1.2
}
```

意思是用成交金額的 1.2% 計算。

也可以打開：

```text
admin.html
```

下載 Excel 範本，填好各年式的「固定獎金」或「百分比獎金」後上傳。後台會先顯示比對結果，確認無錯誤後再下載新的車輛 JSON。這個後台是純前端工具，不會自動把 Excel 或獎金資料上傳到任何伺服器。

Excel 解析工具已放在 `assets/vendor/xlsx.full.min.js`，所以後台不需要連外部 CDN 才能讀 `.xlsx`。

### 2. 階段獎金、業代累計獎金、保險乙式、影音

請打開：

```text
data/rules.example.json
```

級距範例：

```json
"stageBonusTiers": [
  { "minUnits": 0, "label": "未達階段", "amount": 0 },
  { "minUnits": 3, "label": "第 1 階段", "amount": 0 },
  { "minUnits": 5, "label": "第 2 階段", "amount": 0 }
]
```

系統會自動找「小於或等於輸入台數的最高級距」。例如輸入 6 台，會套用 `minUnits: 5` 的級距。

保險乙式與影音：

```json
"addOns": {
  "insuranceB": { "label": "保險乙式", "amount": 0 },
  "av": { "label": "影音", "amount": 0 }
}
```

## 計算公式

```text
總獎金 =
  車輛獎金
+ 階段獎金
+ 業代累計獎金
+ 所支援金
- 0利率負擔
- 外促活動內扣
+ 保險乙式獎金
+ 影音獎金
+ 其他調整
```

## 本機測試

不要直接雙擊 `index.html`，因為瀏覽器可能擋掉 JSON 載入。請在專案資料夾內執行：

```bash
python -m http.server 8080
```

然後開啟：

```text
http://localhost:8080
```

上 GitHub 前建議先確認：

1. 打開 `http://localhost:8080`，選車系與等級，確認獎金明細會即時更新。
2. 打開 `http://localhost:8080/admin.html`，下載 Excel 範本並測試上傳。
3. 從後台下載新的車輛 JSON 後，人工確認金額無誤，再替換 `data/vehicles.tw.toyota.2026-06-21.json`。
4. 確認 `data/private/`、`*.private.json`、`*.local.xlsx` 沒有被提交。

## 部署到 GitHub Pages

1. 建立 GitHub repository。
2. 上傳本專案全部檔案。
3. 到 repository 的 **Settings → Pages**。
4. Source 選 **Deploy from a branch**。
5. Branch 選 `main`，Folder 選 `/root`。
6. 儲存後等待部署完成。

## 重要資安提醒

若 repository 或 GitHub Pages 是公開的，`data/*.json` 裡的獎金規則也會被看見。若獎金金額屬於內部敏感資料，建議：

1. 使用 GitHub Enterprise Cloud 的 private Pages。
2. 或改部署到有公司帳號驗證的平台。
3. 或只把程式公開，真實獎金規則由內部管道載入。

## 更新車輛資料

本版車輛資料是依台灣 Toyota 官網於 2026-06-21 可見資料整理。Toyota 官網車款與等級可能異動，建議每月或每季檢查一次：

- https://www.toyota.com.tw/showroom/
