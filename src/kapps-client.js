export const REQUEST_PARAMS = [
  "RPM",
  "Gear",
  "IsOnTrack",
  "IsInGarage",
  "PlayerCarSLFirstRPM",
  "PlayerCarSLShiftRPM",
  "PlayerCarSLLastRPM",
  "PlayerCarSLBlinkRPM",
  "DriverInfo",
];

export class KappsClient extends EventTarget {
  constructor({ host = "127.0.0.1:8182", fps = 60, reconnectMs = 1500 } = {}) {
    super();
    this.host = host;
    this.fps = fps;
    this.reconnectMs = reconnectMs;
    this.data = {};
    this.socket = null;
    this.closed = false;
    this.iracingConnected = false;
  }

  connect() {
    this.closed = false;
    this.socket = new WebSocket(`ws://${this.host}/ws`);
    this.socket.addEventListener("open", () => {
      this.data = {};
      this.socket.send(JSON.stringify({
        fps: this.fps,
        readIbt: false,
        requestParams: REQUEST_PARAMS,
        requestParamsOnce: [],
      }));
      this.dispatchEvent(new CustomEvent("socket", { detail: { connected: true } }));
    });
    this.socket.addEventListener("message", (event) => this.#message(event));
    this.socket.addEventListener("close", () => {
      this.iracingConnected = false;
      this.dispatchEvent(new CustomEvent("socket", { detail: { connected: false } }));
      if (!this.closed) setTimeout(() => this.connect(), this.reconnectMs);
    });
    this.socket.addEventListener("error", () => this.socket?.close());
  }

  #message(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.connected) {
      this.data = {};
      this.iracingConnected = true;
    }
    if (message.disconnected) this.iracingConnected = false;
    if (message.data) Object.assign(this.data, message.data);
    this.dispatchEvent(new CustomEvent("telemetry", {
      detail: { data: this.data, connected: this.iracingConnected },
    }));
  }
}

