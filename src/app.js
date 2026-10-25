import { FIELDS, calculate, compare } from "./geometry.js";
import {
  STORAGE_KEY,
  defaults,
  validateState,
  encodeState,
  decodeState,
  restoreState,
} from "./state.js";
import { drawChart, COLORS, LETTERS } from "./chart.js";
import { toCSV } from "./export.js";

const $ = (selector) => document.querySelector(selector);
const number = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const format = (value) => number.format(Math.abs(value) < 0.05 ? 0 : value);
const signed = (value) => (value >= 0.05 ? "+" : "") + format(value);
let saved = null;
try {
  saved = localStorage.getItem(STORAGE_KEY);
} catch {
  /* Storage can be unavailable; the calculator still works in memory. */
}
let { state, notice: bootNotice } = restoreState(saved, location.hash);
let toastTimer;
let hasInvalidInput = false;

function activeConfig() {
  return state.configs.find((config) => config.id === state.activeId);
}
function referenceConfig() {
  return state.configs.find((config) => config.id === state.referenceId);
}
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 6000);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validateState(state)));
    $("#save-state").textContent = "Guardado en este navegador";
  } catch {
    $("#save-state").textContent = "Sin guardado local";
  }
  // Remove stale shared state after editing; storage now holds the current setup.
  if (location.hash.startsWith("#setup="))
    history.replaceState(null, "", location.pathname + location.search);
}

