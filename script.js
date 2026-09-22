const $ = (id) => document.getElementById(id);
const displayEl = $("display");
const expressionEl = $("expression");
const histList = $("histList");
const histEmpty = $("histEmpty");
const clearHistoryBtn = $("clearHistory");
const opButtons = document.querySelectorAll(".key.op");

const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const HISTORY_KEY = "calc-history-v1";
const MAX_HISTORY = 30;

let current = "0";        // number being typed / last result
let previous = null;      // left-hand operand
let operator = null;      // pending operator
let startNew = false;     // next digit starts a fresh number
let history = loadHistory();

/* ---------- history storage ---------- */
function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* storage may be unavailable */ }
}

/* ---------- formatting ---------- */
function format(value) {
  if (value === "Error") return value;
  const negative = String(value).startsWith("-");
  const [int, dec] = String(value).replace("-", "").split(".");
  const grouped = Number(int).toLocaleString("en-US");
  return `${negative ? "-" : ""}${grouped}${dec !== undefined ? "." + dec : ""}`;
}

function updateScreen() {
  const text = format(current);
  displayEl.textContent = text;
  displayEl.classList.toggle("error", current === "Error");
  displayEl.classList.toggle("small", text.length > 11);
  expressionEl.textContent = previous !== null && operator ? `${format(previous)} ${SYMBOLS[operator]}` : " ";
  opButtons.forEach((b) => b.classList.toggle("active", Boolean(operator) && startNew && b.dataset.op === operator));
}

/* ---------- arithmetic ---------- */
function compute(a, b, op) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  let r;
  if (op === "+") r = x + y;
  else if (op === "-") r = x - y;
  else if (op === "*") r = x * y;
  else if (op === "/") {
    if (y === 0) return "Error";
    r = x / y;
  }
  if (!Number.isFinite(r)) return "Error";
  // trim floating point noise such as 0.1 + 0.2
  return String(parseFloat(r.toPrecision(12)));
}

/* ---------- input handlers ---------- */
function inputDigit(d) {
  if (current === "Error" || startNew) {
    current = d;
    startNew = false;
  } else if (current === "0") {
    current = d;
  } else if (current.replace(/[-.]/g, "").length < 15) {
    current += d;
  }
  updateScreen();
}

function inputDot() {
  if (current === "Error" || startNew) {
    current = "0.";
    startNew = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
  updateScreen();
}

function chooseOperator(op) {
  if (current === "Error") return;
  if (operator && previous !== null && !startNew) {
    // chain: 2 + 3 + ... evaluates 2 + 3 first
    const result = compute(previous, current, operator);
    addHistory(`${format(previous)} ${SYMBOLS[operator]} ${format(current)}`, result);
    current = result;
    if (result === "Error") {
      previous = null;
      operator = null;
      startNew = true;
      return updateScreen();
    }
  }
  previous = current;
  operator = op;
  startNew = true;
  updateScreen();
}

function equals() {
  if (!operator || previous === null) return;
  const result = compute(previous, current, operator);
  addHistory(`${format(previous)} ${SYMBOLS[operator]} ${format(current)}`, result);
  current = result;
  previous = null;
  operator = null;
  startNew = true;
  updateScreen();
  expressionEl.textContent = history[0] ? `${history[0].exp} =` : " ";
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  startNew = false;
  updateScreen();
}

function deleteLast() {
  if (current === "Error" || startNew) return clearAll();
  current = current.length > 1 && !(current.length === 2 && current.startsWith("-")) ? current.slice(0, -1) : "0";
  updateScreen();
}

function percent() {
  if (current === "Error") return;
  current = String(parseFloat((parseFloat(current) / 100).toPrecision(12)));
  updateScreen();
}

function toggleSign() {
  if (current === "Error" || current === "0") return;
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
  updateScreen();
}

/* ---------- history ---------- */
function addHistory(exp, result) {
  if (result === "Error") return;
  history.unshift({ exp, result });
  history = history.slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  histList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Use result ${item.result} from ${item.exp}`);
    const exp = document.createElement("span");
    exp.className = "exp";
    exp.textContent = `${item.exp} =`;
    const res = document.createElement("span");
    res.className = "res";
    res.textContent = format(item.result);
    btn.append(exp, res);
    btn.addEventListener("click", () => {
      current = item.result;
      previous = null;
      operator = null;
      startNew = true;
      updateScreen();
    });
    li.appendChild(btn);
    histList.appendChild(li);
  });
  histEmpty.hidden = history.length > 0;
  clearHistoryBtn.disabled = history.length === 0;
}

/* ---------- events ---------- */
$("keys").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const { num, op, action } = btn.dataset;
  if (num !== undefined) inputDigit(num);
  else if (op) chooseOperator(op);
  else if (action === "dot") inputDot();
  else if (action === "equals") equals();
  else if (action === "clear") clearAll();
  else if (action === "delete") deleteLast();
  else if (action === "percent") percent();
  else if (action === "sign") toggleSign();
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const k = event.key;
  // keep Enter/Space for a focused button so keyboard users can press it
  if ((k === "Enter" || k === " ") && document.activeElement && document.activeElement.tagName === "BUTTON") return;
  if (/^\d$/.test(k)) inputDigit(k);
  else if (k === "." || k === ",") inputDot();
  else if (["+", "-", "*", "/"].includes(k)) { event.preventDefault(); chooseOperator(k); }
  else if (k === "Enter" || k === "=") { event.preventDefault(); equals(); }
  else if (k === "Backspace") deleteLast();
  else if (k === "Escape") clearAll();
  else if (k === "%") percent();
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

$("copyBtn").addEventListener("click", async () => {
  const btn = $("copyBtn");
  try {
    await navigator.clipboard.writeText(current);
    btn.textContent = "Copied";
  } catch {
    btn.textContent = "Not allowed";
  }
  setTimeout(() => { btn.textContent = "Copy"; }, 1200);
});

$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch { /* storage may be unavailable */ }
});

renderHistory();
updateScreen();
