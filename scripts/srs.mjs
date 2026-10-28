// Requirement tracker for docs/srs.md: progress by phase, priority and
// module, and checks that every requirement is planned.
//
//   npm run srs                 progress and problems
//   npm run srs -- --phase 0    what's left in one phase
//   npm run srs -- --write      refresh the Progress section of docs/srs.md
//   npm run srs -- --check      exit 1 on problems (for CI)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const SRS_PATH = fileURLToPath(new URL("../docs/srs.md", import.meta.url));
const STATUSES = [
  "New",
  "Mock",
  "Designed",
  "In progress",
  "Partial",
  "Built",
  "Verified",
  "Dropped",
];
const DONE = new Set(["Built", "Verified"]);
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const PROGRESS_START = "<!-- progress:start -->";
const PROGRESS_END = "<!-- progress:end -->";

const args = process.argv.slice(2);
const text = readFileSync(SRS_PATH, "utf8");
const problems = [];
const warnings = [];

// Requirement rows are table rows whose first cell is an ID; the priority is
// the cell that is exactly P0–P3 and the status is the last cell.
const requirements = new Map();
for (const line of text.split("\n")) {
  const match = line.match(/^\|\s*([A-Z0-9]+-\d+)\s*\|/);
  if (!match) continue;

  const id = match[1];
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  const priority = cells.find((cell) => PRIORITIES.includes(cell));
  const status = cells.at(-1);

  if (requirements.has(id)) problems.push(`${id} is defined twice.`);
  if (!priority) problems.push(`${id} has no priority (P0–P3).`);
  if (!STATUSES.includes(status)) {
    problems.push(`${id} has an unknown status "${status}".`);
  }
  requirements.set(id, { id, module: id.split("-")[0], priority, status });
}

// "APT-06 to APT-14" counts as every ID in between.
function expandIds(chunk) {
  const ids = [];
  for (const match of chunk.matchAll(/\b([A-Z0-9]+)-(\d+)(?: to \1-(\d+))?/g)) {
    const from = Number(match[2]);
    const to = match[3] ? Number(match[3]) : from;
    for (let n = from; n <= to; n++) {
      ids.push(`${match[1]}-${String(n).padStart(2, "0")}`);
    }
  }
  return ids;
}

