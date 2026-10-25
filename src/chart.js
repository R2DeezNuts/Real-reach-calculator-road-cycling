import { calculate } from "./geometry.js";

export const COLORS = ["#b3bdb0", "#f19768", "#91cbbb", "#cebcf2"];
export const LETTERS = "ABCD";
const NS = "http://www.w3.org/2000/svg";

function node(tag, attributes, text) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function drawChart(
  svg,
  state,
  width = Math.max(360, Math.min(860, svg.clientWidth || 860)),
) {
  const height = width < 600 ? 240 : 385;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren(
    node("title", { id: "chart-title" }, "Geometría de los montajes"),
    node(
      "desc",
      { id: "chart-description" },
      `Comparación lateral con ${state.configs.length} montajes. Los ejes tienen la misma escala. Coordenadas exactas en la tabla de resultados.`,
    ),
  );
  svg.append(node("rect", { width, height, fill: "#202c2a" }));
  const geometries = state.configs.map((config) =>
    calculate(state.headAngle, config),
  );
  const points = [
    { x: 0, y: 0 },
    ...geometries.flatMap((g) => [g.mount, g.clamp, g.end]),
  ];
  const minX = Math.min(-30, ...points.map((p) => p.x)) - 16;
  const maxX = Math.max(200, ...points.map((p) => p.x)) + 35;
  const minY = Math.min(-10, ...points.map((p) => p.y)) - 20;
  const maxY = Math.max(80, ...points.map((p) => p.y)) + 22;
  const plotWidth = width - 80;
  const plotHeight = height - 100;
  const scale = Math.min(plotWidth / (maxX - minX), plotHeight / (maxY - minY));
  const offsetX = 40 + (plotWidth - (maxX - minX) * scale) / 2;
  const offsetY = 30 + (plotHeight - (maxY - minY) * scale) / 2;
  const x = (value) => offsetX + (value - minX) * scale;
  const y = (value) => offsetY + (maxY - value) * scale;
  const line = (a, b, attrs = {}) =>
    node("line", { x1: x(a.x), y1: y(a.y), x2: x(b.x), y2: y(b.y), ...attrs });
  const text = (a, value, attrs = {}) =>
    node(
      "text",
      {
        x: x(a.x),
        y: y(a.y),
        fill: "#aabbb0",
        "font-family": "Consolas, monospace",
        "font-size": 10,
        ...attrs,
      },
      value,
    );
  for (let n = Math.ceil(minX / 20) * 20; n <= maxX; n += 20) {
    svg.append(
      line(
        { x: n, y: minY },
        { x: n, y: maxY },
        { stroke: "#ffffff", "stroke-opacity": n === 0 ? 0.17 : 0.055 },
      ),
    );
    if (n >= 0 && n % 40 === 0)
      svg.append(
        text({ x: n, y: minY }, String(n), { dy: 18, "text-anchor": "middle" }),
      );
  }
  for (let n = Math.ceil(minY / 20) * 20; n <= maxY; n += 20) {
    svg.append(
      line(
        { x: minX, y: n },
        { x: maxX, y: n },
        { stroke: "#ffffff", "stroke-opacity": n === 0 ? 0.17 : 0.055 },
      ),
    );
    if (n % 40 === 0)
      svg.append(
        text({ x: minX, y: n }, String(n), {
          dx: -10,
          dy: 3,
          "text-anchor": "end",
        }),
      );
  }
  const headRad = (state.headAngle * Math.PI) / 180;
  const axisTop = maxY - 5;
  const axisBottom = Math.max(minY + 5, -20);
  svg.append(
    line(
      { x: -axisBottom / Math.tan(headRad), y: axisBottom },
      { x: -axisTop / Math.tan(headRad), y: axisTop },
      {
        stroke: "#6f8173",
        "stroke-width": 13,
        "stroke-opacity": 0.3,
        "stroke-linecap": "round",
      },
    ),
  );
  svg.append(
    line(
      { x: -axisBottom / Math.tan(headRad), y: axisBottom },
      { x: -axisTop / Math.tan(headRad), y: axisTop },
      {
        stroke: "#8da18f",
        "stroke-width": 1,
        "stroke-dasharray": "3 5",
        "stroke-opacity": 0.6,
      },
    ),
  );
  const active = state.configs.findIndex((c) => c.id === state.activeId);
  const order = geometries
    .map((_, i) => i)
    .filter((i) => i !== active)
    .concat(active);
  for (const i of order) {
    const g = geometries[i];
    const config = state.configs[i];
    const isActive = i === active;
    const group = node("g", { opacity: isActive ? 1 : 0.65 });
    group.append(
      node(
        "title",
        {},
        `${LETTERS[i]} · ${config.name}: X ${g.end.x.toFixed(1)}, Y ${g.end.y.toFixed(1)} mm`,
      ),
    );
    group.append(
      line({ x: 0, y: 0 }, g.mount, { stroke: COLORS[i], "stroke-width": 3 }),
    );
    if (isActive)
      group.append(
        line(g.mount, g.clamp, {
          stroke: COLORS[i],
          "stroke-width": 15,
          "stroke-opacity": 0.1,
          "stroke-linecap": "round",
        }),
      );
    group.append(
      line(g.mount, g.clamp, {
        stroke: COLORS[i],
        "stroke-width": isActive ? 4 : 2.5,
        "stroke-linecap": "round",
      }),
    );
    group.append(
      line(g.clamp, g.end, {
        stroke: COLORS[i],
        "stroke-width": 2,
        "stroke-dasharray": "6 5",
      }),
    );
    group.append(
      node("circle", {
        cx: x(g.mount.x),
        cy: y(g.mount.y),
        r: 3.5,
        fill: "#202c2a",
        stroke: COLORS[i],
        "stroke-width": 1.5,
      }),
    );
    group.append(
      node("circle", {
        cx: x(g.clamp.x),
        cy: y(g.clamp.y),
        r: 5,
        fill: "#202c2a",
        stroke: COLORS[i],
        "stroke-width": 2,
      }),
    );
    group.append(
      node("circle", {
        cx: x(g.end.x),
        cy: y(g.end.y),
        r: isActive ? 5 : 4,
        fill: COLORS[i],
        stroke: "#202c2a",
        "stroke-width": 1.5,
      }),
    );
    svg.append(group);
  }
  // Stagger endpoint labels so close or identical setups remain identifiable.
  const occupied = [];
  geometries.forEach((g, i) => {
    const lx = Math.min(width - 20, x(g.end.x) + 22);
    const preferredY = Math.max(35, Math.min(height - 45, y(g.end.y) - 12));
    const candidates = [0, -27, 27, -54, 54, -81, 81].map(
      (offset) => preferredY + offset,
    );
    const ly =
      candidates.find(
        (candidate) =>
          candidate >= 30 &&
          candidate <= height - 30 &&
          !occupied.some(
            (p) => Math.abs(p.x - lx) < 30 && Math.abs(p.y - candidate) < 25,
          ),
      ) ?? preferredY;
    occupied.push({ x: lx, y: ly });
    svg.append(
      node("path", {
        d: `M ${x(g.end.x) + 5} ${y(g.end.y)} L ${lx - 5} ${ly}`,
        fill: "none",
        stroke: COLORS[i],
        "stroke-width": 0.7,
        opacity: 0.6,
      }),
    );
    svg.append(
      node("rect", {
        x: lx - 5,
        y: ly - 10,
        width: 19,
        height: 19,
        rx: 4,
        fill: "#202c2a",
        stroke: COLORS[i],
        "stroke-width": 1,
      }),
    );
    svg.append(
      node(
        "text",
        {
          x: lx + 4.5,
          y: ly + 3,
          fill: COLORS[i],
          "font-family": "Consolas, monospace",
          "font-size": 11,
          "text-anchor": "middle",
        },
        LETTERS[i],
      ),
    );
  });
  const g = geometries[active];
  svg.append(
    line({ x: g.end.x, y: 0 }, g.end, {
      stroke: COLORS[active],
      "stroke-width": 1,
      "stroke-dasharray": "2 5",
      opacity: 0.35,
    }),
  );
  svg.append(
    line({ x: 0, y: g.end.y }, g.end, {
      stroke: COLORS[active],
      "stroke-width": 1,
      "stroke-dasharray": "2 5",
      opacity: 0.35,
    }),
  );
  svg.append(
    node("circle", {
      cx: x(0),
      cy: y(0),
      r: 4,
      fill: "#202c2a",
      stroke: "#ccd7ca",
      "stroke-width": 1.5,
    }),
  );
  svg.append(text({ x: 0, y: 0 }, "O", { dx: -13, dy: 16, fill: "#d3ddcf" }));
  svg.append(
    node(
      "text",
      {
        x: width - 30,
        y: height - 15,
        fill: "#aabbb0",
        "font-family": "Consolas, monospace",
        "font-size": 10,
        "text-anchor": "end",
      },
      "ALCANCE X →",
    ),
  );
  svg.append(
    node(
      "text",
      {
        x: 28,
        y: 22,
        fill: "#aabbb0",
        "font-family": "Consolas, monospace",
        "font-size": 10,
      },
      "↑ ALTURA Y",
    ),
  );
}
