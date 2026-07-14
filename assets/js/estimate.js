import { getBuildsFor } from "./data.js";

const KG_PER_LB = 0.453592;
const REFERENCE_CURB_KG = 2270; // ~5000lb, a mid-pack curb weight across seeded frames
const BASE_MPG = { diesel: 18, gas: 13 };

// Automatics (especially older non-lockup/partial-lockup torque-converter
// boxes like these) carry real parasitic loss a manual doesn't - applied
// only to estimated figures, never to observed/reported real-world data.
const DRIVELINE_EFFICIENCY = { manual: 1, automatic: 0.92 };

function drivelineEfficiency(transmissions, transId) {
  const trans = transId && transmissions[transId];
  return (trans && DRIVELINE_EFFICIENCY[trans.type]) || 1;
}

function parseTireDiameterIn(tireSize) {
  const m = /^(\d+)\/(\d+)R(\d+)$/i.exec((tireSize || "").trim());
  if (!m) return null;
  const [, widthMm, aspect, rimIn] = m.map(Number);
  const sidewallIn = (widthMm * (aspect / 100)) / 25.4;
  return Number(rimIn) + 2 * sidewallIn;
}

function powerToWeight(hp, curbWeightKg, towWeightKg) {
  const totalKg = curbWeightKg + (towWeightKg || 0);
  return hp / (totalKg * KG_PER_LB) * 1000; // hp per 1000lb
}

function torqueToWeight(tqNm, curbWeightKg, towWeightKg) {
  const totalKg = curbWeightKg + (towWeightKg || 0);
  return tqNm / (totalKg * KG_PER_LB) * 1000; // Nm per 1000lb
}

function estimateMpg(engine, frame, diffRatio, towWeightKg) {
  const base = BASE_MPG[engine.fuel] || BASE_MPG.gas;
  const weightFactor = REFERENCE_CURB_KG / frame.curb_weight_kg;
  const gearingFactor = frame.stock_diff_ratio && diffRatio
    ? frame.stock_diff_ratio / diffRatio
    : 1;
  const towFactor = 1 - Math.min((towWeightKg || 0) / 10000, 0.5);
  const mpg = base * weightFactor * gearingFactor * towFactor;
  return Math.max(mpg, 4);
}

// Approximates top-gear as ~1:1, since we deliberately don't model
// per-transmission gear ratios (see plan: no torque-curve simulation).
// This is a cruise-RPM sanity check, not a gear-by-gear simulation.
function rpmAtSpeed(speedMph, diffRatio, tireDiameterIn) {
  if (!diffRatio || !tireDiameterIn) return null;
  return (speedMph * diffRatio * 336) / tireDiameterIn;
}

function rpmFlag(rpm, engine) {
  if (rpm == null) return null;
  const redline = engine.redline_rpm || 4500;
  const lugFloor = 1500;
  if (rpm > redline * 0.85) {
    return {
      level: "high",
      note: `Turning ~${Math.round(rpm)}rpm at 60mph - close to redline for sustained cruising.`,
    };
  }
  if (rpm < lugFloor) {
    return {
      level: "low",
      note: `Turning ~${Math.round(rpm)}rpm at 60mph - may lug below the engine's effective torque range.`,
    };
  }
  return {
    level: "ok",
    note: `Turning ~${Math.round(rpm)}rpm at 60mph.`,
  };
}

export function resolveStats(
  { frames, engines, builds, transmissions },
  frameId,
  engineId,
  transId,
  gearing,
  tireSize,
  intercooler,
  towWeightKg
) {
  const frame = frames[frameId];
  const engine = engines[engineId];

  // Multiple real builds can exist for the same combo - prefer the most
  // complete report (most non-null observed fields), tie-broken by
  // confidence, rather than whichever happens to iterate first.
  const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
  const observedCandidates = getBuildsFor(builds, frameId, engineId).filter(
    (b) => b.observed && (b.observed.hp || b.observed.tq_nm || b.observed.mpg)
  );
  observedCandidates.sort((a, b) => {
    const fieldCount = (o) =>
      ["hp", "tq_nm", "mpg"].filter((k) => o.observed[k] != null).length;
    const scoreOf = (o) =>
      fieldCount(o) * 10 + (CONFIDENCE_RANK[o.confidence] || 0);
    return scoreOf(b) - scoreOf(a);
  });
  const observed = observedCandidates[0];

  if (observed) {
    return {
      source: "observed",
      hp: observed.observed.hp,
      tq_nm: observed.observed.tq_nm,
      mpg: observed.observed.mpg,
      powerToWeight: observed.observed.hp
        ? powerToWeight(observed.observed.hp, frame.curb_weight_kg, towWeightKg)
        : null,
      torqueToWeight: observed.observed.tq_nm
        ? torqueToWeight(observed.observed.tq_nm, frame.curb_weight_kg, towWeightKg)
        : null,
    };
  }

  const diffRatio = gearing || frame.stock_diff_ratio;
  const tireDiameterIn = parseTireDiameterIn(tireSize || frame.stock_tire_size);
  const rpm = rpmAtSpeed(60, diffRatio, tireDiameterIn);
  const efficiency = drivelineEfficiency(transmissions, transId);
  const hp = engine.stock_hp * efficiency;
  const tqNm = engine.stock_tq_nm * efficiency;

  return {
    source: "estimated",
    hp,
    tq_nm: tqNm,
    mpg: estimateMpg(engine, frame, diffRatio, towWeightKg) * efficiency,
    powerToWeight: powerToWeight(hp, frame.curb_weight_kg, towWeightKg),
    torqueToWeight: torqueToWeight(tqNm, frame.curb_weight_kg, towWeightKg),
    rpmFlag: rpmFlag(rpm, engine),
    intercooler,
    drivelineNote:
      efficiency < 1
        ? `Figures reduced ${Math.round((1 - efficiency) * 100)}% for automatic-transmission driveline loss vs. a manual.`
        : null,
  };
}
