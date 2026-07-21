import { DemoSource } from "./demo-source.js";
import { computeLights, gearKey, playerCarPath, profileForCar } from "./engine.js";
import { KappsClient } from "./kapps-client.js";

const query = new URLSearchParams(location.search);
const isDemo = query.has("demo");
const debugEnabled = query.has("debug");
const source = isDemo ? new DemoSource(query.get("car")) : new KappsClient();

const elements = {
  lights: document.querySelector("#lights"),
  status: document.querySelector("#status"),
  debug: document.querySelector("#debug"),
  debugCar: document.querySelector("#debug-car"),
  debugTelemetry: document.querySelector("#debug-telemetry"),
  debugSource: document.querySelector("#debug-source"),
};

let profiles = {};
let telemetry = {};
let socketConnected = false;
let iracingConnected = false;
let leds = [];

elements.debug.hidden = !debugEnabled;

async function loadProfiles() {
  try {
    const response = await fetch("./data/cars-bundle.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    profiles = (await response.json()).cars || {};
  } catch (error) {
    console.error("Unable to load car profiles", error);
  }
}

function ensureLedCount(count) {
  if (leds.length === count) return;
  elements.lights.replaceChildren();
  elements.lights.style.setProperty("--led-count", count);
  leds = Array.from({ length: count }, (_, index) => {
    const led = document.createElement("span");
    led.className = "led";
    led.setAttribute("aria-label", `LED ${index + 1}`);
    elements.lights.append(led);
    return led;
  });
}

function render(nowMs) {
  const carPath = playerCarPath(telemetry.DriverInfo);
  const profile = profileForCar(profiles, carPath);
  const state = computeLights({
    rpm: telemetry.RPM,
    gear: telemetry.Gear,
    profile,
    telemetry,
    nowMs,
  });

  ensureLedCount(state.lights.length);
  state.lights.forEach((light, index) => {
    leds[index].classList.toggle("on", light.active && (iracingConnected || isDemo));
    leds[index].style.setProperty("--led-color", light.color);
  });

  elements.status.textContent = isDemo
    ? "DEMO"
    : !socketConnected
      ? "WAITING FOR KAPPS"
      : !iracingConnected
        ? "WAITING FOR IRACING"
        : !carPath
          ? "WAITING FOR CAR"
          : "";

  if (debugEnabled) {
    elements.debugCar.textContent = profile?.carName?.trim() || carPath || "NO CAR";
    elements.debugTelemetry.textContent = `${Math.round(Number(telemetry.RPM) || 0)} RPM · ${gearKey(telemetry.Gear)}`;
    elements.debugSource.textContent = profile ? "LOVELY CAR DATA" : "IRACING FALLBACK";
  }
  requestAnimationFrame(render);
}

source.addEventListener("socket", (event) => {
  socketConnected = event.detail.connected;
});
source.addEventListener("telemetry", (event) => {
  telemetry = event.detail.data || telemetry;
  iracingConnected = event.detail.connected;
});

await loadProfiles();
source.connect();
requestAnimationFrame(render);

