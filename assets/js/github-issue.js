const REPO = "djosephsen/swoptimal";

export function buildIssueUrl({ title, body, labels }) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (body) params.set("body", body);
  if (labels && labels.length) params.set("labels", labels.join(","));
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

export function buildSearchUrl(frameName, engineName) {
  const terms = [frameName, engineName, "swap"].filter(Boolean).join(" ");
  const query = `site:ih8mud.com ${terms}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function buildDataSubmissionUrl(form) {
  const title = `Add build: ${form.frame || "?"} + ${form.engine || "?"}${
    form.transmission ? " + " + form.transmission : ""
  }`;
  const body = [
    "<!-- Fill in what you know; leave the rest blank -->",
    `Frame: ${form.frame || ""}`,
    `Engine: ${form.engine || ""}`,
    `Transmission: ${form.transmission || ""}`,
    `Gearing: ${form.gearing || ""}`,
    `Tire size: ${form.tireSize || ""}`,
    `Intercooler: ${form.intercooler || ""}`,
    `Build thread URL: ${form.url || ""}`,
    `Observed HP: ${form.hp || ""}`,
    `Observed torque (Nm): ${form.tqNm || ""}`,
    `Observed MPG: ${form.mpg || ""}`,
    `Notes / complications: ${form.notes || ""}`,
  ].join("\n");
  return buildIssueUrl({ title, body, labels: ["data-submission"] });
}
