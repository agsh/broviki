# MSE playback backup (pre-WebRTC)

Active player lived in `apps/web/src/components/mse-player.tsx` (copy next to this file).
Video window fetched `/api/cam/:id/playback` and played HLS fMP4 via hls.js:

- MediaMTX HLS on `:8888` → `http://{hostname}:8888/{pathName}/index.m3u8`
- Auth: `Authorization: Bearer broviki-dev-hls-cdn` (matches `hlsCDNSecret`)
- API returned `{ pathName, hlsUrl, mse: true, sourceOnDemand: true }`

To restore MSE: copy `mse-player.tsx` back to `components/mse-player.tsx` and wire
`video-window.tsx` to import `MsePlayer` with `hlsUrl` as before. Keep HLS enabled in
`apps/mediamtx/mediamtx.yml` (`hls: yes`).
