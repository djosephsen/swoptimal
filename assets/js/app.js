import { fetchAll, sortedEntries, getBuildsFor } from "./data.js";
import { resolveFitment } from "./fit.js";
import { resolveStats } from "./estimate.js";
import { checkTransCompatibility } from "./compat.js";
import { METRICS } from "./metrics.js";
import { renderRadar } from "./radar.js";
import { buildDataSubmissionUrl } from "./github-issue.js";

function populateSelect(select, entries, placeholder) {
  select.innerHTML = "";
  const placeholderOpt = document.createElement("option");
  placeholderOpt.value = "";
  placeholderOpt.textContent = placeholder;
  select.appendChild(placeholderOpt);
  entries.forEach(([id, obj]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = obj.name || id;
    select.appendChild(opt);
  });
}

function fitBadge(fit) {
  const span = document.createElement("span");
  span.className = `swoptimal-badge swoptimal-badge--fit-${fit.fit}`;
  span.textContent = fit.fit.replace(/-/g, " ");
  return span;
}

function sourceBadge(source) {
  const span = document.createElement("span");
  span.className = `swoptimal-badge swoptimal-badge--${source}`;
  span.textContent = source;
  return span;
}

function renderBuildBlock(container, build) {
  const buildBlock = document.createElement("div");
  const heading = document.createElement("p");
  const link = document.createElement("a");
  link.href = build.url;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = build.title || build.url;
  heading.append("Real build: ", link);
  buildBlock.appendChild(heading);

  if (build.ai_summary) {
    const summary = document.createElement("p");
    summary.textContent = build.ai_summary;
    buildBlock.appendChild(summary);
  }

  if (build.complications && build.complications.length) {
    const list = document.createElement("ul");
    list.className = "swoptimal-complications";
    build.complications.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = `[${c.category}] ${c.detail}`;
      list.appendChild(li);
    });
    buildBlock.appendChild(list);
  }
  container.appendChild(buildBlock);
}

function renderSummary(container, { fit, stats, transNotes, relatedBuilds }) {
  container.innerHTML = "";

  const fitLine = document.createElement("p");
  fitLine.append("Fit: ", fitBadge(fit), ` — ${fit.reason}`);
  container.appendChild(fitLine);

  const statsLine = document.createElement("p");
  statsLine.append(
    "Estimated performance ",
    sourceBadge(stats.source),
    document.createElement("br"),
    `${Math.round(stats.hp || 0)} hp / ${Math.round(stats.tq_nm || 0)} Nm / ${
      stats.mpg ? stats.mpg.toFixed(1) : "?"
    } mpg`
  );
  container.appendChild(statsLine);

  if (stats.rpmFlag) {
    const rpmLine = document.createElement("p");
    rpmLine.textContent = stats.rpmFlag.note;
    container.appendChild(rpmLine);
  }

  if (stats.drivelineNote) {
    const drivelineLine = document.createElement("p");
    drivelineLine.textContent = stats.drivelineNote;
    container.appendChild(drivelineLine);
  }

  (transNotes || []).forEach((n) => {
    const line = document.createElement("p");
    line.textContent = `[${n.level}] ${n.note}`;
    container.appendChild(line);
  });

  if (relatedBuilds && relatedBuilds.length) {
    relatedBuilds.forEach((build) => renderBuildBlock(container, build));
  } else {
    const note = document.createElement("p");
    note.textContent =
      "No real-world build reported for this combo yet — these numbers are a rough estimate from stock spec sheets.";
    container.appendChild(note);
  }
}

async function main() {
  const data = await fetchAll();

  const frameSelect = document.getElementById("field-frame");
  const engineSelect = document.getElementById("field-engine");
  const transSelect = document.getElementById("field-transmission");

  populateSelect(frameSelect, sortedEntries(data.frames), "Select a frame");
  populateSelect(engineSelect, sortedEntries(data.engines), "Select an engine");
  populateSelect(
    transSelect,
    sortedEntries(data.transmissions),
    "Select a transmission (optional)"
  );

  const form = document.getElementById("swoptimal-form");
  const radarContainer = document.getElementById("swoptimal-radar");
  const summaryContainer = document.getElementById("swoptimal-summary");

  renderRadar(radarContainer, METRICS, null);

  let lastFormValues = {};

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const frameId = frameSelect.value;
    const engineId = engineSelect.value;
    if (!frameId || !engineId) return;

    const transId = transSelect.value;
    const gearing =
      parseFloat(document.getElementById("field-gearing").value) || null;
    const tireSize = document.getElementById("field-tire-size").value || null;
    const intercooler =
      document.getElementById("field-intercooler").value || null;
    const towWeight =
      parseFloat(document.getElementById("field-tow-weight").value) || 0;

    const fit = resolveFitment(
      data.frames,
      data.engines,
      data.fitment,
      frameId,
      engineId
    );
    const stats = resolveStats(
      data,
      frameId,
      engineId,
      transId,
      gearing,
      tireSize,
      intercooler,
      towWeight
    );

    const transNotes = transId
      ? checkTransCompatibility(data.engines[engineId], data.transmissions[transId])
      : [];
    const relatedBuilds = getBuildsFor(data.builds, frameId, engineId);

    renderRadar(radarContainer, METRICS, stats);
    renderSummary(summaryContainer, { fit, stats, transNotes, relatedBuilds });

    lastFormValues = {
      frame: frameId,
      engine: engineId,
      transmission: transId,
      gearing,
      tireSize,
      intercooler,
    };
  });

  document
    .getElementById("swoptimal-submit-data")
    .addEventListener("click", () => {
      window.open(buildDataSubmissionUrl(lastFormValues), "_blank", "noopener");
    });
}

main();
