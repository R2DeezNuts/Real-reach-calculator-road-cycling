export const FIELDS = {
  length: {
    label: "Longitud de potencia",
    min: 40,
    max: 160,
    step: 1,
    unit: "mm",
  },
  angle: {
    label: "Ángulo de potencia",
    min: -35,
    max: 35,
    step: 0.5,
    unit: "°",
  },
  height: {
    label: "Altura de montaje",
    min: 0,
    max: 100,
    step: 0.5,
    unit: "mm",
  },
  reach: { label: "Reach de manillar", min: 40, max: 120, step: 1, unit: "mm" },
  rotation: {
    label: "Ángulo del vector de reach",
    min: -25,
    max: 25,
    step: 0.5,
    unit: "°",
  },
};

export function validateConfig(config) {
  if (!config || typeof config !== "object")
    throw new TypeError("Montaje no válido.");
  for (const [key, field] of Object.entries(FIELDS)) {
    if (
      !Number.isFinite(config[key]) ||
      config[key] < field.min ||
      config[key] > field.max
    ) {
      throw new RangeError(
        `${field.label}: introduce un valor entre ${field.min} y ${field.max}.`,
      );
    }
  }
  return config;
}

export function validateHeadAngle(angle) {
  if (!Number.isFinite(angle) || angle < 60 || angle > 85) {
    throw new RangeError("El ángulo de dirección debe estar entre 60 y 85°.");
  }
}

export function calculate(headAngle, config) {
  validateHeadAngle(headAngle);
  validateConfig(config);
  const rad = Math.PI / 180;
  const steering = (180 - headAngle) * rad;
  const stem = (90 - headAngle + config.angle) * rad;
  const bar = config.rotation * rad;
  const mount = {
    x: config.height * Math.cos(steering),
    y: config.height * Math.sin(steering),
  };
  const clamp = {
    x: mount.x + config.length * Math.cos(stem),
    y: mount.y + config.length * Math.sin(stem),
  };
  const end = {
    x: clamp.x + config.reach * Math.cos(bar),
    y: clamp.y + config.reach * Math.sin(bar),
  };
  return { mount, clamp, end, stemAngle: stem / rad };
}

export function compare(headAngle, config, reference) {
  const a = calculate(headAngle, config).end;
  const b = calculate(headAngle, reference).end;
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  };
}
