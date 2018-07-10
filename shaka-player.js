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

/**
 * `<shaka-player\>`
 * Custom element wrapper for google&#39;s Shaka Player
 *
 * ### Styling
 *
 * The following custom properties and mixins are available for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--shaka-player-background-color` | The background color of the video element | `black`
 * `--shaka-player-video-height` | height property of the video element | `auto`
 * `--shaka-player-video-width` | width property of the video element | `100%`
 * `--shaka-player-object-fit` | object-fit property of the video element | `initial`
 *
 * @customElement
 * @demo demo/index.html
 */
class ShakaPlayer extends LitElement {
  /**
   * Renders the template
   * @return {TemplateResult}
   * @protected
   */
  _render({autoplay, controls, muted, poster, preload}) {
    return html`
    <style>
      :host {
        display: block;
        position: relative;
      }

      video {
        background-color: var(--shaka-player-background-color, black);
        display: block;
        height: var(--shaka-player-video-height, auto);
        object-fit: var(--shaka-player-object-fit, initial);
        position: relative;
        width: var(--shaka-player-video-width, 100%);
      }

    </style>

    <video id="video"
        autoplay?="${ autoplay }"
        controls?="${ controls }"
        muted="${ muted }"
        on-canplaythrough="${ event => this.loading = false }"
        on-ended="${ event => this.onEnded(event) }"
        on-error="${ event => this.onError(event) }"
        on-fullscreenchange="${ event => this.loading = true }"
        on-loadedmetadata="${ event => this.loading = true }"
        on-loadstart="${ event => this.loading = true }"
        on-mozfullscreenchange="${ event => this.loading = true }"
        on-pause="${ event => this.onPause(event) }"
        on-play="${ event => this.onPlay(event) }"
        on-seeking="${ event => this.onLoadstart(event) }"
        on-volumechange="${ event => {
          this.muted = event.target.muted;
          this.volume = event.target.volume;
        } }"
        on-webkitfullscreenchange="${ event => this.onFullscreenchange(event) }"
        poster$="${ poster }"
        preload$="${ preload }"
    ></video>`;
  }

  /**
   * Whether shaka player should use cookies for CORS requests.
   * @type {Boolean}
   */
  get allowCrossSiteCredentials() {
    return this.__allowCrossSiteCredentials == null
      ? this.hasAttribute('allow-cross-site-credentials')
      : this.__allowCrossSiteCredentials;
  }

  set allowCrossSiteCredentials(value) {
    this.__allowCrossSiteCredentials = value;
  }

  /**
   * The currentTime of the video in seconds.
   * @type {Number}
   */
  get currentTime() {
    return this.video && this.video.currentTime || 0;
  }

  set currentTime(val) {
    if (!this.video) return;
    this.video.currentTime = val;
  }

  /**
   * URI of the dash manifest.
   * @type {String}
   */
  get dashManifest() {
    return this._getProperty('dashManifest');
  }

  set dashManifest(dashManifest) {
    this._setProperty('dashManifest', dashManifest);
    this.loadManifest(dashManifest);
  }

  /**
   * The duration of the video in seconds.
   * @type {Number}
   */
  get duration() {
    return this.video && this.video.duration || 0;
  }

  /**
   * Whether or not the video playback has ended.
   * @type {Boolean}
   */
  get ended() {
    return this.video && this.video.ended;
  }

  /**
   * URI of hls manifest.
   * @type  {String}
   */
  get hlsManifest() {
    return this._getProperty('hlsManifest');
  }

  set hlsManifest(hlsManifest) {
    this._setProperty('hlsManifest', hlsManifest);
    this.loadVideo(hlsManifest);
  }

  /**
   * Whether the video is paused.
   * @type {Boolean}
   */
  get paused() {
    return this.video && this.video.paused;
  }

  /**
   * Whether the player is playing.
   * @type {Boolean}
   */
  get playing() {
    return (
      this.loading !== true &&
      this.currentTime > 0 &&
      !this.paused &&
      !this.ended
    );
  }

  /**
   * Ready state of the video element.
   * see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
   */
  get readyState() {
    return this.video && this.video.readyState || 0;
  }

  /**
   * The src URL for the video file.
   * @type {String}
   */
  get src() {
    return this._getProperty('src');
  }

  set src(src) {
    this._setProperty('src', src);
    return this.loadVideo(src);
  }

  /**
   * The underlying video element.
   * @type {HTMLVideoElement}
   */
  get video() {
    return (this.shadowRoot && typeof this.shadowRoot.querySelector === 'function')
      ? this.shadowRoot.querySelector('video')
      : undefined;
  }

  static get properties() {
    return {

      /** If autoplay is enabled. */
      autoplay: Boolean,

      /** If video controls are shown. */
      controls: Boolean,

      /** Whether or not the video is muted. */
      muted: Boolean,

      /** The src URL for the poster frame. */
      poster: String,

      /** Video element preload value. */
      preload: String,

      /** Whether or not the video is loading */
      loading: Boolean,

    };
  }

  /** @protected */
  constructor() {
    super();

    /**
     * Whether the video should auto-play.
     * @type {Boolean}
     */
    this.autoplay = false;

    /**
     * Whether to display controls over the video.
     * @type {Boolean}
     */
    this.controls = false;

    /**
     * Whether the video is loading.
     * @type {Boolean}
     */
    this.loading = false;

    /**
     * Whether the video should be muted.
     * @type {Boolean}
     */
    this.muted = false;

    /**
     * Video preload attribute.
     * see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
     * @type {'none'|'metadata'|'auto'|''}
     */
    this.preload = 'metadata';

    /**
     * The volume level of the video.
     * @type {Number}
     */
    this.volume = 1;
  }