function element(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function swatch(index) {
  const dot = element("span", "swatch");
  dot.style.setProperty("--swatch", COLORS[index]);
  dot.setAttribute("aria-hidden", "true");
  return dot;
}

function updateValidity() {
  hasInvalidInput = !!document.querySelector('[aria-invalid="true"]');
  for (const id of ["share", "export-csv", "export-svg", "add-setup"]) {
    $(`#${id}`).disabled =
      hasInvalidInput || (id === "add-setup" && state.configs.length >= 4);
  }
  $("#geometry").style.opacity = hasInvalidInput ? ".45" : "1";
  if (hasInvalidInput)
    $("#interpretation").textContent =
      "Corrige los campos señalados. Los resultados conservan el último valor válido.";
}

function validateInput(input, error, min, max) {
  const value = input.valueAsNumber;
  const valid = Number.isFinite(value) && value >= min && value <= max;
  input.setAttribute("aria-invalid", String(!valid));
  error.textContent = valid ? "" : `Introduce un valor entre ${min} y ${max}.`;
  return valid;
}

function renderControls() {
  const config = activeConfig();
  $("#setup-name").value = config.name;
  $("#setup-name").setAttribute("aria-invalid", "false");
  $("#name-error").textContent = "";
  $("#is-reference").checked = config.id === state.referenceId;
  $("#is-reference").disabled = config.id === state.referenceId;
  $("#delete-setup").disabled = state.configs.length === 1;
  $("#controls").replaceChildren();
  for (const [key, field] of Object.entries(FIELDS)) {
    const control = element("div", "control");
    const heading = element("div", "control-heading");
    const label = element("label", "", field.label);
    label.htmlFor = key;
    const shell = element("div", "number-shell");
    const input = element("input");
    input.type = "number";
    input.id = key;
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = config[key];
    input.inputMode = "decimal";
    input.setAttribute("aria-describedby", `${key}-error`);
    const range = element("input");
    range.type = "range";
    range.min = field.min;
    range.max = field.max;
    range.step = field.step;
    range.value = config[key];
    range.setAttribute("aria-label", `${field.label}, deslizador`);
    const error = element("p", "field-error");
    error.id = `${key}-error`;
    error.setAttribute("aria-live", "polite");
    const bounds = element("div", "range-labels");
    bounds.setAttribute("aria-hidden", "true");
    bounds.append(
      element("span", "", `${field.min}${field.unit}`),
      element("span", "", `${field.max}${field.unit}`),
    );
    input.addEventListener("input", () => {
      if (validateInput(input, error, field.min, field.max)) {
        config[key] = input.valueAsNumber;
        range.value = input.value;
        renderResults();
        persist();
      }
      updateValidity();
    });
    range.addEventListener("input", () => {
      config[key] = range.valueAsNumber;
      input.value = range.value;
      input.setAttribute("aria-invalid", "false");
      error.textContent = "";
      renderResults();
      updateValidity();
      persist();
    });
    shell.append(input, element("span", "", field.unit));
    heading.append(label, shell);
    control.append(heading, range, bounds, error);
    $("#controls").append(control);
  }
}

function renderPicker() {
  $("#setup-count").textContent = `${state.configs.length} / 4`;
  $("#setup-picker").replaceChildren();
  state.configs.forEach((config, index) => {
    const button = element(
      "button",
      "setup-tab",
      `${LETTERS[index]}${config.id === state.referenceId ? " · REF" : ""}`,
    );
    button.setAttribute(
      "aria-label",
      `Editar ${LETTERS[index]}: ${config.name}`,
    );
    button.setAttribute("aria-pressed", String(config.id === state.activeId));
    button.addEventListener("click", () => selectConfig(config.id));
    $("#setup-picker").append(button);
  });
}

function selectConfig(id) {
  if (hasInvalidInput) {
    toast("Corrige el campo señalado antes de cambiar de montaje.");
    document.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  state.activeId = id;
  renderAll();
  persist();
  $("#setup-picker").querySelector('[aria-pressed="true"]').focus();
}

function renderResults() {
  drawChart($("#geometry"), state);
  $("#plot-legend").replaceChildren();
  $("#result-rows").replaceChildren();
  const reference = referenceConfig();
  state.configs.forEach((config, i) => {
    const isReference = config.id === reference.id;
    const legend = element("span", "legend-item");
    legend.append(
      swatch(i),
      element("span", "", `${LETTERS[i]} · ${config.name}`),
    );
    if (isReference) legend.append(element("em", "", "REF"));
    $("#plot-legend").append(legend);
    const { end } = calculate(state.headAngle, config);
    const delta = compare(state.headAngle, config, reference);
    const row = element("tr", config.id === state.activeId ? "active" : "");
    const name = element("td");
    const button = element("button", "row-button");
    button.setAttribute("aria-label", `Editar montaje ${config.name}`);
    button.append(
      swatch(i),
      element("span", "row-name", `${LETTERS[i]} · ${config.name}`),
    );
    if (isReference) button.append(element("span", "ref-badge", "REF"));
    button.addEventListener("click", () => selectConfig(config.id));
    name.append(button);
    row.append(name);
    for (const value of [
      format(end.x),
      format(end.y),
      isReference ? "—" : signed(delta.x),
      isReference ? "—" : signed(delta.y),
    ])
      row.append(element("td", "", value));
    $("#result-rows").append(row);
  });
  const config = activeConfig();
  const delta = compare(state.headAngle, config, reference);
  const horizontal =
    Math.abs(delta.x) < 0.05
      ? "Mismo alcance"
      : delta.x > 0
        ? "Más adelantado"
        : "Más retrasado";
  const vertical =
    Math.abs(delta.y) < 0.05
      ? "Misma altura"
      : delta.y > 0
        ? "Más alto"
        : "Más bajo";
  $("#comparison-title").textContent =
    config.id === reference.id
      ? "Tu punto de referencia"
      : "Qué cambia en tu posición";
  $("#comparison-reference").textContent = `Referencia: ${reference.name}`;
  $("#metrics").replaceChildren();
  for (const [title, value, caption, accent] of [
    ["Δ Alcance horizontal", signed(delta.x), horizontal, true],
    ["Δ Altura", signed(delta.y), vertical, false],
    ["Desplazamiento", format(delta.distance), "Distancia entre puntos", false],
  ]) {
    const metric = element("div", "metric");
    const result = element(
      "div",
      `metric-value${accent ? " accent" : ""}`,
      value,
    );
    result.append(element("small", "", "mm"));
    metric.append(
      element("p", "metric-label", title),
      result,
      element("p", "metric-caption", caption),
    );
    $("#metrics").append(metric);
  }
  $("#interpretation").replaceChildren();
  const strong = element("strong", "", config.name);
  $("#interpretation").append(
    strong,
    document.createTextNode(
      config.id === reference.id
        ? " es el origen de la comparación. Selecciona otro montaje para ver las diferencias."
        : `: ${format(Math.abs(delta.x))} mm ${delta.x < -0.05 ? "hacia atrás" : delta.x > 0.05 ? "hacia delante" : "de cambio horizontal"} y ${format(Math.abs(delta.y))} mm ${delta.y < -0.05 ? "hacia abajo" : delta.y > 0.05 ? "hacia arriba" : "de cambio vertical"} respecto a ${reference.name}.`,
    ),
  );
}

function renderAll() {
  renderPicker();
  renderControls();
  renderResults();
  updateValidity();
}

$("#head-angle").value = state.headAngle;
$("#head-angle").addEventListener("input", (event) => {
  if (validateInput(event.target, $("#head-error"), 60, 85)) {
    state.headAngle = event.target.valueAsNumber;
    renderResults();
    persist();
  }
  updateValidity();
});
$("#setup-name").addEventListener("input", (event) => {
  const name = event.target.value.trim();
  const valid = name.length > 0 && name.length <= 40;
  event.target.setAttribute("aria-invalid", String(!valid));
  $("#name-error").textContent = valid
    ? ""
    : "Escribe un nombre de entre 1 y 40 caracteres.";
  if (valid) {
    activeConfig().name = name;
    renderPicker();
    renderResults();
    persist();
  }
  updateValidity();
});
$("#is-reference").addEventListener("change", () => {
  if (hasInvalidInput) {
    $("#is-reference").checked = false;
    toast("Corrige los campos antes de cambiar la referencia.");
    return;
  }
  state.referenceId = state.activeId;
  renderAll();
  persist();
});
$("#add-setup").addEventListener("click", () => {
  if (state.configs.length >= 4 || hasInvalidInput) return;
  const config = {
    ...activeConfig(),
    id: crypto.randomUUID(),
    name: `${activeConfig().name.slice(0, 32)} (copia)`,
  };
  state.configs.push(config);
  state.activeId = config.id;
  renderAll();
  persist();
  $("#setup-name").focus();
  $("#setup-name").select();
});
function confirmAction(message) {
  const dialog = $("#confirm-dialog");
  $("#confirm-message").textContent = message;
  dialog.returnValue = "";
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    );
    dialog.showModal();
  });
}

