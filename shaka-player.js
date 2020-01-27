import eagerDash from '@lavadrop/kebab-case';
// import eagerCamel from '@lavadrop/camel-case';
import { memoize } from '@pacote/memoize';

const identity = x => x;
const constant = x => () => x;

/** camelCase a string */
// const camel = memoize(identity, eagerCamel);

/** dash-case a string */
const dash = memoize(identity, eagerDash);

import { LitElement, html, css } from 'lit-element';

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
  new CustomEvent(type, { detail });

const errorEvent = error =>
  new ErrorEvent('error', { error });

/**
 * Custom element wrapper for google&#39;s Shaka Player
 *
 * ## Usage
 * ```html
 * <shaka-player
 *   autoplay
 *   controls
 *   dash-manifest="http://rdmedia.bbc.co.uk/dash/ondemand/bbb/2/client_manifest-common_init.mpd"
 * ></shaka-player>
 * ```
 *
 * @element shaka-player
 *
 * @cssprop [--shaka-player-background-color] - The background color of the video element. Default: `black`
 * @cssprop [--shaka-player-video-height] - height property of the video element. Default: `auto`
 * @cssprop [--shaka-player-video-width] - width property of the video element. Default: `100%`
 * @cssprop [--shaka-player-object-fit] - object-fit property of the video element. Default: `initial`
 *
 * @fires 'init-shaka-player' - fired when shaka player is initialized
 * @fires 'manifest-loaded' - fired when shaka player loads the manifest file
 * @fires 'error' - fired when shaka player errors
 */
class ShakaPlayer extends LitElement {
  static get is() {
    return 'shaka-player';
  }

  static get styles() {
    return css`
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
    `;
  }

  static get properties() {
    return {

      /** Whether shaka player should use cookies for CORS requests. */
      allowCrossSiteCredentials: {
        type: Boolean,
        reflect: true,
        attribute: 'allow-cross-site-credentials',
      },

      /**
       * Whether the video should auto-play.
       * @type {boolean}
       */
      autoplay: { type: Boolean },

      /**
       * Whether to display controls over the video.
       * @type {boolean}
       */
      controls: { type: Boolean },

      /** Video's current time */
      currentTime: { type: Number },

      /** URL to the MPEG-DASH manifest */
      dashManifest: { type: String, attribute: 'dash-manifest', reflect: true },

      /** URL to the HLS manifest */
      hlsManifest: { type: String, attribute: 'hls-manifest', reflect: true },

      /** Whether the video is muted. */
      muted: { type: Boolean },

      /** Whether the video is playing. */
      playing: { type: Boolean },

      /** The src URL for the poster frame. */
      poster: { type: String },

      /** Video element preload value. */
      preload: { type: String },

      /** Whether the video is loading */
      loading: { type: Boolean },

      /** URL to a video file */
      src: { type: String },

    };
  }

  /**
   * Whether the video can play.
   * @type {boolean}
   * @readonly
   */
  get canPlay() {
    return !!(
      this.video &&
      this.video.readyState > 0
    );
  }

  /**
   * The currentTime of the video in seconds.
   * @type {number}
   */
  get currentTime() {
    return this.video && this.video.currentTime || 0;
  }

  set currentTime(val) {
    if (!this.video) return;
    this.video.currentTime = val;
  }

  /**
   * The duration of the video in seconds.
   * @type {number}
   * @readonly
   */
  get duration() {
    return this.video && this.video.duration || 0;
  }

  /**
   * Whether or not the video playback has ended.
   * @type {boolean}
   * @readonly
   */
  get ended() {
    return !!(this.video && this.video.ended);
  }

  /**
   * Whether the video is paused.
   * @type {boolean}
   * @readonly
   */
  get paused() {
    return !!(this.video && this.video.paused);
  }

  /**
   * Whether the video is playing.
   * @type {boolean}
   * @readonly
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
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
   * @readonly
   */
  get readyState() {
    return this.video && this.video.readyState || 0;
  }

  /**
   * The underlying video element.
   * @type {HTMLVideoElement}
   * @readonly
   * @private
   */
  get video() {
    return this.shadowRoot.querySelector('video');
  }

