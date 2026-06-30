const VEHICLE_DATA_PATH = "data/vehicles.tw.toyota.2026-06-21.json";

const DEFAULT_MODEL_YEARS = [
  { id: "pre-26", label: "準26" },
  { id: "26", label: "正26" },
  { id: "pre-27", label: "準27" }
];

const state = {
  vehicleData: null,
  modelYears: DEFAULT_MODEL_YEARS,
  selectedFile: null,
  results: [],
  updatedData: null,
  summary: {
    total: 0,
    ok: 0,
    error: 0,
    skipped: 0
  }
};

const $ = (id) => document.getElementById(id);

const headers = [
  "車系ID",
  "車系",
  "等級ID",
  "車輛等級",
  "年式ID",
  "年式",
  "動力",
  "建議售價萬",
  "獎金模式",
  "固定獎金",
  "百分比獎金"
];

const headerAliases = {
  vehicleId: ["車系ID", "車系代碼", "modelId", "vehicleId"],
  model: ["車系", "車款", "model"],
  gradeId: ["等級ID", "車輛等級ID", "gradeId"],
  gradeName: ["車輛等級", "等級", "grade", "gradeName"],
  modelYearId: ["年式ID", "年式代碼", "modelYearId"],
  modelYearLabel: ["年式", "車輛年式", "modelYear"],
  mode: ["獎金模式", "模式", "vehicleBonusMode"],
  fixed: ["固定獎金", "車輛獎金", "車輛固定獎金", "vehicleBonusFixed"],
  rate: ["百分比獎金", "獎金百分比", "百分比", "vehicleBonusRate"]
};

async function initAdmin() {
  bindEvents();
  updateParserStatus();

  try {
    state.vehicleData = await loadJson(VEHICLE_DATA_PATH);
    state.modelYears = getModelYears(state.vehicleData);
    const meta = state.vehicleData.meta || {};
    $("catalogVersion").textContent = `車輛資料：${meta.verifiedAt || "未標示"}`;
    $("adminDataStamp").textContent = `目前基準檔：${VEHICLE_DATA_PATH}`;
    setStatus(`已載入 ${countGrades(state.vehicleData)} 個車輛等級、${state.modelYears.length} 種年式。`, "ready");
    $("downloadTemplateBtn").disabled = false;
  } catch (error) {
    showAlert(`車輛資料載入失敗：${error.message}`);
  }
}

function getModelYears(data) {
  const modelYears = data?.meta?.modelYears;
  return Array.isArray(modelYears) && modelYears.length > 0 ? modelYears : DEFAULT_MODEL_YEARS;
}

function countGrades(data) {
  return (data?.vehicles || []).reduce((count, vehicle) => count + (vehicle.grades || []).length, 0);
}

function updateParserStatus() {
  const ready = Boolean(window.XLSX);
  $("excelParserStatus").textContent = ready ? "Excel：可讀取 .xlsx" : "Excel：未載入";
  $("excelParserStatus").dataset.type = ready ? "ok" : "error";
}

