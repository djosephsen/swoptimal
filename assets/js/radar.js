const NS = "http://www.w3.org/2000/svg";

function point(center, radius, angle) {
  return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
}

function normalize(metric, value) {
  if (value == null || !Number.isFinite(value)) return 0;
  const clamped = Math.max(metric.min, Math.min(metric.max, value));
  return (clamped - metric.min) / (metric.max - metric.min);
}

function anchorFor(cosAngle) {
  if (cosAngle > 0.3) return "start";
  if (cosAngle < -0.3) return "end";
  return "middle";
}

function drawLabel(svg, metric, stats, lx, ly, cosAngle) {
  const label = document.createElementNS(NS, "text");
  const anchor = anchorFor(cosAngle);
  label.setAttribute("x", lx);
  label.setAttribute("y", ly);
  label.setAttribute("text-anchor", anchor);
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("font-size", "11");
  label.setAttribute("fill", "currentColor");

  const nameLine = document.createElementNS(NS, "tspan");
  nameLine.setAttribute("x", lx);
  nameLine.textContent = metric.label;
  label.appendChild(nameLine);

  const value = stats && stats[metric.key];
  if (value != null && Number.isFinite(value)) {
    const valueLine = document.createElementNS(NS, "tspan");
    valueLine.setAttribute("x", lx);
    valueLine.setAttribute("dy", "1.2em");
    valueLine.setAttribute("font-weight", "bold");
    valueLine.textContent = `${(metric.format || String)(value)} ${metric.unit}`;
    label.appendChild(valueLine);
  }

  svg.appendChild(label);
}

export function renderRadar(container, metrics, stats) {
  container.innerHTML = "";
  const size = 360;
  const center = size / 2;
  const radius = size / 2 - 70;
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
  });

  const hasData = stats && metrics.some((m) => stats[m.key] != null);
  if (hasData) {
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
  }

  // Labels are drawn last so they always render on top of the data
  // polygon/dots, which would otherwise paint over them for large values.
  metrics.forEach((m, i) => {
    const angle = startAngle + i * angleStep;
    const [lx, ly] = point(center, radius + 28, angle);
    drawLabel(svg, m, stats, lx, ly, Math.cos(angle));
  });

  container.appendChild(svg);
}
