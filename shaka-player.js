import { LitElement, html } from '@polymer/lit-element/lit-element.js';

const bubbles = true;
const composed = true;

const mapProp = f => prop => obj => (
  obj[prop] ? obj[prop] = f(obj[prop]) : null,
  obj
);

const toString = a => a.toString();

const escapeProp = mapProp(escape);

const newUrl = x => new URL(x);

const escapeUrls = urls => urls
  .map(newUrl)
  .map(escapeProp('pathname'))
  .map(toString);

const customEvent = (type, detail) =>
  new CustomEvent(type, {bubbles, composed, detail});

const errorEvent = error =>
  new ErrorEvent('error', {bubbles, composed, error});

const computePlaying = ({ currentTime, paused, ended }) =>
  currentTime > 0 && !paused && !ended;

const scriptSrc = 'https://cdnjs.cloudflare.com/ajax/libs/shaka-player/2.3.4/shaka-player.compiled.js';

const shakaScript = new Promise((resolve, reject) => {
  const scripts = Array.from(document.head.querySelectorAll('script'))
  if (scripts.some(script => script.src = scriptSrc)) resolve();
  const script = document.createElement('script');
  script.onload = resolve
  script.onerror = reject
  document.head.appendChild(script)
  script.src = scriptSrc;
});


/**
 * `shaka-player`
 * Custom element wrapper for google&#39;s Shaka Player
 *
 * ### Styling
 *
 * The following custom properties and mixins are available for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--elastic-player-background-color` | The background color of the video element | `black`
 *
 * @customElement
 * @demo demo/index.html
 */
class ShakaPlayer extends LitElement {
  _render({ autoplay, controls, poster, preload }) {
    return html`
    <style>
      :host {
        display: block;
        position: relative;
      }

      video {
        background-color: var(--shaka-player-background-color, black);
        display: block;
        height: 100%;
        min-width: 100%;
        object-fit: cover;
        position: relative;
      }

    </style>

    <video id="video"
        autoplay?="${ autoplay }"
        controls?="${ controls }"
        on-canplaythrough="${ event => this.onCanplaythrough(event) }"
        on-durationchange="${ event => this.onDurationchange(event) }"
        on-ended="${ event => this.onEnded(event) }"
        on-error="${ event => this.onError(event) }"
        on-fullscreenchange="${ event => this.onLoadstart(event) }"
        on-loadedmetadata="${ event => this.onLoadstart(event) }"
        on-loadstart="${ event => this.onLoadstart(event) }"
        on-mozfullscreenchange="${ event => this.onLoadstart(event) }"
        on-pause="${ event => this.onPause(event) }"
        on-play="${ event => this.onPlay(event) }"
        on-progress="${ event => this.onProgress(event) }"
        on-readystatechange="${ event => this.onReadyStateChange(event) }"
        on-seeking="${ event => this.onLoadstart(event) }"
        on-timeupdate="${ event => this.onTimeupdate(event) }"
        on-volumechange="${ event => {
          this.muted = event.target.muted;
          this.volume = event.target.volume;
        } }"
        on-webkitfullscreenchange="${ event => this.onFullscreenchange(event) }"
        poster$="${ poster }"
        preload?="${ preload }"
    ></video>`;
  }

  static get properties() {
    return {

      /** If shaka player should use cookies for CORS requests. */
      allowCrossSiteCredentials: Boolean,

      /** If autoplay is enabled. */
      autoplay: Boolean,

      /** If video controls are shown. */
      controls: Boolean,

      /** The current position of the playhead, in seconds. */
      currentTime: Number,

      /** URL to dash manifest. */
      dashManifest: String,

      /** URL to hls manifest. */
      hlsManifest: String,

      /** The duration of the video in milliseconds. */
      duration: Number,

      /** Whether or not the video playback has ended */
      ended: Boolean,

      /** Whether or not the video is loading */
      loading: Boolean,

      /** Whether or not the video is muted. */
      muted: Boolean,

      /** If the video is paused. */
      paused: Boolean,

      /** Handle on shaka player object. */
      player: Object,

      /** Whether or not the player is playing */
      playing: Boolean,

      /** The src URL for the poster frame. */
      poster: String,

      /** Video element preload value. */
      preload: String,

      /**
       * Ready state of the video element.
       * see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
       */
      readyState: Number,

      /** The src URL for the video file. */
      src: String,

      /** Reference to the video element. */
      videoElement: HTMLVideoElement,

      /** The volume level of the video. */
      volume: Number,
    };
  }

  constructor() {
    super();
    this.allowCrossSiteCredentials = false;
    this.autoplay = false;
    this.controls = false;
    this.currentTime = 0;
    this.ended = false;
    this.loading = false;
    this.muted = false;
    this.paused = true;
    this.player = null;
    this.playing = false
    this.preload = 'metadata';
    this.volume = 1;
  }