function bindEvents() {
  $("bonusFile").addEventListener("change", (event) => {
    state.selectedFile = event.target.files?.[0] || null;
    $("fileName").textContent = state.selectedFile ? state.selectedFile.name : "尚未選擇檔案";
    $("applyUploadBtn").disabled = !state.selectedFile || !state.vehicleData;
    clearResults();
  });

  $("downloadTemplateBtn").addEventListener("click", downloadTemplate);
  $("applyUploadBtn").addEventListener("click", applyUpload);
  $("downloadJsonBtn").addEventListener("click", downloadUpdatedJson);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} 載入失敗：${response.status}`);
  return response.json();
}

function flattenVehicles(data) {
  const rows = [];
  const modelYears = getModelYears(data);
  for (const vehicle of data?.vehicles || []) {
    for (const grade of vehicle.grades || []) {
      for (const modelYear of modelYears) {
        const bonusSource = getYearBonusSource(grade, modelYear.id);
        rows.push({
          vehicleId: vehicle.id,
          model: vehicle.model,
          gradeId: grade.id,
          gradeName: grade.name,
          modelYearId: modelYear.id,
          modelYearLabel: modelYear.label,
          powertrain: grade.powertrain,
          listPriceWan: grade.listPriceWan,
          mode: bonusSource.vehicleBonusMode || "fixed",
          fixed: bonusSource.vehicleBonusFixed ?? 0,
          rate: bonusSource.vehicleBonusRate ?? ""
        });
      }
    }
  }
  return rows;
}

function getYearBonusSource(grade, modelYearId) {
  return grade?.yearBonuses?.[modelYearId] || grade;
}

function downloadTemplate() {
  if (!state.vehicleData) return;
  const rows = flattenVehicles(state.vehicleData).map((row) => ({
    "車系ID": row.vehicleId,
    "車系": row.model,
    "等級ID": row.gradeId,
    "車輛等級": row.gradeName,
    "年式ID": row.modelYearId,
    "年式": row.modelYearLabel,
    "動力": row.powertrain,
    "建議售價萬": row.listPriceWan,
    "獎金模式": row.mode === "percentage" ? "百分比" : "固定",
    "固定獎金": row.fixed,
    "百分比獎金": row.rate
  }));

  if (window.XLSX) {
    const worksheet = window.XLSX.utils.json_to_sheet(rows, { header: headers });
    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 22 },
      { wch: 36 },
      { wch: 24 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 }
    ];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "車輛獎金");
    const output = window.XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(
      output,
      "toyota-vehicle-bonus-template.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return;
  }

  downloadBlob(toCsv(rows, headers), "toyota-vehicle-bonus-template.csv", "text/csv;charset=utf-8");
}

async function applyUpload() {
  hideAlert();
  if (!state.selectedFile) return;
  if (!window.XLSX) {
    showAlert("Excel 解析工具尚未載入。請確認網路可連到 cdn.jsdelivr.net，或改用已內建套件的正式版本。");
    return;
  }

  try {
    const rows = await readWorkbookRows(state.selectedFile);
    const { results, updatedData, summary } = applyRows(rows);
    state.results = results;
    state.updatedData = updatedData;
    state.summary = summary;
    renderResults();
  } catch (error) {
    showAlert(`Excel 讀取失敗：${error.message}`);
  }
}

function readWorkbookRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = window.XLSX.read(reader.result, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("找不到工作表");
        const worksheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("檔案無法讀取"));
    reader.readAsArrayBuffer(file);
  });
}

function applyRows(uploadRows) {
  const updatedData = structuredClone(state.vehicleData);
  const index = createVehicleIndex(updatedData);
  const results = [];

  for (let i = 0; i < uploadRows.length; i += 1) {
    const row = normalizeUploadRow(uploadRows[i]);
    const rowNumber = i + 2;

    if (isBlankUploadRow(row)) {
      results.push(makeResult(rowNumber, row, "skipped", "空白列"));
      continue;
    }

    const match = findMatch(row, index);
    if (!match) {
      results.push(makeResult(rowNumber, row, "error", "找不到對應車輛等級"));
      continue;
    }

    const modelYear = findModelYear(row);
    if (!modelYear) {
      results.push(makeResult(rowNumber, row, "error", "找不到或缺少年式", match));
      continue;
    }

    const bonusSource = getYearBonusSource(match.grade, modelYear.id);
    const mode = inferBonusMode(row, bonusSource);
    if (!mode) {
      results.push(makeResult(rowNumber, row, "skipped", "沒有填寫獎金", match, { modelYear }));
      continue;
    }

    const fixed = parseAmount(row.fixed);
    const rate = parseAmount(row.rate);

    if (mode === "fixed") {
      if (fixed === null) {
        results.push(makeResult(rowNumber, row, "error", "固定模式需填固定獎金", match, { modelYear }));
        continue;
      }
      if (fixed < 0) {
        results.push(makeResult(rowNumber, row, "error", "固定獎金不可為負數", match, { modelYear }));
        continue;
      }

      const target = setYearBonusTarget(match.grade, modelYear);
      target.vehicleBonusMode = "fixed";
      target.vehicleBonusFixed = Math.round(fixed);
      delete target.vehicleBonusRate;
      results.push(makeResult(rowNumber, row, "ok", "已更新固定獎金", match, { modelYear, mode, fixed, rate: "" }));
      continue;
    }

    if (rate === null) {
      results.push(makeResult(rowNumber, row, "error", "百分比模式需填百分比獎金", match, { modelYear }));
      continue;
    }
    if (rate < 0) {
      results.push(makeResult(rowNumber, row, "error", "百分比獎金不可為負數", match, { modelYear }));
      continue;
    }

    const target = setYearBonusTarget(match.grade, modelYear);
    target.vehicleBonusMode = "percentage";
    target.vehicleBonusRate = rate;
    delete target.vehicleBonusFixed;
    results.push(makeResult(rowNumber, row, "ok", "已更新百分比獎金", match, { modelYear, mode, fixed: "", rate }));
  }

  const summary = results.reduce((acc, result) => {
    acc.total += 1;
    acc[result.status] += 1;
    return acc;
  }, { total: 0, ok: 0, error: 0, skipped: 0 });

  return { results, updatedData, summary };
}

function createVehicleIndex(data) {
  const gradeId = new Map();
  const modelGrade = new Map();
  const vehicleIdGrade = new Map();

  for (const vehicle of data?.vehicles || []) {
    for (const grade of vehicle.grades || []) {
      const match = { vehicle, grade };
      gradeId.set(normalizeKey(grade.id), match);
      modelGrade.set(`${normalizeKey(vehicle.model)}|${normalizeKey(grade.name)}`, match);
      vehicleIdGrade.set(`${normalizeKey(vehicle.id)}|${normalizeKey(grade.name)}`, match);
    }
  }

  return { gradeId, modelGrade, vehicleIdGrade };
}

function normalizeUploadRow(rawRow) {
  return {
    vehicleId: cellValue(rawRow, headerAliases.vehicleId),
    model: cellValue(rawRow, headerAliases.model),
    gradeId: cellValue(rawRow, headerAliases.gradeId),
    gradeName: cellValue(rawRow, headerAliases.gradeName),
    modelYearId: cellValue(rawRow, headerAliases.modelYearId),
    modelYearLabel: cellValue(rawRow, headerAliases.modelYearLabel),
    mode: cellValue(rawRow, headerAliases.mode),
    fixed: cellValue(rawRow, headerAliases.fixed),
    rate: cellValue(rawRow, headerAliases.rate)
  };
}

function cellValue(row, aliases) {
  const normalized = new Map(
    Object.keys(row).map((key) => [normalizeHeader(key), key])
  );

  for (const alias of aliases) {
    const key = normalized.get(normalizeHeader(alias));
    if (key) return String(row[key] ?? "").trim();
  }

  return "";
}

function findMatch(row, index) {
  if (row.gradeId) {
    const byGradeId = index.gradeId.get(normalizeKey(row.gradeId));
    if (byGradeId) return byGradeId;
  }

  if (row.model && row.gradeName) {
    const byModelGrade = index.modelGrade.get(`${normalizeKey(row.model)}|${normalizeKey(row.gradeName)}`);
    if (byModelGrade) return byModelGrade;
  }

  if (row.vehicleId && row.gradeName) {
    const byVehicleGrade = index.vehicleIdGrade.get(`${normalizeKey(row.vehicleId)}|${normalizeKey(row.gradeName)}`);
    if (byVehicleGrade) return byVehicleGrade;
  }

  return null;
}

function findModelYear(row) {
  if (row.modelYearId) {
    const byId = state.modelYears.find((modelYear) => normalizeKey(modelYear.id) === normalizeKey(row.modelYearId));
    if (byId) return byId;
  }

  if (row.modelYearLabel) {
    const byLabel = state.modelYears.find((modelYear) => normalizeKey(modelYear.label) === normalizeKey(row.modelYearLabel));
    if (byLabel) return byLabel;
  }

  return null;
}

function setYearBonusTarget(grade, modelYear) {
  if (!grade.yearBonuses) grade.yearBonuses = {};
  if (!grade.yearBonuses[modelYear.id]) grade.yearBonuses[modelYear.id] = {};
  grade.yearBonuses[modelYear.id].label = modelYear.label;
  return grade.yearBonuses[modelYear.id];
}

function inferBonusMode(row, grade) {
  const mode = normalizeKey(row.mode);
  if (["fixed", "fix", "固定"].includes(mode)) return "fixed";
  if (["percentage", "percent", "rate", "百分比", "趴數"].includes(mode) || row.mode.includes("%")) return "percentage";
  if (row.rate !== "") return "percentage";
  if (row.fixed !== "") return "fixed";
  return grade.vehicleBonusMode || null;
}

function isBlankUploadRow(row) {
  return !row.vehicleId && !row.model && !row.gradeId && !row.gradeName && !row.modelYearId && !row.modelYearLabel && !row.mode && !row.fixed && !row.rate;
}

function makeResult(rowNumber, row, status, message, match = null, applied = null) {
  return {
    rowNumber,
    vehicle: match?.vehicle?.model || row.model || row.vehicleId || "",
    grade: match?.grade?.name || row.gradeName || row.gradeId || "",
    modelYear: applied?.modelYear?.label || row.modelYearLabel || row.modelYearId || "",
    mode: applied?.mode || row.mode || "",
    fixed: applied?.fixed ?? row.fixed ?? "",
    rate: applied?.rate ?? row.rate ?? "",
    status,
    message
  };
}

function renderResults() {
  $("totalRows").textContent = state.summary.total;
  $("okRows").textContent = state.summary.ok;
  $("errorRows").textContent = state.summary.error;

  const hasErrors = state.summary.error > 0;
  const hasUpdates = state.summary.ok > 0;
  $("downloadJsonBtn").disabled = !hasUpdates || hasErrors;

  if (hasErrors) {
    setStatus("有資料需要修正，修正 Excel 後再重新上傳。", "error");
  } else if (hasUpdates) {
    setStatus("比對完成，可以下載更新後 JSON。", "ok");
  } else {
    setStatus("沒有可更新的車輛獎金。", "ready");
  }

  $("previewRows").innerHTML = state.results.map((result) => `
    <tr>
      <td>${escapeHtml(result.rowNumber)}</td>
      <td>${escapeHtml(result.vehicle)}</td>
      <td>${escapeHtml(result.grade)}</td>
      <td>${escapeHtml(result.modelYear)}</td>
      <td>${escapeHtml(labelMode(result.mode))}</td>
      <td>${escapeHtml(result.fixed)}</td>
      <td>${escapeHtml(result.rate)}</td>
      <td>
        <span class="status-badge ${statusClass(result.status)}">${statusLabel(result.status)}</span>
        <span class="status-message">${escapeHtml(result.message)}</span>
      </td>
    </tr>
  `).join("");
}

function clearResults() {
  state.results = [];
  state.updatedData = null;
  state.summary = { total: 0, ok: 0, error: 0, skipped: 0 };
  $("totalRows").textContent = "0";
  $("okRows").textContent = "0";
  $("errorRows").textContent = "0";
  $("downloadJsonBtn").disabled = true;
  $("previewRows").innerHTML = `<tr><td colspan="8" class="empty-cell">尚未匯入資料</td></tr>`;
  setStatus("檔案已選擇，請套用並預覽。", "ready");
}

function downloadUpdatedJson() {
  if (!state.updatedData) return;
  const meta = state.updatedData.meta || {};
  const verifiedAt = meta.verifiedAt || new Date().toISOString().slice(0, 10);
  const filename = `vehicles.tw.toyota.${verifiedAt}.updated.json`;
  const json = `${JSON.stringify(state.updatedData, null, 2)}\n`;
  downloadBlob(json, filename, "application/json;charset=utf-8");
}

function parseAmount(value) {
  const cleaned = String(value ?? "")
    .replaceAll(",", "")
    .replaceAll("，", "")
    .replaceAll("NT$", "")
    .replaceAll("$", "")
    .replaceAll("%", "")
    .trim();

  if (cleaned === "") return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()（）/／]/g, "");
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()（）/／|｜]/g, "");
}

function labelMode(mode) {
  if (mode === "fixed" || normalizeKey(mode) === "固定") return "固定";
  if (mode === "percentage" || normalizeKey(mode) === "百分比" || String(mode).includes("%")) return "百分比";
  return mode || "";
}

function statusClass(status) {
  return {
    ok: "ok",
    error: "error",
    skipped: "skip"
  }[status] || "skip";
}

function statusLabel(status) {
  return {
    ok: "可更新",
    error: "需修正",
    skipped: "略過"
  }[status] || "略過";
}

function setStatus(message, type) {
  const status = $("adminStatus");
  status.textContent = message;
  status.dataset.type = type;
}

function showAlert(message) {
  $("adminAlert").textContent = message;
  $("adminAlert").classList.remove("hidden");
}

function hideAlert() {
  $("adminAlert").classList.add("hidden");
}

function toCsv(rows, columnHeaders) {
  const lines = [
    columnHeaders.join(","),
    ...rows.map((row) => columnHeaders.map((header) => csvEscape(row[header])).join(","))
  ];
  return `\ufeff${lines.join("\n")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initAdmin();
