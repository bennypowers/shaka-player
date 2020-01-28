/* istanbul ignore file */
import 'shaka-player';
import './shaka-player';

import { expect, fixture, html, oneEvent, nextFrame } from '@open-wc/testing';

/** @type {import('./shaka-player').ShakaPlayer} */
let element;
async function setup() {
  element = await fixture(html`<shaka-player></shaka-player>`);
}

function teardown() {
  element = undefined;
  events.clear();
}

function setProps(props) {
  return async function() {
    Object.entries(props).forEach(([name, value]) => {
      element[name] = value;
    });
    await element.updateComplete;
  };
}

const events = new Map();
function listenFor(eventType) {
  return async function() {
    events.set(eventType, oneEvent(element, eventType));
  };
}

async function waitUntilPlayable() {
  return new Promise(resolve => {
    function goAhead() {
      if (element.canPlay) resolve();
      else requestAnimationFrame(goAhead);
    }
    requestAnimationFrame(goAhead);
  });
}

function assertEventFired(eventType) {
  return async function() {
    const event = await events.get(eventType);
    expect(event, eventType).to.be.an.instanceof(Event);
  };
}

export function awaitEvent(eventType) {
  return async function() {
    await events.get(eventType);
  };
}

export function assertEventDetail(eventType, expected) {
  return async function() {
    const { detail } = await events.get(eventType);
    expect(detail, `${eventType} detail`).to.deep.equal(expected);
  };
}

function assertProps(props) {
  return async function() {
    await element.updateComplete;
    Object.entries(props).forEach(([name, value]) => expect(element[name]).to.equal(value));
  };
}

async function pause() {
  return element.pause();
}

async function play() {
  return element.play();
}

async function unload() {
  return element.unload(false);
}

describe('<shaka-player>', function() {
  afterEach(pause);
  afterEach(unload);
  afterEach(teardown);
  describe('by default', function() {
    beforeEach(setup);
    it('instantiates without error', () => {
      expect(element.constructor.is).to.equal('shaka-player');
      expect(() => document.createElement('shaka-player')).to.not.throw;
    });
    it('.canPlay is false', assertProps({ canPlay: false }));
    it('.ended is false', assertProps({ ended: false }));
    it('.playing is false', assertProps({ playing: false }));
    it('.paused is false', assertProps({ paused: true }));
    it('.currentTime is 0', assertProps({ currentTime: 0 }));
    it('.duration is 0', assertProps({ duration: 0 }));
    it('.readyState is 0', assertProps({ readyState: 0 }));
    it('.src is undefined', assertProps({ src: undefined }));
    it('.player is a shaka.Player', function() {
      expect(element.player).to.be.an.instanceof(shaka.Player);
    });
  });

  describe('with `dashManifest` property set', function() {
    beforeEach(setup);
    beforeEach(listenFor('manifest-loaded'));
    listenFor('canplaythrough');
    beforeEach(setProps({ dashManifest: 'http://livesim.dashif.org/livesim/utc_direct-head/testpic_2s/Manifest.mpd' }));
    it('fires `manifest-loaded` event', assertEventFired('manifest-loaded'));
    it('unsets the `loading` property', assertProps({ loading: false }));
    describe('when setting `currentTime` property', function() {
      beforeEach(setProps({ currentTime: 200 }));
      it('sets the video\'s currentTime', assertProps({ currentTime: 200 }));
    });
    describe('when playing', function() {
      beforeEach(awaitEvent('manifest-loaded'));
      beforeEach(waitUntilPlayable);
      beforeEach(listenFor('current-time-changed'));
      beforeEach(play);
      it('fires `current-time-changed` event', assertEventFired('current-time-changed', { value: 0 }));
      it('sets the `playing` property', assertProps({ playing: true }));
      it('unsets the `paused` property', assertProps({ paused: false }));
      describe('then pausing', function() {
        beforeEach(pause);
        beforeEach(nextFrame);
        it('unsets the `playing` property', assertProps({ playing: false }));
        it('sets the `paused` property', assertProps({ paused: true }));
      });
    });
    describe('then resetting dashManifest', function() {
      beforeEach(listenFor('manifest-loaded'));
      beforeEach(setProps({ dashManifest: 'http://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd' }));
      beforeEach(awaitEvent('manifest-loaded'));
      it('fires `manifest-loaded` event', assertEventFired('manifest-loaded'));
    });
  });

  describe('when setting invalid dashManifest', function() {
    beforeEach(setup);
    beforeEach(listenFor('error'));
    beforeEach(setProps({ dashManifest: 'lolhaha' }));
    it('fires the `error` event', assertEventFired('error'));
    it('unsets the `loading` property', assertProps({ loading: false }));
  });
});
