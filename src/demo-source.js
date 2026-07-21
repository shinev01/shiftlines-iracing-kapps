const CARS = ["porsche963gtp", "bmwlmdh", "cadillacvseriesrgtp", "acuraarx06gtp", "ferrari499p"];

export class DemoSource extends EventTarget {
  constructor(carPath) {
    super();
    this.carPath = carPath || CARS[0];
    this.timer = null;
  }

  connect() {
    const started = performance.now();
    this.dispatchEvent(new CustomEvent("socket", { detail: { connected: true } }));
    this.timer = setInterval(() => {
      const elapsed = performance.now() - started;
      const phase = (elapsed % 4400) / 4400;
      const rpm = phase < 0.78 ? 2500 + phase / 0.78 * 6100 : 8600 - (phase - 0.78) / 0.22 * 5600;
      const gear = 3 + Math.floor(elapsed / 4400) % 4;
      const driverInfo = {
        DriverCarIdx: 0,
        Drivers: [{ CarIdx: 0, CarPath: this.carPath }],
      };
      this.dispatchEvent(new CustomEvent("telemetry", {
        detail: { connected: true, data: { RPM: rpm, Gear: gear, IsOnTrack: true, DriverInfo: driverInfo } },
      }));
    }, 1000 / 60);
  }
}

