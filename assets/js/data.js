const CATEGORIES = ["frames", "engines", "transmissions", "fitment", "builds"];

let cachePromise = null;

function apiBase() {
  return (window.SWOPTIMAL_CONFIG && window.SWOPTIMAL_CONFIG.apiBase) || "/api/";
}

async function fetchCategory(name) {
  const res = await fetch(`${apiBase()}${name}/index.json`);
  if (!res.ok) {
    throw new Error(`Failed to load ${name}: ${res.status}`);
  }
  return res.json();
}

export function fetchAll() {
  if (!cachePromise) {
    cachePromise = Promise.all(CATEGORIES.map(fetchCategory)).then(
      ([frames, engines, transmissions, fitment, builds]) => ({
        frames: frames || {},
        engines: engines || {},
        transmissions: transmissions || {},
        fitment: fitment || {},
        builds: builds || {},
      })
    );
  }
  return cachePromise;
}

export function getFitment(fitment, frameId, engineId) {
  return (fitment[frameId] && fitment[frameId][engineId]) || null;
}

export function getBuildsFor(builds, frameId, engineId) {
  const byEngine = (builds[frameId] && builds[frameId][engineId]) || {};
  return Object.values(byEngine);
}

export function sortedEntries(map) {
  return Object.entries(map).sort((a, b) =>
    (a[1].name || a[0]).localeCompare(b[1].name || b[0])
  );
}
