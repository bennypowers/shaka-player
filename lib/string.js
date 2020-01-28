import { memoize } from '@pacote/memoize';
import eagerDash from '@lavadrop/kebab-case';

import { compose, identity } from './birds';


/** camelCase a string */
// const camel = memoize(identity, eagerCamel);

/** dash-case a string */
export const dash = memoize(identity, eagerDash);

const toString = a => a.toString();

const urlOf = x => new URL(x);

const escapeUrlPathname = url => {
  url.pathname = escape(url.pathname);
  return url;
};

export const escapeUrls = urls => urls
  .map(compose(toString, escapeUrlPathname, urlOf));
