import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPOSITORY = "Lovely-Sim-Racing/lovely-car-data";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/main/data`;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = path.join(projectRoot, "data", "cars-bundle.json");

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const sourceRoot = option("--source");
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check") || !shouldWrite;
const revision = option("--revision") || "main";

async function loadJson(relativePath) {
  if (sourceRoot) {
    const filename = path.join(path.resolve(sourceRoot), "data", ...relativePath.split("/"));
    return JSON.parse(await readFile(filename, "utf8"));
  }

  const response = await fetch(`${RAW_BASE}/${relativePath}`);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${relativePath}: HTTP ${response.status}`);
  }
  return response.json();
}

function validateProfile(profile, manifestEntry) {
  if (!profile || typeof profile !== "object") {
    throw new Error(`${manifestEntry.path}: profile is not an object`);
  }
  if (!profile.carId || profile.carId !== manifestEntry.carId) {
    throw new Error(`${manifestEntry.path}: carId does not match the manifest`);
  }
  if (!Number.isInteger(profile.ledNumber) || profile.ledNumber < 1) {
    throw new Error(`${profile.carId}: invalid ledNumber`);
  }
  if (!Array.isArray(profile.ledColor) || !profile.ledColor.length) {
    throw new Error(`${profile.carId}: missing LED colors`);
  }
  if (!Array.isArray(profile.ledRpm) || !profile.ledRpm.length) {
    throw new Error(`${profile.carId}: missing per-gear RPM data`);
  }

  const gearEntries = profile.ledRpm.flatMap((group) => Object.entries(group || {}));
  if (!gearEntries.length) {
    throw new Error(`${profile.carId}: no gear RPM maps`);
  }
  for (const [gear, thresholds] of gearEntries) {
    if (!Array.isArray(thresholds) || thresholds.length < profile.ledNumber + 1) {
      throw new Error(`${profile.carId}: incomplete RPM thresholds for gear ${gear}`);
    }
  }
}

async function buildCars() {
  const manifest = await loadJson("manifest.json");
  const entries = manifest?.cars?.iracing;
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("The upstream manifest has no iRacing profiles");
  }

  const cars = {};
  for (const entry of entries) {
    const relativePath = entry.path.replace(/^iracing\//, "iracing/");
    const profile = await loadJson(relativePath);
    validateProfile(profile, entry);
    if (cars[profile.carId]) {
      throw new Error(`Duplicate iRacing carId: ${profile.carId}`);
    }
    cars[profile.carId] = profile;
  }
  return cars;
}

const current = JSON.parse(await readFile(bundlePath, "utf8"));
const cars = await buildCars();
const currentCars = JSON.stringify(current.cars);
const upstreamCars = JSON.stringify(cars);

if (shouldCheck) {
  if (currentCars !== upstreamCars) {
    console.error(
      `Bundled profiles differ from upstream (${Object.keys(current.cars).length} local, ` +
      `${Object.keys(cars).length} upstream). Run npm run sync:data.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Car data is current: ${Object.keys(cars).length} iRacing profiles.`);
  }
}

if (shouldWrite) {
  const bundle = {
    version: "1.0",
    timestamp: Date.now(),
    source: {
      repository: REPOSITORY,
      revision,
    },
    cars,
  };
  await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Updated ${bundlePath} with ${Object.keys(cars).length} iRacing profiles.`);
}
