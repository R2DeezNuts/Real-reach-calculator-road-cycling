import { calculate, compare } from "./geometry.js";
import { validateState } from "./state.js";

// Spreadsheet apps may execute cells beginning with a formula marker.
function cell(value) {
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function toCSV(value) {
  const state = validateState(value);
  const reference = state.configs.find(
    (config) => config.id === state.referenceId,
  );
  const rows = [
    [
      "Montaje",
      "Referencia",
      "Dirección (°)",
      "Potencia (mm)",
      "Ángulo potencia (°)",
      "Montaje (mm)",
      "Reach manillar (mm)",
      "Ángulo vector (°)",
      "X (mm)",
      "Y (mm)",
      "Delta X (mm)",
      "Delta Y (mm)",
    ],
  ];
  for (const config of state.configs) {
    const { end } = calculate(state.headAngle, config);
    const delta = compare(state.headAngle, config, reference);
    rows.push([
      config.name,
      config.id === reference.id ? "Sí" : "No",
      state.headAngle,
      config.length,
      config.angle,
      config.height,
      config.reach,
      config.rotation,
      +end.x.toFixed(3),
      +end.y.toFixed(3),
      +delta.x.toFixed(3),
      +delta.y.toFixed(3),
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
