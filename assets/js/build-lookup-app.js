import { fetchAll, sortedEntries, getBuildsFor } from "./data.js";
import { buildDataSubmissionUrl, buildSearchUrl } from "./github-issue.js";

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

function flattenAllTagged(builds) {
  const out = [];
  for (const [frameId, byEngine] of Object.entries(builds)) {
    for (const [engineId, bySlug] of Object.entries(byEngine)) {
      for (const build of Object.values(bySlug)) {
        out.push({ ...build, _frame: frameId, _engine: engineId });
      }
    }
  }
  return out;
}

function renderBuilds(container, builds, frames, engines) {
  container.innerHTML = "";
  if (!builds.length) {
    const empty = document.createElement("p");
    empty.textContent =
      "No cataloged builds match yet — be the first to submit one.";
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "swoptimal-build-list";

  builds.forEach((build) => {
    const li = document.createElement("li");

    const h3 = document.createElement("h3");
    const link = document.createElement("a");
    link.href = build.url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = build.title || build.url;
    h3.appendChild(link);
    li.appendChild(h3);

    const meta = document.createElement("p");
    meta.textContent = [
      frames[build._frame] && frames[build._frame].name,
      engines[build._engine] && engines[build._engine].name,
      build.transmission,
      build.source_site,
    ]
      .filter(Boolean)
      .join(" · ");
    li.appendChild(meta);

    if (build.ai_summary) {
      const summary = document.createElement("p");
      summary.textContent = build.ai_summary;
      li.appendChild(summary);
    }

    if (
      build.observed &&
      (build.observed.hp || build.observed.tq_nm || build.observed.mpg)
    ) {
      const stats = document.createElement("p");
      stats.textContent = [
        build.observed.hp ? `${build.observed.hp} hp` : null,
        build.observed.tq_nm ? `${build.observed.tq_nm} Nm` : null,
        build.observed.mpg ? `${build.observed.mpg} mpg` : null,
      ]
        .filter(Boolean)
        .join(" / ");
      li.appendChild(stats);
    }

    if (build.complications && build.complications.length) {
      const ul = document.createElement("ul");
      ul.className = "swoptimal-complications";
      build.complications.forEach((c) => {
        const item = document.createElement("li");
        item.textContent = `[${c.category}] ${c.detail}`;
        ul.appendChild(item);
      });
      li.appendChild(ul);
    }

    list.appendChild(li);
  });

  container.appendChild(list);
}

async function main() {
  const data = await fetchAll();

  const frameSelect = document.getElementById("field-frame");
  const engineSelect = document.getElementById("field-engine");
  const resultsContainer = document.getElementById("swoptimal-build-results");
  const searchButton = document.getElementById("swoptimal-search-combo");

  populateSelect(frameSelect, sortedEntries(data.frames), "Any frame");
  populateSelect(engineSelect, sortedEntries(data.engines), "Any engine");

  function refresh() {
    const frameId = frameSelect.value;
    const engineId = engineSelect.value;

    let builds;
    if (frameId && engineId) {
      builds = getBuildsFor(data.builds, frameId, engineId).map((b) => ({
        ...b,
        _frame: frameId,
        _engine: engineId,
      }));
    } else {
      builds = flattenAllTagged(data.builds).filter(
        (b) =>
          (!frameId || b._frame === frameId) &&
          (!engineId || b._engine === engineId)
      );
    }
    renderBuilds(resultsContainer, builds, data.frames, data.engines);
    searchButton.disabled = !frameId && !engineId;
  }

  frameSelect.addEventListener("change", refresh);
  engineSelect.addEventListener("change", refresh);
  refresh();

  searchButton.addEventListener("click", () => {
    const frameName = data.frames[frameSelect.value]?.name;
    const engineName = data.engines[engineSelect.value]?.name;
    window.open(buildSearchUrl(frameName, engineName), "_blank", "noopener");
  });

  document
    .getElementById("swoptimal-submit-data")
    .addEventListener("click", () => {
      window.open(
        buildDataSubmissionUrl({
          frame: frameSelect.value,
          engine: engineSelect.value,
        }),
        "_blank",
        "noopener"
      );
    });
}

main();
