# shaka-player

Custom element wrapper for google&#39;s Shaka Player

## Usage
```html
<shaka-player
   autoplay
   controls
   dash-manifest="http://rdmedia.bbc.co.uk/dash/ondemand/bbb/2/client_manifest-common_init.mpd"
></shaka-player>
```

## Properties

| Property                    | Attribute                      | Modifiers | Type                             | Default    | Description                                      |
|-----------------------------|--------------------------------|-----------|----------------------------------|------------|--------------------------------------------------|
| `allowCrossSiteCredentials` | `allow-cross-site-credentials` |           | `boolean`                        |            | Whether shaka player should use cookies for CORS requests. |
| `autoplay`                  | `autoplay`                     |           | `boolean`                        | false      | Whether the video should auto-play.              |
| `canPlay`                   |                                | readonly  | `boolean`                        |            | Whether the video can play.                      |
| `controls`                  | `controls`                     |           | `boolean`                        |            | Whether to display controls over the video.      |
| `currentTime`               | `currentTime`                  |           | `number`                         |            | Video's current time                             |
| `dashManifest`              | `dash-manifest`                |           | `string`                         |            | URL to the MPEG-DASH manifest                    |
| `duration`                  |                                | readonly  | `number`                         |            | The duration of the video in seconds.            |
| `ended`                     |                                | readonly  | `boolean`                        |            | Whether or not the video playback has ended.     |
| `hlsManifest`               | `hls-manifest`                 |           | `string`                         |            | URL to the HLS manifest                          |
| `loading`                   | `loading`                      |           | `boolean`                        | false      | Whether the video is loading                     |
| `muted`                     | `muted`                        |           | `boolean`                        | false      | Whether the video is muted.                      |
| `paused`                    |                                | readonly  | `boolean`                        |            | Whether the video is paused.                     |
| `playing`                   | `playing`                      |           | `boolean`                        |            | Whether the video is playing.                    |
| `poster`                    | `poster`                       |           | `string`                         |            | The src URL for the poster frame.                |
| `preload`                   | `preload`                      |           | `'none'\|'metadata'\|'auto'\|''` | "metadata" | Video element preload value.                     |
| `readyState`                |                                | readonly  | `number`                         |            | Ready state of the video element.                |
| `src`                       | `src`                          |           | `string`                         |            | URL to a video file                              |
| `volume`                    |                                |           | `number`                         | 1          | The volume level of the video.                   |

## Methods

| Method         | Type                                             | Description                                      |
|----------------|--------------------------------------------------|--------------------------------------------------|
| `load`         | `(manifestUri: string, startTime?: number \| undefined, manifestMimeType?: string \| undefined): Promise` | Load a Manifest.<br /><br />**startTime**: Optional start time, in seconds, to begin playback. Defaults to 0 for VOD and to the live edge for live. Set a positive number to start with a certain offset the beginning. Set a negative number to start with a certain offset from the end. This is intended for use with live streams, to start at a fixed offset from the live edge.<br />**manifestMimeType**: Optional mimetype registered using `shaka.media.ManifestParser.register(mimeType, ParserClass)` |
| `loadManifest` | `(manifestUri: string): Promise`                 | Load a manifest URL into shaka player.           |
| `loadVideo`    | `(url: string): string`                          | Load a regular video URL.                        |
| `notify`       | `(property: any): void`                          |                                                  |
| `pause`        | `(): any`                                        | Pauses the player.                               |
| `play`         | `(): Promise`                                    | Plays the player.                                |
| `unload`       | `(reinitializeMediaSource?: boolean \| undefined): Promise<void>` | Unload the current manifest and make the Player available for re-use.<br /><br />**reinitializeMediaSource**: If true, start reinitializing MediaSource right away. This can improve load() latency for MediaSource-based playbacks. Defaults to true. |

## Events

| Event               | Description                                     |
|---------------------|-------------------------------------------------|
| `error`             | fired when shaka player errors                  |
| `init-shaka-player` | fired when shaka player is initialized          |
| `manifest-loaded`   | fired when shaka player loads the manifest file |

## CSS Custom Properties

| Property                          | Description                                      |
|-----------------------------------|--------------------------------------------------|
| `--shaka-player-background-color` | The background color of the video element. Default: `black` |
| `--shaka-player-object-fit`       | object-fit property of the video element. Default: `initial` |
| `--shaka-player-video-height`     | height property of the video element. Default: `auto` |
| `--shaka-player-video-width`      | width property of the video element. Default: `100%` |
