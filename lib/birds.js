export const identity = x => x;

export const constant = x => () => x;

export const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)));