  /** @protected */
  connectedCallback() {
    super.connectedCallback();
    this.onFullscreenchange();
    document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this));
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();
  }

  /** @protected */
  _firstRendered() {
    this.initPlayer();
  }

  /**
   * Dispatches playing-changed event, watches for changed sources
   *
   * @protected
   */
  updateProperties() {
    const value = this.playing;
    if (this.__playing !== value) {
      this.dispatchEvent(customEvent('playing-changed', {value}));
    }

    this.__playing = value;
    this.requestTimeFrame();
  }

  /**
   * Creates a Player instance and attaches it to the element.
   *
   * @protected
   */
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
    this.dispatchEvent(customEvent('init-shaka-player', player));
  }

  /**
   * Updates currentTime on animation frame.
   * @return {any}
   * @protected
   */
  requestTimeFrame() {
    return requestAnimationFrame(
      timestamp => {
        const {currentTime: value, ended, paused} = this.video;
        this.dispatchEvent(customEvent('current-time-changed', {value}));
        if (paused || ended) return;
        this.requestTimeFrame();
      }
    );
  }

  /**
   * Load a manifest URL into shaka player.
   * @param  {String}  manifestUri
   * @param  {Object}  [player=this.player] handle on shaka player instance
   * @return {Promise}  Resolved when the manifest has been loaded and playback has begun; rejected when an error occurs or the call was interrupted by destroy(), unload() or another call to load().
   */
  async loadManifest(manifestUri, player = this.player) {
    if (!player) throw new Error('Could not load player');
    if (!manifestUri) return;
    // If another load was in progress, wait for it to complete.
    await this.loadManifestPromise || Promise.resolve();
    // If the player is already initialized, unload it's sources.
    if (player.getManifest()) await player.unload();
    return this.load(manifestUri);
  }

  /**
   * Load a Manifest.
   *
   * @param  {String}  manifestUri
   * @param  {number}  [startTime] Optional start time, in seconds, to begin playback. Defaults to 0 for VOD and to the live edge for live. Set a positive number to start with a certain offset the beginning. Set a negative number to start with a certain offset from the end. This is intended for use with live streams, to start at a fixed offset from the live edge.
   * @param  {shakaExtern.ManifestParser.Factory} [manifestParserFactory] Optional manifest parser factory to override auto-detection or use an unregistered parser.
   * @param  {Object}  [player=this.player] handle on shaka player instance
   * @return {Promise}  Resolved when the manifest has been loaded and playback has begun; rejected when an error occurs or the call was interrupted by destroy(), unload() or another call to load().
   */
  async load(
    manifestUri,
    startTime,
    manifestParserFactory,
    player=this.player
  ) {
    this.loadManifestPromise = player.load(manifestUri)
      .then(this.onManifestLoaded.bind(this))
      .catch(this.onPlayerLoadError.bind(this));
    return this.loadManifestPromise;
  }

  /**
   * Unload the current manifest and make the Player available for re-use.
   * @param  {boolean} [reinitializeMediaSource=true]  If true, start reinitializing MediaSource right away. This can improve load() latency for MediaSource-based playbacks. Defaults to true.
   * @return {Promise}                                 If reinitializeMediaSource is false, the Promise is resolved as soon as streaming has stopped and the previous content, if any, has been unloaded. If reinitializeMediaSource is true or undefined, the Promise resolves after MediaSource has been subsequently reinitialized.
   */
  unload(reinitializeMediaSource=true) {
    return this.player.unload(reinitializeMediaSource);
  }

  /**
   * Dispatches 'manifest-loaded' event.
   *
   * @protected
   * @fires 'manifest-loaded'
   * @param  {any} loaded
   */
  onManifestLoaded(loaded) {
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

  /** EVENT LISTENERS */

  /**
   * Sets loading property when a playback error occurs.
   * @param  {Event} event error event
   * @protected
   */
  onError(event) {
    this.loading = false;
    this.dispatchEvent(event);
    this.dispatchEvent(customEvent('playing-changed', {value: this.playing}));
  }

  /**
   * Updates Properties when playback ends.
   * @param  {Event} event ended event
   * @protected
   */
  onEnded(event) {
    this.dispatchEvent(customEvent('playing-changed', {value: this.playing}));
  }

  /**
   * Updates fullscreen property when fullscreen changes.
   * @param  {Event} event fullscreenchange event
   * @protected
   */
  onFullscreenchange(event) {
    this.fullscreen = !!(
      document.fullscreen ||
      document.fullscreenElement
    );
  }

  /**
   * Updates properties when loading starts
   * @param  {Event} event loadstart event
   * @protected
   */
  onLoadstart(event) {
    this.loading = true;
  }

  /**
   * Updates properties on pause.
   * @param  {Event} event pause event
   * @protected
   */
  onPause(event) {
    this.dispatchEvent(customEvent('playing-changed', {value: this.playing}));
  }

  /**
   * Updates properties on play.
   * @param  {Event} event play event
   * @protected
   */
  onPlay(event) {
    this.dispatchEvent(customEvent('playing-changed', {value: this.playing}));
  }

  /**
   * Handles load errors.
   * @param  {Error} error
   * @param  {String} [src=this.src] video uri
   * @return {String|Promise}
   * @protected
   */
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
}

customElements.define('shaka-player', ShakaPlayer);
