// Engine <-> transmission pairing checks. Distinct from fit.js, which
// only checks frame <-> engine. Notes here are cautions, not blockers -
// unlike a frame's engine bay, transmission pairing is rarely a hard
// "no-fit": bellhousings get adapted, torque ratings get exceeded (with
// consequences, not impossibility).
export function checkTransCompatibility(engine, trans) {
  if (!engine || !trans) return [];

  const notes = [];

  if (trans.torque_rating_nm && engine.stock_tq_nm > trans.torque_rating_nm) {
    notes.push({
      level: "warning",
      note: `${engine.name}'s stock torque (${engine.stock_tq_nm}Nm) exceeds this transmission's rating (${trans.torque_rating_nm}Nm) - expect reduced service life or failure under sustained load.`,
    });
  }

  const bellhousingMatches = (trans.bellhousing_patterns || []).includes(
    engine.bellhousing_pattern
  );
  if (!bellhousingMatches) {
    if (trans.control === "electronic") {
      notes.push({
        level: "warning",
        note: "This is an electronically-controlled transmission - pairing it with a different engine usually needs a matching TCU/ECU or a standalone transmission controller, not just an adapter plate.",
      });
    } else {
      notes.push({
        level: "info",
        note: "Bellhousing pattern differs from stock - mechanically controlled, so this is normally just an adapter-plate/machining problem, not an electronics one.",
      });
    }
  }

  return notes;
}