  constructor() {
    super();
    this.autoplay = false;

    /**
     * Whether the video is loading.
     * @type {boolean}
     */
    this.loading = false;

    /**
     * Whether the video should be muted.
     * @type {boolean}
     */
    this.muted = false;

    /**
     * The Shaka Player instance
     * @type {shaka.Player}
     */
    this.player;

    /**
     * Video preload attribute.
     * see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
     * @type {'none'|'metadata'|'auto'|''}
     */
    this.preload = 'metadata';

    /**
     * The volume level of the video.
     * @type {number}
     */
    this.volume = 1;

    /** @ignore */ this.notify = this.notify.bind(this);
    /** @ignore */ this.onManifestLoaded = this.onManifestLoaded.bind(this);
    /** @ignore */ this.onPlayerLoadError = this.onPlayerLoadError.bind(this);
    /** @ignore */ this.onFullscreenchange = this.onFullscreenchange.bind(this);
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();
  }

  /** @protected */
  connectedCallback() {
    super.connectedCallback();
    this.onFullscreenchange();
    document.addEventListener('fullscreenchange', this.onFullscreenchange);
  }

  /**
   * Renders the template
   * @return {TemplateResult}
   * @protected
   */
  render() {
    return html`
      <video id="video"
          .autoplay="${this.autoplay}"
          .controls="${this.controls}"
          .muted="${this.muted}"
          @canplaythrough="${this.onCanplaythrough}"
          @ended="${this.onEnded}"
          @error="${this.onError}"
          @fullscreenchange="${this.onLoadstart}"
          @loadedmetadata="${this.onLoadstart}"
          @loadstart="${this.onLoadstart}"
          @mozfullscreenchange="${this.onLoadstart}"
          @pause="${this.onPause}"
          @play="${this.onPlay}"
          @seeking="${this.onLoadstart}"
          @volumechange="${this.onVolumechange}"
          @webkitfullscreenchange="${this.onFullscreenchange}"
          poster="${this.poster}"
          preload="${this.preload}"
      ></video>
    `;
  }

  /** @protected */
  firstUpdated() {
    this.initPlayer();
    Object.keys(this.constructor.properties)
      .forEach(this.notify);
  }

  notify(property) {
    const value = this[property];
    this.dispatchEvent(customEvent(`${dash(property)}-changed`, { value }));
  }

  /** @inheritdoc */
  updated(changed) {
    [...changed.keys()].forEach(this.notify);
    if (changed.has('dashManifest')) this.loadManifest(this.dashManifest);
    if (changed.has('hlsManifest')) this.loadVideo(this.hlsManifest);
    if (changed.has('src')) this.loadVideo(this.src);
    if (changed.has('playing')) this.requestTimeFrame();
  }

