import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate, compare } from "../src/geometry.js";
import {
  defaults,
  validateState,
  encodeState,
  decodeState,
  restoreState,
} from "../src/state.js";
import { toCSV } from "../src/export.js";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/geometry.json", import.meta.url)),
);
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("un enlace dañado no destruye una comparación guardada válida", () => {
  const local = defaults();
  local.configs[0].name = "Mi bici guardada";
  const restored = restoreState(JSON.stringify(local), "#setup=%");
  assert.deepEqual(restored.state, local);
  assert.match(restored.notice, /enlace no es válido/);
  assert.deepEqual(restoreState("corrupted", "").state, defaults());
  assert.deepEqual(
    restoreState(JSON.stringify(local), encodeState(defaults())).state,
    defaults(),
  );
});

for (const fixture of fixtures) {
  test(fixture.name, () => {
    const { end } = calculate(fixture.headAngle, fixture.config);
    close(end.x, fixture.expected.x);
    close(end.y, fixture.expected.y);
  });
}

test("subir el montaje 10 mm desplaza hacia atrás y arriba por el eje de dirección", () => {
  const a = defaults().configs[0];
  const delta = compare(72.5, { ...a, height: a.height + 10 }, a);
  close(delta.x, -10 * Math.cos((72.5 * Math.PI) / 180));
  close(delta.y, 10 * Math.sin((72.5 * Math.PI) / 180));
  close(delta.distance, 10);
});

test("la referencia es neutra y cambiarla invierte exactamente los deltas", () => {
  const {
    configs: [a, b],
    headAngle,
  } = defaults();
  assert.deepEqual(compare(headAngle, a, a), { x: 0, y: 0, distance: 0 });
  const ab = compare(headAngle, a, b),
    ba = compare(headAngle, b, a);
  close(ab.x, -ba.x);
  close(ab.y, -ba.y);
  close(ab.distance, ba.distance);
});

test("todos los extremos del rango producen resultados finitos", () => {
  for (const headAngle of [60, 85])
    for (const length of [40, 160])
      for (const angle of [-35, 35])
        for (const height of [0, 100])
          for (const reach of [40, 120])
            for (const rotation of [-25, 25]) {
              const { end } = calculate(headAngle, {
                length,
                angle,
                height,
                reach,
                rotation,
              });
              assert.ok(Number.isFinite(end.x) && Number.isFinite(end.y));
            }
});

test("rechaza datos no finitos, tipos incorrectos y valores fuera de rango", () => {
  const config = defaults().configs[0];
  for (const head of [null, NaN, Infinity, "72.5", 59, 86])
    assert.throws(() => calculate(head, config));
  for (const key of ["length", "angle", "height", "reach", "rotation"])
    for (const value of [NaN, Infinity, null, "10", undefined, 9999]) {
      assert.throws(() => calculate(72.5, { ...config, [key]: value }));
    }
});

test("el enlace preserva Unicode, parámetros, referencia y selección", () => {
  const state = defaults();
  state.configs[0].name = "Bici de José 🚲";
  state.referenceId = "c";
  assert.deepEqual(decodeState(encodeState(state)), state);
});

test("valida estado externo antes de usarlo", () => {
  for (const value of [
    null,
    {},
    { ...defaults(), version: 2 },
    { ...defaults(), configs: [] },
    { ...defaults(), activeId: "missing" },
  ])
    assert.throws(() => validateState(value));
  const state = defaults();
  state.configs[1].id = state.configs[0].id;
  assert.throws(() => validateState(state));
  const name = defaults();
  name.configs[0].name = " ";
  assert.throws(() => validateState(name));
  for (const hash of [
    "#setup=%",
    "#setup={}",
    "#other=test",
    "#setup=" + "x".repeat(12000),
  ])
    assert.throws(() => decodeState(hash));
  assert.equal(
    "injected" in validateState({ ...defaults(), injected: true }),
    false,
  );
});

test("CSV incluye todos los montajes, conserva signos y protege fórmulas y comillas", () => {
  const state = defaults();
  state.configs[0].name = '=HYPERLINK("evil")';
  const csv = toCSV(state);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(csv.split("\r\n").length, 4);
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"-6"'));
  assert.ok(csv.includes('"Sí"'));
});
