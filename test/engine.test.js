import test from "node:test";
import assert from "node:assert/strict";
import {
  computeLedGeometry,
  computeLights,
  gearKey,
  normalizeColor,
  playerCarPath,
  profileForCar,
} from "../src/engine.js";

const profile = {
  carName: "Test GTP",
  carId: "testgtp",
  ledNumber: 3,
  redlineBlinkInterval: 250,
  ledColor: ["#FFFF0000", "#FF00FF00", "#FFFFFF00", "#FFFF0000"],
  ledRpm: [{ N: [8000, 5000, 6000, 7000], "2": [7500, 4500, 5500, 6500] }],
};

test("maps iRacing gears", () => {
  assert.equal(gearKey(-1), "R");
  assert.equal(gearKey(0), "N");
  assert.equal(gearKey(4), "4");
});

test("converts ARGB colors used by lovely-car-data to CSS RGB", () => {
  assert.equal(normalizeColor("#FF12abEF"), "#12abEF");
  assert.equal(normalizeColor("red"), "red");
});

test("uses independent per-LED, per-gear RPM thresholds", () => {
  const state = computeLights({ rpm: 5600, gear: 2, profile, nowMs: 0 });
  assert.deepEqual(state.lights.map((light) => light.active), [true, true, false]);
  assert.deepEqual(state.lights.map((light) => light.threshold), [4500, 5500, 6500]);
  assert.equal(state.lights[0].color, "#00FF00");
});

test("applies the profile redline color and blink interval", () => {
  const on = computeLights({ rpm: 7600, gear: 2, profile, nowMs: 0 });
  const off = computeLights({ rpm: 7600, gear: 2, profile, nowMs: 250 });
  assert.ok(on.lights.every((light) => light.active && light.color === "#FF0000"));
  assert.ok(off.lights.every((light) => !light.active));
});

test("finds normalized car IDs and extracts the player CarPath", () => {
  assert.equal(profileForCar({ testgtp: profile }, "TEST-GTP"), profile);
  assert.equal(playerCarPath({ DriverCarIdx: 7, Drivers: [{ CarIdx: 7, CarPath: "testgtp" }] }), "testgtp");
});

test("falls back to iRacing shift thresholds without a profile", () => {
  const state = computeLights({
    rpm: 6500,
    telemetry: {
      PlayerCarSLFirstRPM: 5000,
      PlayerCarSLShiftRPM: 7000,
      PlayerCarSLLastRPM: 6800,
      PlayerCarSLBlinkRPM: 7200,
    },
  });
  assert.equal(state.source, "iracing");
  assert.ok(state.lights.some((light) => light.active));
  assert.ok(state.lights.some((light) => !light.active));
});

test("scales the whole light bar proportionally to either window dimension", () => {
  const wide = computeLedGeometry(1000, 40, 10);
  const tall = computeLedGeometry(200, 400, 10);
  const doubled = computeLedGeometry(400, 800, 10);

  assert.ok(wide.diameter < 40);
  assert.ok(tall.diameter < wide.diameter);
  assert.equal(doubled.diameter, tall.diameter * 2);
  assert.equal(doubled.gap, tall.gap * 2);
  assert.equal(doubled.padding, tall.padding * 2);
});