  /**
   * Creates a Player instance and attaches it to the element.
   *
   * @private
   */
  initPlayer() {
    if (!this.video) throw new Error('Trying to initialize a player without a video element.');

    // Check to see if the browser supports the basic APIs Shaka needs.
    this.isBrowserSupported = shaka.Player.isBrowserSupported();
    if (!this.isBrowserSupported) return;

    const { MANIFEST } = shaka.net.NetworkingEngine.RequestType;

    const escapeManifestUrlsFilter = (type, request) =>
      request.uris =
          type === MANIFEST ? escapeUrls(request.uris) :
        request.uris;

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
   * @private
   */
  requestTimeFrame() {
    return requestAnimationFrame(
      timestamp => {
        const { currentTime: value, ended, paused } = this.video;
        this.dispatchEvent(customEvent('current-time-changed', { value }));
        if (paused || ended) return;
        this.requestTimeFrame();
      }
    );
  }

  /**
   * Load a manifest URL into shaka player.
   * @param  {string}  manifestUri
   * @return {Promise}  Resolved when the manifest has been loaded and playback has begun; rejected when an error occurs or the call was interrupted by destroy(), unload() or another call to load().
   */
  async loadManifest(manifestUri) {
    if (!this.player) throw new Error('Could not load player');
    if (!manifestUri) return;
    // If the player is already initialized, unload it's sources.
    if (this.player.getManifest()) await this.unload();
    return this.load(manifestUri);
  }

  /**
   * Load a Manifest.
   *
   * @param  {string}  manifestUri
   * @param  {number}  [startTime] Optional start time, in seconds, to begin playback. Defaults to 0 for VOD and to the live edge for live. Set a positive number to start with a certain offset the beginning. Set a negative number to start with a certain offset from the end. This is intended for use with live streams, to start at a fixed offset from the live edge.
   * @param  {string}  [manifestMimeType] Optional mimetype registered using `shaka.media.ManifestParser.register(mimeType, ParserClass)`
   * @return {Promise} Resolved when the manifest has been loaded and playback has begun; rejected when an error occurs or the call was interrupted by destroy(), unload() or another call to load().
   */
  async load(manifestUri, startTime, manifestMimeType) {
    const { player } = this;
    await this.loadPromise;
    await this.playPromise;
    this.loadPromise = player.load(manifestUri, startTime, manifestMimeType)
      .then(this.onManifestLoaded)
      .catch(this.onPlayerLoadError);
    return this.loadPromise;
  }

  /**
   * Unload the current manifest and make the Player available for re-use.
   * @param  {boolean} [reinitializeMediaSource=true]  If true, start reinitializing MediaSource right away. This can improve load() latency for MediaSource-based playbacks. Defaults to true.
   * @return {Promise<void>}                                 If reinitializeMediaSource is false, the Promise is resolved as soon as streaming has stopped and the previous content, if any, has been unloaded. If reinitializeMediaSource is true or undefined, the Promise resolves after MediaSource has been subsequently reinitialized.
   */
  async unload(reinitializeMediaSource = true) {
    await this.loadPromise;
    await this.playPromise;
    return this.player.unload(reinitializeMediaSource);
  }

  /**
   * Load a regular video URL.
   * @param  {string} url
   * @return {any}
   */
  async loadVideo(url) {
    // If another load was in progress, wait for it to complete.
    await this.loadPromise;
    await this.playPromise;
    if (!url) return this.loading = false;
    this.video.src = url;
  }

  /**
   * Pauses the player.
   * @return {any}
   */
  async pause() {
    const { video } = this;
    return video && video.play().then(video.pause.bind(video));
  }

  /**
   * Plays the player.
   *
   * @return {Promise}
   */
  async play() {
    const { video } = this;
    const oldValue = this.playing;
    if (!video) throw new Error('No Player');
    // There may be times when a user tries to call play() when there are no sources available.
    // In that case, `playPromise` must be undefined, in case the user needs to await it.
    // However, we'd still like to pass as much of the behavior through to the video element.
    this.playPromise = this.canPlay ? video.play() : video.play().then(constant(undefined));
    this.requestUpdate('playing', oldValue);
    return this.playPromise;
  }

  /** EVENT LISTENERS */

  /**
   * @private
   * @param  {Event} event
   */
  onCanplaythrough(event) {
    this.loading = false;
  }

  /**
   * Dispatches 'manifest-loaded' event.
   *
   * @protected
   * @fires 'manifest-loaded'
   * @param  {any} loaded
   * @private
   */
  onManifestLoaded(loaded) {
    this.dispatchEvent(customEvent('manifest-loaded', {}));
  }

  /**
   * Sets loading property when a playback error occurs.
   * @param  {Event} event error event
   * @private
   */
  onError(event) {
    this.loading = false;
    this.dispatchEvent(new ErrorEvent(event.type, event));
    this.requestUpdate();
  }

  /**
   * Updates Properties when playback ends.
   * @param  {Event} event ended event
   * @private
   */
  onEnded(event) {
    this.requestUpdate('playing', true);
  }

  /**
   * Updates fullscreen property when fullscreen changes.
   * @param  {Event} event fullscreenchange event
   * @private
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
   * @private
   */
  onLoadstart(event) {
    this.loading = true;
  }

  /**
   * Updates properties on pause.
   * @param  {Event} event pause event
   * @private
   */
  onPause(event) {
    this.requestUpdate('playing', true);
  }

  /**
   * Updates properties on play.
   * @param  {Event} event play event
   * @private
   */
  onPlay(event) {
    this.requestUpdate('playing', false);
  }

  /**
   * Handles load errors.
   * @param  {Error} error
   * @param  {string} [src=this.src] video uri
   * @private
   */
  onPlayerLoadError(error, src = this.src) {
    this.dispatchEvent(errorEvent('error', error));
    // eslint-disable-next-line no-unused-vars
    const { code, category, data, severity } = error;
    const networkError = code === 1002; // HTTP_ERROR
    const videoError = code === 3016; // VIDEO_ERROR
    const manifestError = (code >= 4000 && code < 5000);
    const errorIsFinal = networkError || manifestError || videoError;
    if (errorIsFinal) this.loadVideo(src);
  }

  /**
   * @param  {Event} target
   * @private
   */
  onVolumechange({ target: { muted, volume } }) {
    this.muted = muted;
    this.volume = volume;
  }
}

customElements.define('shaka-player', ShakaPlayer);
