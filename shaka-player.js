import shaka from 'shaka-player';
import {LitElement, html} from '@polymer/lit-element';

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

const computePlaying = ({currentTime, paused, ended}) =>
  currentTime > 0 && !paused && !ended;

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
  _render({autoplay, controls, poster, preload}) {
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
        on-volumechange="${ event => {
          this.muted = event.target.muted;
          this.volume = event.target.volume;
        } }"
        on-webkitfullscreenchange="${ event => this.onFullscreenchange(event) }"
        poster$="${ poster }"
        preload?="${ preload }"
    ></video>`;
  }

  get video() {
    return this.$('video');
  }

  get currentTime() {
    const {currentTime = 0} = this.video || {};
    return currentTime;
  }

  set currentTime(val) {
    if (!this.shadowRoot) return;
    this.video.currentTime = val;
  }

  get allowCrossSiteCredentials() {
    return this.hasAttribute('allow-cross-site-credentials');
  }

  set allowCrossSiteCredentials(value) {
    value
      ? this.setAttribute('allow-cross-site-credentials', '')
      : this.removeAttribute('allow-cross-site-credentials');
  }

  static get properties() {
    return {

      /** If shaka player should use cookies for CORS requests. */
      allowCrossSiteCredentials: Boolean,

      /** If autoplay is enabled. */
      autoplay: Boolean,

      /** If video controls are shown. */
      controls: Boolean,

      /** URL to dash manifest. */
      dashManifest: String,

      /** The duration of the video in milliseconds. */
      duration: Number,

      /** Whether or not the video playback has ended */
      ended: Boolean,

      /** URL to hls manifest. */
      hlsManifest: String,

      /** Whether or not the video is loading */
      loading: Boolean,

      /** Whether or not the video is muted. */
      muted: Boolean,

      /** If the video is paused. */
      paused: Boolean,

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
    this.playing = false;
    this.preload = 'metadata';
    this.volume = 1;
  }

  connectedCallback() {
    super.connectedCallback();
    this.onFullscreenchange();
    document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this));
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();
    // Initialize player
    this.initPlayer();
  }

  _shouldRender(props, changedProps, prevProps) {
    const {player, playing} = this;
    const {dashManifest, hlsManifest, src} = changedProps;
    const {dashManifest: prevDash, hlsManifest: prevHls, src: prevSrc} =
      prevProps;

    const hasSources = !!(dashManifest || hlsManifest || src);
    const dashChanged = dashManifest !== prevDash;
    const hlsChanged = hlsManifest !== prevHls;
    const srcChanged = src !== prevSrc;

    // If the source is a regular video file, load it and quit.
    if (srcChanged && !dashChanged && !hlsChanged) return this.loadVideo(src);

    const hasNewSources = !!( dashChanged || hlsChanged );

    hasNewSources && this.video &&
    this.sourcesChanged({dashManifest, hlsManifest, player, playing});

    return (hasSources && hasNewSources);
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  /** Creates a Player instance and attaches it to the element. */
  initPlayer() {
    if (!this.video) throw new Error('Trying to initialize a player without a video element.');

    // Check to see if the browser supports the basic APIs Shaka needs.
    const supported = shaka.Player.isBrowserSupported();
    if (!supported) return this.loadVideo(this.hlsManifest || this.src);

    const {MANIFEST} = shaka.net.NetworkingEngine.RequestType;

    const escapeManifestUrlsFilter = (type, request) =>
      request.uris =
          type === MANIFEST ? escapeUrls(request.uris)
        : request.uris;

    const enableCookiesRequestFilter = (type, request) =>
      request.allowCrossSiteCredentials = !!this.allowCrossSiteCredentials;

    const player = new shaka.Player(this.video);

    const engine = player.getNetworkingEngine();
          engine.registerRequestFilter(enableCookiesRequestFilter);
          engine.registerRequestFilter(escapeManifestUrlsFilter);

    this.player = player;
    this.dispatchEvent(customEvent('init-shaka-player'), player);
    this.sourcesChanged(this);
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
    this.currentTime = this.video.currentTime;
    if (!this.playing) return;
    this.requestTimeFrame();
  }

  async sourcesChanged({dashManifest, hlsManifest, player, playing}) {
    shaka.Player.isBrowserSupported()
      ? this.loadManifest(dashManifest)
      : this.loadVideo(hlsManifest);
    this.requestTimeFrame();
  }

  /**
   * Load a manifest URL into shaka player.
   * @param  {String}  manifestUrl
   * @param  {Object}  player
   * @return {Promise}
   */
  async loadManifest(manifestUrl, player = this.player) {
    if (!player) throw new Error('Could not load player');
    const manifestLoaded = loaded => this.manifestLoaded(loaded);
    const handleError = error => this.onPlayerLoadError(error);

    // If the player is already initialized, unload it's sources.
    if (player.getManifest()) player.unload();

    await this.loadManifestPromise || Promise.resolve();

    const loadManifestPromise = player.load(manifestUrl);

    this.loadManifestPromise = loadManifestPromise;

    loadManifestPromise
      .then(manifestLoaded)
      .catch(handleError);

    return loadManifestPromise;
  }

  manifestLoaded(loaded) {
    this.dispatchEvent(customEvent('manifest-loaded', loaded));
  }

  /**
   * Load a regular video URL.
   * @param  {String} url
   * @return {any}
   */
  loadVideo(url) {
    if (!url) return this.loading = false;
    this.video.src = url;
  }

  /**
   * Pauses the player.
   * @return {any}
   */
  pause() {
    const video = this.video;
    return video && video.pause();
  }

  /**
   * Plays the player
   * @return {Promise}
   */
  play() {
    const video = this.video;
    return video ? video.play() : Promise.reject('No Player');
  }

  setPlaying() {
    const {currentTime, ended, paused} = this.video || {};
    this.paused = paused;
    this.ended = ended;
    this.playing = computePlaying({currentTime, ended, paused});
  }

  /** EVENT LISTENERS */

  onCanplaythrough(event) {
    this.loading = false;
  }

  onDurationchange(event) {
    const video = this.video || {duration: 0};
    this.duration = video.duration;
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

  onPlayerLoadError(error, src = this.src) {
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
    const video = this.video || {};
    this.readyState = video.readyState;
  }

  onTimeupdate(event) {
    this.currentTime = event.target.currentTime;
    this.setPlaying();
  }
}

customElements.define('shaka-player', ShakaPlayer);
