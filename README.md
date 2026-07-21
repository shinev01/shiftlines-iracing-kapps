# ShiftLines for Kapps

Native Kapps Custom Overlay with car-specific iRacing shift lights. It uses the
same open Lovely Car Data project referenced by ATSR-Hub EVO: individual RPM
thresholds for every LED and every gear, native LED colors/count, and the
car-specific redline blink interval.

No separate server, SimHub, or terminal window is required. Kapps serves the
files and supplies live iRacing telemetry through its WebSocket.

## Install

1. Run `Install-Kapps-App.cmd` once.
2. Start Kapps **as administrator** once.
3. In `App -> Settings -> App Folder`, select `Documents\iRacing\CustomApps` and
   click `Save`.
4. In `Racing Overlay`, choose `Add Custom Overlay`:

   ```text
   Name: ShiftLines
   URL:  http://127.0.0.1:8182/ShiftLines/
   ```

After Kapps creates its folder link, it can be started normally.

## Test without iRacing

Open this URL while Kapps is running:

```text
http://127.0.0.1:8182/ShiftLines/?demo=1&debug=1
```

Choose a GTP demo profile with `car=`: `porsche963gtp`, `bmwlmdh`,
`cadillacvseriesrgtp`, `acuraarx06gtp`, or `ferrari499p`.

Example:

```text
http://127.0.0.1:8182/ShiftLines/?demo=1&debug=1&car=bmwlmdh
```

Add `?debug=1` to the live URL to display the detected car, RPM, gear, and data
source. If a car does not yet exist in the bundled database, ShiftLines falls
back to iRacing's `PlayerCarSLFirstRPM`, `PlayerCarSLShiftRPM`,
`PlayerCarSLLastRPM`, and `PlayerCarSLBlinkRPM` values.

## Development

```powershell
npm test
```

Node.js is only needed for tests, not to run the overlay.

