const VEHICLE_DATA_PATH = "data/vehicles.tw.toyota.2026-06-21.json";
const RULES_DATA_PATH = "data/rules.example.json";

const DEFAULT_MODEL_YEARS = [
  { id: "pre-26", label: "準26" },
  { id: "26", label: "正26" },
  { id: "pre-27", label: "準27" }
];

const state = {
  vehicles: [],
  meta: {},
  modelYears: DEFAULT_MODEL_YEARS,
  rules: null,
  latestResult: null
};

const $ = (id) => document.getElementById(id);

const fields = {
  dealMonth: $("dealMonth"),
  salesName: $("salesName"),
  vehicleModel: $("vehicleModel"),
  vehicleGrade: $("vehicleGrade"),
  modelYear: $("modelYear"),
  salePrice: $("salePrice"),
  vehicleBonusAmount: $("vehicleBonusAmount"),
  stageBonusAmount: $("stageBonusAmount"),
  cumulativeBonusAmount: $("cumulativeBonusAmount"),
  supportAmount: $("supportAmount"),
  zeroInterestBurden: $("zeroInterestBurden"),
  externalPromotionDeduction: $("externalPromotionDeduction"),
  manualAdjustment: $("manualAdjustment"),
  insuranceBAmount: $("insuranceBAmount"),
  avAmount: $("avAmount"),
  note: $("note")
};

function currency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0));
}

function wanToTwd(valueWan) {
  return Math.round((Number(valueWan) || 0) * 10000);
}