$("#delete-setup").addEventListener("click", async () => {
  if (state.configs.length === 1) return;
  const removed = activeConfig();
  if (!(await confirmAction(`¿Eliminar «${removed.name}»?`))) return;
  state.configs = state.configs.filter((config) => config.id !== removed.id);
  state.activeId = state.configs[0].id;
  if (state.referenceId === removed.id) state.referenceId = state.activeId;
  renderAll();
  persist();
  $("#setup-name").focus();
  toast("Montaje eliminado.");
});
$("#reset").addEventListener("click", async () => {
  if (
    !(await confirmAction(
      "¿Restablecer el ejemplo? Se sustituirán los montajes guardados en este navegador.",
    ))
  )
    return;
  state = defaults();
  $("#head-angle").value = state.headAngle;
  $("#head-angle").setAttribute("aria-invalid", "false");
  $("#head-error").textContent = "";
  renderAll();
  persist();
  toast("Ejemplo restablecido.");
});

function download(content, mime, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = element("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#export-csv").addEventListener("click", () => {
  download(toCSV(state), "text/csv;charset=utf-8", "real-reach.csv");
  toast("CSV exportado con tus montajes.");
});
$("#export-svg").addEventListener("click", () => {
  const svg = $("#geometry").cloneNode(true);
  drawChart(svg, state, 860);
  svg.setAttribute("viewBox", "0 0 860 475");
  svg.setAttribute("width", "860");
  svg.setAttribute("height", "475");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("y", "385");
  bg.setAttribute("width", "860");
  bg.setAttribute("height", "90");
  bg.setAttribute("fill", "#202c2a");
  svg.append(bg);
  state.configs.forEach((config, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    for (const [key, value] of Object.entries({
      x: 28,
      y: 399 + 17 * index,
      fill: COLORS[index],
      "font-family": "Arial, sans-serif",
      "font-size": 11,
    }))
      text.setAttribute(key, value);
    text.textContent = `${LETTERS[index]} · ${config.name}${config.id === state.referenceId ? " · REF" : ""} — ${config.length} mm / ${config.angle}° / h ${config.height} mm / R ${config.reach} mm / γ ${config.rotation}° · dirección ${state.headAngle}°`;
    svg.append(text);
  });
  download(
    new XMLSerializer().serializeToString(svg),
    "image/svg+xml;charset=utf-8",
    "real-reach.svg",
  );
  toast("Diagrama SVG exportado.");
});
$("#share").addEventListener("click", async () => {
  const url =
    location.origin + location.pathname + location.search + encodeState(state);
  try {
    await navigator.clipboard.writeText(url);
    toast("Enlace copiado. Incluye todos tus montajes.");
  } catch {
    $("#share-url").value = url;
    $("#share-dialog").showModal();
    $("#share-url").select();
  }
});
for (const id of ["open-method", "height-help", "read-model"])
  $(`#${id}`).addEventListener("click", () => $("#method-dialog").showModal());
$("#close-method").addEventListener("click", () => $("#method-dialog").close());
$("#close-share").addEventListener("click", () => $("#share-dialog").close());
window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#setup=")) return;
  try {
    const incoming = decodeState(location.hash);
    state = incoming;
    $("#head-angle").value = state.headAngle;
    $("#head-angle").setAttribute("aria-invalid", "false");
    $("#head-error").textContent = "";
    renderAll();
    persist();
    toast("Comparación cargada desde el enlace.");
  } catch {
    toast("Enlace no válido. Tu comparación sigue intacta.");
  }
});
renderAll();
let chartWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width !== chartWidth) {
    chartWidth = entry.contentRect.width;
    drawChart($("#geometry"), state);
  }
}).observe($(".plot-panel"));
if (bootNotice) toast(bootNotice);
persist();
