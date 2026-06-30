const ACCESS_DATA_PATH = "data/access.json";
const AUTH_STORAGE_PREFIX = "toyota-bonus-auth";

function authStorageKey(config) {
  const month = config.effectiveMonth || "default";
  const hashPrefix = String(config.passwordHash || "").slice(0, 12);
  return `${AUTH_STORAGE_PREFIX}:${month}:${hashPrefix}`;
}

function currentAccessMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function resolveAccessConfig(config) {
  const month = currentAccessMonth();
  const monthlyPasswords = config.monthlyPasswords || {};
  const monthConfig = monthlyPasswords[month];

  if (!monthConfig) {
    return {
      ...config,
      effectiveMonth: month,
      passwordHash: "",
      passwordHint: `尚未設定 ${month} 月份密碼`
    };
  }

  return {
    ...config,
    ...monthConfig,
    effectiveMonth: month,
    passwordHint: monthConfig.passwordHint || `請輸入 ${month} 月份密碼`,
    rememberHours: monthConfig.rememberHours ?? config.rememberHours
  };
}

function nowMs() {
  return Date.now();
}

function getRememberMs(config) {
  const hours = Number(config.rememberHours);
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 60 * 60 * 1000);
}

function readAuthCache(config) {
  try {
    const raw = window.localStorage.getItem(authStorageKey(config));
    if (!raw) return false;

    const cached = JSON.parse(raw);
    return Number(cached.expiresAt) > nowMs();
  } catch (_error) {
    return false;
  }
}

function writeAuthCache(config) {
  const rememberMs = getRememberMs(config);
  if (rememberMs <= 0) return;

  try {
    window.localStorage.setItem(
      authStorageKey(config),
      JSON.stringify({ expiresAt: nowMs() + rememberMs })
    );
  } catch (_error) {
    // Local storage can be disabled in private browsing. Password entry still works.
  }
}

async function loadAccessConfig() {
  const response = await fetch(ACCESS_DATA_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`密碼設定載入失敗：${response.status}`);
  return response.json();
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function unlockPage(config) {
  writeAuthCache(config);
  document.querySelector(".password-gate")?.remove();
  document.body.classList.remove("auth-locked");
  window.dispatchEvent(new CustomEvent("toyota:authenticated"));
}

function setGateError(message) {
  const error = document.getElementById("passwordGateError");
  if (!error) return;
  error.textContent = message;
  error.classList.remove("hidden");
}

function renderPasswordGate(config) {
  const gate = document.createElement("div");
  gate.className = "password-gate";
  gate.innerHTML = `
    <form class="password-card" id="passwordGateForm" autocomplete="off">
      <p class="eyebrow">Private Access</p>
      <h1>Toyota 獎金試算</h1>
      <p class="password-copy">${escapeAuthHtml(config.passwordHint || "請輸入本月密碼")}</p>
      <label>
        密碼
        <input id="passwordGateInput" type="password" autocomplete="current-password" inputmode="text" />
      </label>
      <button class="btn" type="submit">進入</button>
      <p id="passwordGateError" class="password-error hidden"></p>
      <p class="password-meta">月份：${escapeAuthHtml(config.effectiveMonth || "未設定")}</p>
    </form>
  `;

  document.body.prepend(gate);
  const input = document.getElementById("passwordGateInput");
  input?.focus();

  document.getElementById("passwordGateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = input.value.trim();
    if (!password) {
      setGateError("請輸入密碼。");
      return;
    }

    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    button.textContent = "確認中";

    try {
      const inputHash = await sha256Hex(password);
      if (inputHash !== config.passwordHash) {
        setGateError("密碼不正確，請重新輸入。");
        input.value = "";
        input.focus();
        return;
      }

      unlockPage(config);
    } catch (_error) {
      setGateError("瀏覽器無法完成密碼驗證，請更新瀏覽器後再試。");
    } finally {
      button.disabled = false;
      button.textContent = "進入";
    }
  });
}

function escapeAuthHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initPasswordGate() {
  document.body.classList.add("auth-locked");

  try {
    const config = resolveAccessConfig(await loadAccessConfig());
    if (!config.passwordHash) throw new Error("缺少 passwordHash");

    if (readAuthCache(config)) {
      unlockPage(config);
      return config;
    }

    await new Promise((resolve) => {
      window.addEventListener("toyota:authenticated", () => resolve(config), { once: true });
      renderPasswordGate(config);
    });

    return config;
  } catch (error) {
    renderPasswordGate({
      effectiveMonth: "設定錯誤",
      passwordHint: "密碼設定檔載入失敗，請聯絡管理者。",
      passwordHash: ""
    });
    setGateError(error.message);
    throw error;
  }
}

window.authReady = initPasswordGate();
