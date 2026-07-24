import assert from "node:assert/strict";
import test from "node:test";

import { applyKappsMessage } from "../src/kapps-client.js";

test("telemetry confirms iRacing when overlay opens after the sim", () => {
  const next = applyKappsMessage(
    { data: {}, connected: false },
    { data: { RPM: 7123, Gear: 4 } },
  );

  assert.equal(next.connected, true);
  assert.deepEqual(next.data, { RPM: 7123, Gear: 4 });
});

test("explicit disconnect wins over telemetry in the same packet", () => {
  const next = applyKappsMessage(
    { data: { RPM: 7123 }, connected: true },
    { disconnected: true, data: { RPM: 0 } },
  );

  assert.equal(next.connected, false);
});

test("connected notification clears stale telemetry", () => {
  const next = applyKappsMessage(
    { data: { RPM: 7123, Gear: 4 }, connected: false },
    { connected: true },
  );

  assert.equal(next.connected, true);
  assert.deepEqual(next.data, {});
});

test("unrelated Kapps data does not impersonate iRacing telemetry", () => {
  const next = applyKappsMessage(
    { data: {}, connected: false },
    { data: { serverTime: 123 } },
  );

  assert.equal(next.connected, false);
});
