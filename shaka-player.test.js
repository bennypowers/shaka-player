import './shaka-player';
import 'shaka-player';

import { spy } from 'sinon';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';

let element;
function assertProps(props) {
  return async function() {
    await element.updateComplete;
    Object.entries(props).forEach(([name, value]) => expect(element[name]).to.equal(value));
  };
}

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

function assertFired(eventType) {
  return async function() {
    expect(await events.get(eventType), eventType).to.be.an.instanceof(Event);
  };
}

export function awaitEvent(eventType) {
  return async function() {
    await events.get(eventType);
  };
}

describe('<shaka-player>', function() {
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

  describe('when setting dashManifest', function() {
    beforeEach(setup);
    beforeEach(listenFor('manifest-loaded'));
    beforeEach(setProps({ dashManifest: 'http://amssamples.streaming.mediaservices.windows.net/683f7e47-bd83-4427-b0a3-26a6c4547782/BigBuckBunny.ism/manifest(format=mpd-time-csf)' }));
    it('loads the manifest', assertFired('manifest-loaded'));
    it('loads the manifest', assertProps({ loading: false }));
    describe('then resetting dashManifest', function() {
      beforeEach(listenFor('manifest-loaded'));
      beforeEach(setProps({ dashManifest: 'http://rdmedia.bbc.co.uk/dash/ondemand/bbb/2/client_manifest-common_init.mpd' }));
      beforeEach(awaitEvent('manifest-loaded'));
      it('loads the manifest', assertFired('manifest-loaded'));
    });
  });
});
