const FALLBACK_COLORS = [
  "#00ff45", "#00ff45", "#00ff45", "#00ff45",
  "#ffe100", "#ffe100", "#ffe100",
  "#ff2020", "#ff2020", "#ff2020",
];

export function gearKey(gear) {
  if (gear === -1) return "R";
  if (gear === 0) return "N";
  return String(Math.max(1, Math.trunc(Number(gear) || 1)));
}

export function normalizeColor(color, fallback = "#ffffff") {
  if (typeof color !== "string") return fallback;
  const value = color.trim();
  if (/^#[0-9a-f]{8}$/i.test(value)) return `#${value.slice(3)}`;
  return value || fallback;
}

export function normalizeCarId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function profileForCar(profiles, carPath) {
  if (!profiles || !carPath) return null;
  if (profiles[carPath]) return profiles[carPath];
  const wanted = normalizeCarId(carPath);
  return Object.values(profiles).find((profile) => normalizeCarId(profile.carId) === wanted) || null;
}

export function thresholdsForGear(profile, gear) {
  const key = gearKey(gear);
  for (const group of profile?.ledRpm || []) {
    if (Array.isArray(group?.[key])) return group[key];
    if (Array.isArray(group?.N)) return group.N;
  }
  return null;
}

function finite(value, fallback = 0) {
  const result = Array.isArray(value) ? value[0] : value;
  return Number.isFinite(Number(result)) ? Number(result) : fallback;
}

function profileState({ rpm, gear, profile, nowMs }) {
  const thresholds = thresholdsForGear(profile, gear);
  if (!thresholds?.length) return null;

  const ledCount = Math.max(1, Math.trunc(profile.ledNumber || thresholds.length - 1));
  const redline = finite(thresholds[0], Infinity);
  const atRedline = rpm >= redline;
  const interval = Math.max(0, finite(profile.redlineBlinkInterval));
  const redlineVisible = !atRedline || interval === 0 || Math.floor(nowMs / interval) % 2 === 0;
  const redlineColor = normalizeColor(profile.ledColor?.[0], "#ff2020");

  const lights = Array.from({ length: ledCount }, (_, index) => {
    const threshold = finite(thresholds[index + 1], Infinity);
    const active = atRedline ? redlineVisible : rpm >= threshold;
    return {
      active,
      color: atRedline ? redlineColor : normalizeColor(profile.ledColor?.[index + 1]),
      threshold,
    };
  });

  return { lights, source: "profile", redline, atRedline };
}

function fallbackState({ rpm, telemetry, nowMs }) {
  const first = finite(telemetry.PlayerCarSLFirstRPM);
  const shift = finite(telemetry.PlayerCarSLShiftRPM);
  const last = finite(telemetry.PlayerCarSLLastRPM, shift);
  const blink = finite(telemetry.PlayerCarSLBlinkRPM);
  const usableFirst = first > 0 ? first : Math.max(1, shift * 0.78);
  const usableLast = last > usableFirst ? last : Math.max(usableFirst, shift || usableFirst);
  const isBlinking = blink > 0 && rpm >= blink;
  const blinkVisible = !isBlinking || Math.floor(nowMs / 250) % 2 === 0;

  const lights = FALLBACK_COLORS.map((color, index) => {
    const progress = index / (FALLBACK_COLORS.length - 1);
    const threshold = usableFirst + (usableLast - usableFirst) * progress;
    return {
      active: blinkVisible && rpm >= threshold,
      color: isBlinking ? "#ffffff" : rpm >= shift && shift > 0 ? "#9b4dff" : color,
      threshold,
    };
  });

  return { lights, source: "iracing", redline: blink || shift, atRedline: isBlinking };
}

export function computeLights({ rpm = 0, gear = 0, profile = null, telemetry = {}, nowMs = 0 }) {
  const safeRpm = Math.max(0, finite(rpm));
  return profileState({ rpm: safeRpm, gear, profile, nowMs }) ||
    fallbackState({ rpm: safeRpm, telemetry, nowMs });
}

export function playerCarPath(driverInfo) {
  if (!driverInfo) return "";
  const playerIndex = finite(driverInfo.DriverCarIdx, -1);
  const driver = driverInfo.Drivers?.find?.((item) => finite(item?.CarIdx, -2) === playerIndex);
  return driver?.CarPath || driverInfo.DriverCarPath || "";
}