// Each "### " heading in the release plan is a phase.
const planStart = text.indexOf("## 8. Release plan");
const plan = text.slice(planStart, text.indexOf("\n## ", planStart + 1));
const phases = plan
  .split(/^### /m)
  .slice(1)
  .map((block) => {
    const [title, ...body] = block.split("\n");
    return {
      title: title.trim(),
      ids: [...new Set(expandIds(body.join("\n")))],
    };
  });

const phasesById = new Map();
for (const phase of phases) {
  for (const id of phase.ids) {
    if (!requirements.has(id)) {
      problems.push(`"${phase.title}" lists ${id}, which isn't defined.`);
      continue;
    }
    phasesById.set(id, [...(phasesById.get(id) ?? []), phase.title]);
  }
}
for (const { id, status } of requirements.values()) {
  const listed = phasesById.get(id) ?? [];
  if (listed.length === 0 && status !== "Dropped") {
    problems.push(`${id} isn't in any phase of the release plan.`);
  }
  if (listed.length > 1) {
    warnings.push(`${id} is in more than one phase: ${listed.join("; ")}.`);
  }
}

function tally(items) {
  const active = items.filter((item) => item.status !== "Dropped");
  const count = (test) => active.filter(test).length;
  const done = count((item) => DONE.has(item.status));
  return {
    total: active.length,
    done,
    inProgress: count((item) => item.status === "In progress"),
    partial: count((item) => item.status === "Partial"),
    notStarted: count((item) =>
      ["New", "Mock", "Designed"].includes(item.status),
    ),
    percent: active.length ? Math.round((done / active.length) * 100) : 0,
  };
}

function rows(groups) {
  return groups.map(([label, items]) => ({ label, ...tally(items) }));
}

const all = [...requirements.values()];
const byPhase = rows(
  phases.map((phase) => [
    phase.title,
    phase.ids
      .filter((id) => requirements.has(id))
      .map((id) => requirements.get(id)),
  ]),
);
const byPriority = rows(
  PRIORITIES.map((priority) => [
    priority,
    all.filter((item) => item.priority === priority),
  ]),
);
const byModule = rows(
  [...new Set(all.map((item) => item.module))].map((module) => [
    module,
    all.filter((item) => item.module === module),
  ]),
);

function markdownTable(heading, data) {
  return [
    `| ${heading} | Total | Done | In progress | Partial | Not started | Progress |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...data.map(
      (row) =>
        `| ${row.label} | ${row.total} | ${row.done} | ${row.inProgress} | ${row.partial} | ${row.notStarted} | ${row.percent}% |`,
    ),
  ].join("\n");
}

function printTable(heading, data) {
  const width = Math.max(
    heading.length,
    ...data.map((row) => row.label.length),
  );
  console.log(
    `\n${heading.padEnd(width)}  Total  Done  In progress  Partial  Not started`,
  );
  for (const row of data) {
    console.log(
      `${row.label.padEnd(width)}  ${String(row.total).padStart(5)}  ${String(row.done).padStart(4)}  ${String(row.inProgress).padStart(11)}  ${String(row.partial).padStart(7)}  ${String(row.notStarted).padStart(11)}   ${row.percent}%`,
    );
  }
}

async function withProgress(source) {
  const overall = tally(all);
  const block = [
    PROGRESS_START,
    "",
    `**${overall.done} of ${overall.total} requirements done (${overall.percent}%)**, ${overall.inProgress} in progress, ${overall.partial} partial.`,
    "",
    markdownTable("Phase", byPhase),
    "",
    markdownTable("Priority", byPriority),
    "",
    PROGRESS_END,
  ].join("\n");

  const start = source.indexOf(PROGRESS_START);
  const end = source.indexOf(PROGRESS_END);
  if (start === -1 || end === -1) {
    throw new Error(`docs/srs.md needs ${PROGRESS_START} and ${PROGRESS_END}.`);
  }
  const next =
    source.slice(0, start) + block + source.slice(end + PROGRESS_END.length);

  const options = await resolveConfig(SRS_PATH);
  return format(next, { ...options, filepath: SRS_PATH });
}

const phaseArg = args.indexOf("--phase");
if (phaseArg !== -1) {
  const wanted = args[phaseArg + 1];
  const phase = phases.find(
    (item) =>
      item.title.toLowerCase().startsWith(`phase ${wanted}`) ||
      item.title.toLowerCase() === String(wanted).toLowerCase(),
  );
  if (!phase) {
    console.error(
      `No phase "${wanted}". Phases: ${phases.map((item) => item.title).join("; ")}`,
    );
    process.exit(1);
  }
  const open = phase.ids
    .map((id) => requirements.get(id))
    .filter(
      (item) => item && !DONE.has(item.status) && item.status !== "Dropped",
    );
  console.log(
    `${phase.title}: ${open.length} of ${phase.ids.length} not done\n`,
  );
  for (const item of open) {
    console.log(`${item.id.padEnd(8)} ${item.priority}  ${item.status}`);
  }
  process.exit(0);
}

const updated = await withProgress(text);

if (args.includes("--write")) {
  writeFileSync(SRS_PATH, updated);
  console.log("Updated the Progress section of docs/srs.md.");
} else if (updated !== text) {
  problems.push(
    "The Progress section is out of date. Run: npm run srs -- --write",
  );
}

const overall = tally(all);
console.log(
  `${overall.done} of ${overall.total} requirements done (${overall.percent}%), ${overall.inProgress} in progress, ${overall.partial} partial.`,
);
printTable("Phase", byPhase);
printTable("Priority", byPriority);
printTable("Module", byModule);

for (const warning of warnings) console.warn(`\nNote: ${warning}`);
if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  if (args.includes("--check")) process.exit(1);
}
