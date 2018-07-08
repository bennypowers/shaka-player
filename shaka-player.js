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
    return this.$('video') || {};
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

  /** @protected */
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

  /** @protected */
  connectedCallback() {
    super.connectedCallback();
    this.onFullscreenchange();
    document.addEventListener('fullscreenchange', this.onFullscreenchange.bind(this));
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();
  }

  /**
   * Dispatches playing-changed event, watches for changed sources
   * @param  {Object} props
   * @param  {Object} changed
   * @param  {Object} old
   * @return {any}
   */
  _didRender(props, changed, old) {
    const {player, playing, video} = this;

    if ('playing' in changed) {
      this.dispatchEvent(customEvent('playing-changed', {value: changed.playing}));
    }

    if (!player || !video) return;

    const {dashManifest, hlsManifest, src} = props;

    const hasSources = !!(dashManifest || hlsManifest || src);

    const dashChanged = changed.dashManifest;
    const hlsChanged = changed.hlsManifest;
    const srcChanged = changed.src;

    // If the source is a regular video file, load it and quit.
    if (srcChanged && !dashChanged && !hlsChanged) return this.loadVideo(src);

    const hasNewSources =
      !!changed.dashManifest ||
      !!changed.hlsManifest;

    if (hasNewSources) {
      this.sourcesChanged({dashManifest, hlsManifest, player, playing});
    }

    return (hasSources && hasNewSources);
  }

  /** @protected */
  _firstRendered() {
    this.initPlayer();
  }

  /**
   * Exposes this.shadowRoot.querySelector as `$`
   *
   * @protected
   * @param  {string} selector
   * @return {Node}
   */
  $(selector) {
    return (this.shadowRoot && typeof this.shadowRoot.querySelector === 'function')
      ? this.shadowRoot.querySelector(selector)
      : undefined;
  }

  /**
   * Updates the paused, ended, and playing properties, and requests further updates.
   *
   * @protected
   */
  updateProperties() {
    const {currentTime, ended, paused} = this.video || {};
    this.paused = paused;
    this.ended = ended;
    this.playing =
      this.loading !== true &&
      currentTime > 0 &&
      !paused &&
      !ended;
    this.requestTimeFrame();
  }

  /**
   * Creates a Player instance and attaches it to the element.
   *
   * @protected
   * @return {any}
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
    this.sourcesChanged(this);
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

  /** @protected */
  async sourcesChanged({dashManifest, hlsManifest, player, playing}) {
    shaka.Player.isBrowserSupported()
      ? this.loadManifest(dashManifest)
      : this.loadVideo(hlsManifest);
    this.requestTimeFrame();
    this.updateProperties();
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
   * Updates properties when video can play through.
   * @param  {Event} event canplaythrough event
   * @protected
   */
  onCanplaythrough(event) {
    this.loading = false;
    this.updateProperties();
  }

  /**
   * Sets the duration property when duration changes.
   * @param  {Event} event durationchange event.
   * @protected
   */
  onDurationchange(event) {
    const video = this.video || {duration: 0};
    this.duration = video.duration;
  }

  /**
   * Sets loading property when a playback error occurs.
   * @param  {Event} event error event
   * @protected
   */
  onError(event) {
    this.loading = false;
    this.updateProperties();
  }

  /**
   * Updates Properties when playback ends.
   * @param  {Event} event ended event
   * @protected
   */
  onEnded(event) {
    this.updateProperties();
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
   * Updates properties when metadata is loaded.
   * @param  {Event} event loadedmetadata event
   * @protected
   */
  onLoadedmetadata(event) {
    this.onDurationchange(event);
  }

  /**
   * Updates properties when loading starts
   * @param  {Event} event loadstart event
   * @protected
   */
  onLoadstart(event) {
    this.loading = true;
    this.updateProperties();
  }

  /**
   * Updates properties on pause.
   * @param  {Event} event pause event
   * @protected
   */
  onPause(event) {
    this.updateProperties();
  }

  /**
   * Updates properties on play.
   * @param  {Event} event play event
   * @protected
   */
  onPlay(event) {
    this.updateProperties();
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

  /**
   * Dispatches a custom event on progress
   * @param  {Event} event progress event
   * @protected
   */
  onProgress(event) {
    const {lengthComputable, loaded, total} = event;
    this.dispatchEvent(new CustomEvent(
      'shaka-player-progress',
      {bubbles, composed, lengthComputable, loaded, total}
    ));
  }

  /**
   * Updates properties on readystatechange.
   * @param  {Event} event readystatechange event
   * @protected
   */
  onReadyStateChange(event) {
    const video = this.video || {};
    this.readyState = video.readyState;
  }
}

customElements.define('shaka-player', ShakaPlayer);
