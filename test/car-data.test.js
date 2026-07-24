import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { computeLights, profileForCar } from "../src/engine.js";

const bundle = JSON.parse(
  readFileSync(new URL("../data/cars-bundle.json", import.meta.url), "utf8"),
);
const profiles = Object.values(bundle.cars);

test("bundles every current ATSR/Lovely iRacing profile", () => {
  assert.equal(profiles.length, 80);
  assert.equal(profiles.filter((profile) => profile.carClass === "GT3").length, 12);
  assert.deepEqual(
    profiles
      .filter((profile) => profile.carClass === "LMP2")
      .map((profile) => profile.carId)
      .sort(),
    ["dallarap217", "hpdarx01c"],
  );
  assert.deepEqual(
    profiles
      .filter((profile) => profile.carClass === "LMP3")
      .map((profile) => profile.carId),
    ["ligierjsp320"],
  );
});

test("resolves and renders every bundled car profile", () => {
  for (const profile of profiles) {
    assert.equal(profileForCar(bundle.cars, profile.carId), profile, profile.carId);

    const gearMap = profile.ledRpm.flatMap((group) => Object.entries(group))[0];
    assert.ok(gearMap, `${profile.carId}: missing gear data`);
    const [gear, thresholds] = gearMap;
    const rpm = Number(thresholds.at(-1)) || 0;
    const state = computeLights({ rpm, gear, profile, nowMs: 0 });

    assert.equal(state.source, "profile", profile.carId);
    assert.equal(state.lights.length, profile.ledNumber, profile.carId);
  }
});
