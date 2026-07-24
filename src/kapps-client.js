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

export function applyKappsMessage(state, message) {
  const data = message.connected ? {} : { ...(state.data || {}) };
  let connected = Boolean(state.connected);
  const incoming = message.data && typeof message.data === "object"
    ? message.data
    : null;

  if (message.connected) connected = true;

  if (incoming) {
    Object.assign(data, incoming);

    // When an overlay is opened after iRacing, Kapps can start streaming
    // telemetry without repeating its one-shot `connected` notification.
    if (REQUEST_PARAMS.some((key) => Object.prototype.hasOwnProperty.call(incoming, key))) {
      connected = true;
    }
  }

  // An explicit disconnect must win even if the final packet also has data.
  if (message.disconnected) connected = false;

  return { data, connected };
}

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
    const next = applyKappsMessage(
      { data: this.data, connected: this.iracingConnected },
      message,
    );
    this.data = next.data;
    this.iracingConnected = next.connected;
    this.dispatchEvent(new CustomEvent("telemetry", {
      detail: { data: this.data, connected: this.iracingConnected },
    }));
  }
}