  static get observers() {
    return [
      'videoSourcesChanged(src, dashManifest, hlsManifest)',
    ];
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector)
  }

  connectedCallback() {
    super.connectedCallback();
    this.allowCrossSiteCredentials = this.hasAttribute('allow-cross-site-credentials') || this.allowCrossSiteCredentials;
    this.onFullscreenchange();
    document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this));
    shakaScript
      .then( () => this.initShaka() )
      .catch(error => this.dispatchEvent(errorEvent(error)))
    }

  requestTimeFrame() {
    requestAnimationFrame(
      timestamp => this.currentTimeFrameCallback(timestamp)
    );
  }

  /**
   * Sets currentTime from video on each frame.
   * @param  {DOMHighResTimeStamp} timestamp
   */
  currentTimeFrameCallback(timestamp) {
    this.currentTime = this.videoElement.currentTime;
    if (!this.playing) return;
    this.requestTimeFrame();
  }

  /** Creates a Player instance and attaches it to the element. */
  async initPlayer() {
    await shakaScript
    const {MANIFEST} = shaka.net.NetworkingEngine.RequestType;
    const video = this.videoElement

    const escapeManifestUrlsFilter = (type, request) =>
      request.uris = type === MANIFEST
        ? escapeUrls(request.uris)
        : request.uris;

    const enableCookiesRequestFilter = (type, request) =>
      request.allowCrossSiteCredentials =
        this.allowCrossSiteCredentials ||
        this.hasAttribute('allow-cross-site-credentials');

    const player = new shaka.Player(video);

    const engine = player.getNetworkingEngine();
          engine.registerRequestFilter(enableCookiesRequestFilter);
          engine.registerRequestFilter(escapeManifestUrlsFilter);

    this.player = player;
    this.dispatchEvent(customEvent('init-shaka-player'), player);
  }

  /**
   * Load a manifest URL into shaka player.
   * @param  {String}  manifestUrl
   */
  loadManifest(manifestUrl) {
    if (!this.player) throw new Error('Could not load player');
    this.player
      .load(manifestUrl)
      .then(detail => this.dispatchEvent(customEvent('shaka-player-loaded', detail)))
      .catch(error => this.onPlayerLoadError(error, this.src));
  }

  /**
   * Load a regular video URL.
   * @param  {String} url
   * @return {any}
   */
  loadVideo(url) {
    if (!url) return this.loading = false;
    this.videoElement.src = url;
  }

  /** Pause the player. */
  pause() {
    return this.videoElement.pause();
  }

  /** Play the player. */
  play() {
    return this.videoElement.play();
  }

  async initShaka() {
    await shakaScript
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();

    // Check to see if the browser supports the basic APIs Shaka needs.
    if (!shaka.Player.isBrowserSupported()) {
      src
        ? this.loadVideo(src)
        : this.dispatchEvent(errorEvent(new Error('Could not load video sources')));
      return true;
    }

    // Initialize shaka player library.
    this.initPlayer();
  }

  async _didRender(props, changedProps, prevProps) {
    this.videoElement = this.$('video');
    const { src, dashManifest, hlsManifest } = changedProps

    if ('playing' in changedProps) this.requestTimeFrame()

    if (
      src === prevProps.src &&
      dashManifest === prevProps.dashManifest &&
      hlsManifest === prevProps.hlsManifest
    ) return;

    const noManifests = (!dashManifest && !hlsManifest);
    if (!src && noManifests) return false;

    this.videoElement.pause();
    this.videoElement.src = '';

    // If the player is already initialized, unload it's sources.
    if (this.player) this.player.unload();

    // If the source is a regular video file, load it and quit.
    if (noManifests) return


    await shakaScript
    const support = await shaka.Player.probeSupport();

    const manifestToLoad = support.manifest.mpd ? dashManifest : hlsManifest;

    // Load the dashManifest.
    this.loadManifest(manifestToLoad);
  }

  setPlaying() {
    const { currentTime, ended, paused } = this.videoElement;
    this.paused = paused;
    this.ended = ended;
    this.playing = computePlaying({ currentTime, ended, paused })
  }

  /** EVENT LISTENERS */

  onCanplaythrough(event) {
    this.loading = false;
  }

  onDurationchange(event) {
    this.duration = this.videoElement.duration;
  }

  onError(event) {
    this.loading = false;
  }

  onEnded(event) {
    this.setPlaying();
  }

  onFullscreenchange(event) {
    this.fullscreen = !!(
      document.fullscreen ||
      document.fullscreenElement
    );
  }

  onLoadedmetadata(event) {
    this.onDurationchange(event);
  }

  onLoadstart(event) {
    this.loading = true;
  }

  onPause(event) {
    this.setPlaying();
  }

  onPlay(event) {
    this.setPlaying();
  }

  onPlayerLoadError(error, src) {
    this.dispatchEvent(errorEvent('error', error));
    // eslint-disable-next-line no-unused-vars
    const {code, category, data, severity} = error;
    const networkError = code === 1002; // HTTP_ERROR
    const videoError = code === 3016; // VIDEO_ERROR
    const manifestError = (code >= 4000 && code < 5000);
    const errorIsFinal = networkError || manifestError || videoError;
    return errorIsFinal ? src && this.loadVideo(src) : undefined;
  }

  onProgress(event) {
    const {lengthComputable, loaded, total} = event;
    this.dispatchEvent(new CustomEvent(
      'shaka-player-progress',
      {bubbles, composed, lengthComputable, loaded, total}
    ));
  }

  onReadyStateChange(event) {
    this.readyState = this.videoElement.readyState;
  }

  onTimeupdate(event) {
    this.currentTime = event.target.currentTime;
    this.setPlaying();
  }
}

customElements.define('shaka-player', ShakaPlayer);
