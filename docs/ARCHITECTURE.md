# Architecture｜Toyota 單筆成交獎金計算器

## 目標

建立一個低維護成本、容易部署、手機友善的單筆成交獎金試算工具。

## 使用者流程

1. 業務打開網頁。
2. 選擇成交月份。
3. 選擇車系。
4. 選擇車輛等級。
5. 選擇年式：準26、正26、準27。
6. 輸入或覆寫成交金額。
7. 輸入階段台數、業代累計台數、所支援金、0利率負擔、外促活動內扣與其他調整。
8. 勾選保險乙式、影音。
9. 右側或下方即時顯示總獎金與明細。
10. 業務可複製結果給主管或自行留存。

## 模組

### `index.html`

負責頁面結構與表單欄位。

### `assets/styles.css`

負責版面、手機響應式與視覺樣式。

### `assets/app.js`

目前負責：

- 載入 JSON 資料。
- 填入車系/等級選單。
- 計算獎金。
- 渲染明細。
- 複製結果。

未來建議拆成：

```text
assets/
├── app.js            # DOM 與事件
├── calculator.js     # 純計算邏輯
├── data-loader.js    # JSON 載入與驗證
└── format.js         # 金額與文字格式化
```

### `admin.html`

車輛獎金維護頁。主管可上傳 Excel，系統在瀏覽器內比對車系/等級/年式並產生新的車輛 JSON。此頁不負責登入、存檔或直接寫入 GitHub。

Excel 建議欄位：

```text
車系ID, 車系, 等級ID, 車輛等級, 年式ID, 年式, 動力, 建議售價萬, 獎金模式, 固定獎金, 百分比獎金
```

比對優先順序：

1. 車輛：`等級ID`
2. 車輛備援：`車系 + 車輛等級`
3. 車輛備援：`車系ID + 車輛等級`
4. 年式：`年式ID`
5. 年式備援：`年式`

### `data/vehicles.tw.toyota.2026-06-21.json`

車輛資料。

主要欄位：

```json
{
  "id": "corolla-cross",
  "model": "COROLLA CROSS",
  "category": "運動休旅車",
  "sourceUrl": "https://www.toyota.com.tw/showroom/COROLLA_CROSS/",
  "grades": [
    {
      "id": "corolla-cross-hybrid-flagship",
      "name": "HYBRID 旗艦",
      "powertrain": "HYBRID",
      "listPriceWan": 98.9,
      "vehicleBonusMode": "fixed",
      "vehicleBonusFixed": 0,
      "yearBonuses": {
        "pre-26": { "label": "準26", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 },
        "26": { "label": "正26", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 },
        "pre-27": { "label": "準27", "vehicleBonusMode": "fixed", "vehicleBonusFixed": 0 }
      }
    }
  ]
}
```

### `data/rules.example.json`

非車輛固定獎金規則。

主要欄位：

```json
{
  "stageBonusTiers": [
    { "minUnits": 0, "label": "未達階段", "amount": 0 }
  ],
  "cumulativeBonusTiers": [
    { "minUnits": 0, "label": "未達累計", "amount": 0 }
  ],
  "addOns": {
    "insuranceB": { "label": "保險乙式", "amount": 0 },
    "av": { "label": "影音", "amount": 0 }
  },
  "support": {
    "label": "所支援金",
    "defaultAmount": 0
  }
}
```

## 計算公式

```text
總獎金 = 車輛獎金
       + 階段獎金
       + 業代累計獎金
       + 所支援金
       - 0利率負擔
       - 外促活動內扣
       + 保險乙式獎金
       + 影音獎金
       + 其他調整
```

### 車輛獎金

固定金額：

```text
所選年式的 yearBonuses[modelYear].vehicleBonusFixed
若未設定年式獎金，使用 grade.vehicleBonusFixed
```

百分比：

```text
成交金額 × 所選年式 vehicleBonusRate / 100
若未設定年式獎金，使用 grade.vehicleBonusRate
```

如果本單輸入 `車輛獎金固定值`，以本單覆寫值為準。

### 階段獎金

依 `stageUnits` 找符合的最高 `minUnits` 級距。

如果本單輸入 `階段獎金覆寫`，以覆寫值為準。

### 業代累計獎金

依 `cumulativeUnits` 找符合的最高 `minUnits` 級距。

如果本單輸入 `累計獎金覆寫`，以覆寫值為準。

## 安全與隱私

這個工具的最大風險不是程式，而是資料外洩。

若真實獎金數字屬於內部資料，請不要放在公開 GitHub Pages。即使畫面沒有顯示完整資料，瀏覽器仍會下載 JSON，使用者可透過開發者工具或網址讀取。

Excel 後台只在瀏覽器內解析檔案並下載 JSON，不會自動上傳。但如果最後把含真實獎金的 JSON 放進公開 Pages，資料仍會公開。

## 測試重點

- 固定車輛獎金是否正確。
- 百分比車輛獎金是否用成交金額計算。
- 年式切換是否套用對應車輛獎金。
- 階段級距是否取最高符合級距。
- 累計級距是否取最高符合級距。
- 覆寫欄位是否優先於規則。
- 0利率負擔是否以正數輸入並扣除。
- 外促活動內扣是否以正數輸入並扣除。
- 負數其他調整是否可正確扣除。
- 手機版是否容易操作。