function numberValue(input, fallback = 0) {
  const raw = typeof input === "string" ? input : input?.value;
  if (raw === "" || raw === null || raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} 載入失敗：${response.status}`);
  return response.json();
}

async function init() {
  fields.dealMonth.value = currentMonthValue();

  try {
    const [vehicleData, rules] = await Promise.all([
      loadJson(VEHICLE_DATA_PATH),
      loadJson(RULES_DATA_PATH)
    ]);

    state.vehicles = vehicleData.vehicles || [];
    state.meta = vehicleData.meta || {};
    state.modelYears = getModelYears(vehicleData);
    state.rules = rules;

    populateModelYears();
    populateModels();
    applyRulesUi();
    renderRulesPreview();
    attachEvents();
    calculate();

    $("dataStamp").textContent = `車輛資料：${state.meta.brand || "Toyota"} ${state.meta.market || "TW"}，驗證日 ${state.meta.verifiedAt || "未標示"}`;
    $("rulesVersion").textContent = `規則：${rules.meta?.version || "未命名"}`;
  } catch (error) {
    console.error(error);
    const message = "資料檔載入失敗。若你是在本機直接開 index.html，請改用本機伺服器，例如：python -m http.server 8080，再開 http://localhost:8080。";
    $("loadError").textContent = `${message} 原始錯誤：${error.message}`;
    $("loadError").classList.remove("hidden");
  }
}

function attachEvents() {
  document.getElementById("calculatorForm").addEventListener("input", calculate);
  fields.vehicleModel.addEventListener("change", () => {
    populateGrades();
    calculate();
  });
  fields.vehicleGrade.addEventListener("change", calculate);
  fields.modelYear.addEventListener("change", calculate);
  $("resetBtn").addEventListener("click", resetForm);
  $("copyBtn").addEventListener("click", copyResult);
}

function getModelYears(vehicleData) {
  const modelYears = vehicleData?.meta?.modelYears;
  return Array.isArray(modelYears) && modelYears.length > 0 ? modelYears : DEFAULT_MODEL_YEARS;
}

function populateModelYears() {
  fields.modelYear.innerHTML = "";
  for (const modelYear of state.modelYears) {
    const option = document.createElement("option");
    option.value = modelYear.id;
    option.textContent = modelYear.label;
    fields.modelYear.appendChild(option);
  }
}

function populateModels() {
  fields.vehicleModel.innerHTML = "";
  for (const vehicle of state.vehicles) {
    const option = document.createElement("option");
    option.value = vehicle.id;
    option.textContent = vehicle.model;
    fields.vehicleModel.appendChild(option);
  }
  populateGrades();
}

function populateGrades() {
  const vehicle = getSelectedVehicle();
  fields.vehicleGrade.innerHTML = "";
  if (!vehicle) return;

  for (const grade of vehicle.grades || []) {
    const option = document.createElement("option");
    option.value = grade.id;
    option.textContent = `${grade.name}｜${grade.powertrain}｜${grade.listPriceWan}萬`;
    fields.vehicleGrade.appendChild(option);
  }
}

function applyRulesUi() {
  fields.supportAmount.value = 0;
}

function getSelectedVehicle() {
  return state.vehicles.find((vehicle) => vehicle.id === fields.vehicleModel.value) || state.vehicles[0];
}

function getSelectedGrade() {
  const vehicle = getSelectedVehicle();
  return vehicle?.grades?.find((grade) => grade.id === fields.vehicleGrade.value) || vehicle?.grades?.[0];
}

function getSelectedModelYear() {
  return state.modelYears.find((modelYear) => modelYear.id === fields.modelYear.value) || state.modelYears[0];
}

function manualNote(amount, zeroLabel = "未填") {
  return Number(amount) === 0 ? zeroLabel : "手動輸入";
}

function calculate() {
  const vehicle = getSelectedVehicle();
  const grade = getSelectedGrade();
  const modelYear = getSelectedModelYear();
  if (!vehicle || !grade || !modelYear) return;

  const defaultPrice = wanToTwd(grade.listPriceWan);
  fields.salePrice.placeholder = `預設：${currency(defaultPrice)}（${grade.listPriceWan}萬）`;

  const basePrice = numberValue(fields.salePrice, defaultPrice) || defaultPrice;
  const vehicleBonus = numberValue(fields.vehicleBonusAmount, 0);
  const stageBonus = numberValue(fields.stageBonusAmount, 0);
  const cumulativeBonus = numberValue(fields.cumulativeBonusAmount, 0);
  const supportAmount = numberValue(fields.supportAmount, 0);
  const zeroInterestBurden = numberValue(fields.zeroInterestBurden, 0);
  const externalPromotionDeduction = numberValue(fields.externalPromotionDeduction, 0);
  const manualAdjustment = numberValue(fields.manualAdjustment, 0);
  const insuranceBonus = numberValue(fields.insuranceBAmount, 0);
  const avBonus = numberValue(fields.avAmount, 0);

  const rows = [
    { label: "車輛獎金", amount: vehicleBonus, note: manualNote(vehicleBonus) },
    { label: "階段獎金", amount: stageBonus, note: manualNote(stageBonus) },
    { label: "業代累計獎金", amount: cumulativeBonus, note: manualNote(cumulativeBonus) },
    { label: "所支援金", amount: supportAmount, note: manualNote(supportAmount) },
    { label: "0利率負擔", amount: -Math.abs(zeroInterestBurden), note: zeroInterestBurden === 0 ? "無" : "手動輸入扣款" },
    { label: "外促活動內扣", amount: -Math.abs(externalPromotionDeduction), note: externalPromotionDeduction === 0 ? "無" : "手動輸入扣款" },
    { label: "保險乙式", amount: insuranceBonus, note: manualNote(insuranceBonus) },
    { label: "影音", amount: avBonus, note: manualNote(avBonus) },
    { label: "其他調整", amount: manualAdjustment, note: manualAdjustment === 0 ? "無" : "手動輸入" }
  ];

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  state.latestResult = {
    dealMonth: fields.dealMonth.value,
    salesName: fields.salesName.value.trim(),
    vehicle,
    grade,
    modelYear,
    basePrice,
    rows,
    total,
    note: fields.note.value.trim()
  };

  renderVehicleCard(vehicle, grade, modelYear, basePrice);
  renderBreakdown(rows, total);
}

function renderVehicleCard(vehicle, grade, modelYear, basePrice) {
  $("vehicleCard").innerHTML = `
    <strong>${vehicle.model}｜${grade.name}</strong><br />
    年式：${modelYear.label}　動力：${grade.powertrain}　類別：${vehicle.category || "未分類"}<br />
    建議售價：${grade.listPriceWan} 萬；本次試算基準：${currency(basePrice)}<br />
    <small>來源：${vehicle.sourceUrl}</small>
  `;
}

function renderBreakdown(rows, total) {
  $("totalBonus").textContent = currency(total);
  $("breakdown").innerHTML = rows.map((row) => `
    <div class="row">
      <div>
        <div class="label">${escapeHtml(row.label)}</div>
        <div class="note">${escapeHtml(row.note || "")}</div>
      </div>
      <div class="amount">${currency(row.amount)}</div>
    </div>
  `).join("");
}

function renderRulesPreview() {
  const rules = state.rules || {};

  $("rulesPreview").innerHTML = `
    <ul>
      <li>適用期間：${escapeHtml(rules.meta?.effectiveFrom || "未設定")} ～ ${escapeHtml(rules.meta?.effectiveTo || "未設定")}</li>
      <li>前台所有獎金項目皆由業務手動輸入。</li>
      <li>0利率負擔與外促活動內扣請填正數，系統會自動扣除。</li>
    </ul>
  `;
}

function resetForm() {
  document.getElementById("calculatorForm").reset();
  fields.dealMonth.value = currentMonthValue();
  fields.vehicleBonusAmount.value = 0;
  fields.stageBonusAmount.value = 0;
  fields.cumulativeBonusAmount.value = 0;
  fields.supportAmount.value = 0;
  fields.zeroInterestBurden.value = 0;
  fields.externalPromotionDeduction.value = 0;
  fields.manualAdjustment.value = 0;
  fields.insuranceBAmount.value = 0;
  fields.avAmount.value = 0;
  populateGrades();
  calculate();
}

async function copyResult() {
  if (!state.latestResult) return;
  const result = state.latestResult;
  const lines = [
    `Toyota 單筆成交獎金試算`,
    `月份：${result.dealMonth || "未填"}`,
    `業代：${result.salesName || "未填"}`,
    `車款：${result.vehicle.model} ${result.grade.name}`,
    `年式：${result.modelYear?.label || "未填"}`,
    `基準金額：${currency(result.basePrice)}`,
    ...result.rows.map((row) => `${row.label}：${currency(row.amount)}（${row.note || ""}）`),
    `總獎金：${currency(result.total)}`,
    result.note ? `備註：${result.note}` : ""
  ].filter(Boolean).join("\n");

  try {
    await navigator.clipboard.writeText(lines);
    flashButton("copyBtn", "已複製");
  } catch (_error) {
    window.prompt("請手動複製以下試算結果", lines);
  }
}

function flashButton(id, text) {
  const button = $(id);
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = old; }, 1200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
