const NS = "http://www.w3.org/2000/svg";

function point(center, radius, angle) {
  return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
}

function normalize(metric, value) {
  if (value == null || !Number.isFinite(value)) return 0;
  const clamped = Math.max(metric.min, Math.min(metric.max, value));
  return (clamped - metric.min) / (metric.max - metric.min);
}

export function renderRadar(container, metrics, stats) {
  container.innerHTML = "";
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 60;
  const n = metrics.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  [0.25, 0.5, 0.75, 1].forEach((frac) => {
    const ring = document.createElementNS(NS, "polygon");
    const pts = metrics
      .map((_, i) =>
        point(center, radius * frac, startAngle + i * angleStep).join(",")
      )
      .join(" ");
    ring.setAttribute("points", pts);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "currentColor");
    ring.setAttribute("stroke-opacity", "0.2");
    svg.appendChild(ring);
  });

  metrics.forEach((m, i) => {
    const angle = startAngle + i * angleStep;
    const [x, y] = point(center, radius, angle);
    const axis = document.createElementNS(NS, "line");
    axis.setAttribute("x1", center);
    axis.setAttribute("y1", center);
    axis.setAttribute("x2", x);
    axis.setAttribute("y2", y);
    axis.setAttribute("stroke", "currentColor");
    axis.setAttribute("stroke-opacity", "0.2");
    svg.appendChild(axis);

    const [lx, ly] = point(center, radius + 28, angle);
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", lx);
    label.setAttribute("y", ly);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "currentColor");
    label.textContent = m.label;
    svg.appendChild(label);
  });

  const hasData = stats && metrics.some((m) => stats[m.key] != null);
  if (!hasData) {
    container.appendChild(svg);
    return;
  }

  const pts = metrics
    .map((m, i) =>
      point(
        center,
        radius * normalize(m, stats[m.key]),
        startAngle + i * angleStep
      ).join(",")
    )
    .join(" ");
  const shape = document.createElementNS(NS, "polygon");
  shape.setAttribute("points", pts);
  shape.setAttribute("fill", "currentColor");
  shape.setAttribute("fill-opacity", "0.25");
  shape.setAttribute("stroke", "currentColor");
  shape.setAttribute("stroke-width", "2");
  svg.appendChild(shape);

  metrics.forEach((m, i) => {
    const value = stats[m.key];
    if (value == null) return;
    const [x, y] = point(
      center,
      radius * normalize(m, value),
      startAngle + i * angleStep
    );
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 3);
    dot.setAttribute("fill", "currentColor");
    svg.appendChild(dot);
  });

  container.appendChild(svg);
}
