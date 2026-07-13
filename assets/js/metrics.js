// Declarative spider-graph axes. Add a future custom metric by adding an
// entry here plus a value in the `stats` object passed to radar.js - the
// chart itself doesn't need to change.
export const METRICS = [
  { key: "hp", label: "Horsepower", unit: "hp", min: 0, max: 300 },
  { key: "tq_nm", label: "Torque", unit: "Nm", min: 0, max: 700 },
  { key: "mpg", label: "MPG", unit: "mpg", min: 0, max: 25 },
  {
    key: "powerToWeight",
    label: "Power/Weight",
    unit: "hp/1000lb",
    min: 0,
    max: 150,
  },
  {
    key: "torqueToWeight",
    label: "Torque/Weight",
    unit: "Nm/1000lb",
    min: 0,
    max: 350,
  },
];
