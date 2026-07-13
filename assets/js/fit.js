import { getFitment } from "./data.js";

// Rough dimensional gate used only when no explicit fitment record exists.
// Deliberately conservative: it can rule a combo implausible, but never
// upgrades a guess to "bolt-in" or "stock" - only a cataloged fitment
// record can claim that.
function dimensionalFallback(engine, frame) {
  if (!engine.dimensions || !frame.engine_bay) {
    return {
      fit: "unknown",
      reason: "No dimensional data available for this engine or frame bay yet.",
      mods_required: [],
    };
  }

  const dims = ["length_mm", "width_mm", "height_mm"];
  const overs = dims
    .map((d) => ({
      dim: d,
      ratio: engine.dimensions[d] / frame.engine_bay[d],
    }))
    .filter((r) => Number.isFinite(r.ratio));

  const worst = overs.reduce((a, b) => (a.ratio > b.ratio ? a : b), {
    ratio: 0,
  });

  if (worst.ratio > 1.15) {
    return {
      fit: "no-fit",
      reason: `Engine ${worst.dim.replace("_mm", "")} is roughly ${Math.round(
        (worst.ratio - 1) * 100
      )}% larger than the stock bay envelope - likely won't fit without major surgery.`,
      mods_required: [],
    };
  }
  if (worst.ratio > 1.0) {
    return {
      fit: "fits-with-mods",
      reason: `Engine ${worst.dim.replace(
        "_mm",
        ""
      )} slightly exceeds the stock bay envelope - expect firewall/mount/core-support work.`,
      mods_required: ["engine bay clearance work (unconfirmed extent)"],
    };
  }
  return {
    fit: "unknown",
    reason:
      "Dimensions suggest it could physically fit, but this combo hasn't been cataloged - treat as unconfirmed.",
    mods_required: [],
  };
}

export function resolveFitment(frames, engines, fitment, frameId, engineId) {
  const known = getFitment(fitment, frameId, engineId);
  if (known) {
    return { ...known, source: "known" };
  }

  const frame = frames[frameId];
  const engine = engines[engineId];
  if (!frame || !engine) {
    return {
      fit: "unknown",
      reason: "Unknown frame or engine.",
      mods_required: [],
      source: "estimated",
    };
  }

  if (frame.stock_engine === engineId) {
    return {
      fit: "stock",
      reason: "This is the factory engine for this chassis.",
      mods_required: [],
      source: "known",
    };
  }

  return { ...dimensionalFallback(engine, frame), source: "estimated" };
}
