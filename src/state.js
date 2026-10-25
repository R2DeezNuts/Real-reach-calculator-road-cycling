import { validateConfig, validateHeadAngle } from "./geometry.js";

export const STORAGE_KEY = "real-reach:v1";

export function defaults() {
  return {
    version: 1,
    headAngle: 72.5,
    activeId: "b",
    referenceId: "a",
    configs: [
      {
        id: "a",
        name: "Mi montaje",
        length: 110,
        angle: -6,
        height: 27.5,
        reach: 74,
        rotation: 0,
      },
      {
        id: "b",
        name: "Potencia 100",
        length: 100,
        angle: 6,
        height: 12,
        reach: 70,
        rotation: 0,
      },
      {
        id: "c",
        name: "Potencia 110",
        length: 110,
        angle: 6,
        height: 5,
        reach: 70,
        rotation: 0,
      },
    ],
  };
}

export function validateState(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.configs) ||
    value.configs.length < 1 ||
    value.configs.length > 4
  ) {
    throw new TypeError("Comparación no válida o versión no compatible.");
  }
  validateHeadAngle(value.headAngle);
  const ids = new Set();
  const configs = value.configs.map((config) => {
    validateConfig(config);
    if (
      typeof config.id !== "string" ||
      !/^[a-z0-9-]{1,40}$/i.test(config.id) ||
      ids.has(config.id)
    )
      throw new TypeError("Identificador de montaje no válido.");
    if (
      typeof config.name !== "string" ||
      !config.name.trim() ||
      config.name.length > 40
    )
      throw new TypeError("El nombre debe tener entre 1 y 40 caracteres.");
    ids.add(config.id);
    return {
      id: config.id,
      name: config.name.trim(),
      length: config.length,
      angle: config.angle,
      height: config.height,
      reach: config.reach,
      rotation: config.rotation,
    };
  });
  if (!ids.has(value.activeId) || !ids.has(value.referenceId))
    throw new TypeError("Falta el montaje activo o de referencia.");
  return {
    version: 1,
    headAngle: value.headAngle,
    activeId: value.activeId,
    referenceId: value.referenceId,
    configs,
  };
}

export function encodeState(state) {
  return "#setup=" + encodeURIComponent(JSON.stringify(validateState(state)));
}

export function decodeState(hash) {
  if (!hash.startsWith("#setup=") || hash.length > 12000)
    throw new TypeError("Enlace de comparación no válido.");
  return validateState(JSON.parse(decodeURIComponent(hash.slice(7))));
}

export function restoreState(saved, hash) {
  let state = defaults();
  let notice = "";
  if (saved) {
    try {
      state = validateState(JSON.parse(saved));
    } catch {
      notice = "No se pudo leer el guardado. Se muestra el ejemplo inicial.";
    }
  }
  if (hash.startsWith("#setup=")) {
    try {
      state = decodeState(hash);
      notice = "Comparación cargada desde el enlace.";
    } catch {
      notice = "El enlace no es válido. Se conserva la comparación local.";
    }
  }
  return { state, notice };
}
