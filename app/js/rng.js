window.PETQ = window.PETQ || {};

(function () {
  var state = 0;
  var seeded = false;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var nextRand = null;

  function ensureInit() {
    if (!seeded) {
      seed(Date.now());
    }
  }

  function seed(n) {
    state = n >>> 0;
    nextRand = mulberry32(state);
    seeded = true;
  }

  function rand() {
    ensureInit();
    return nextRand();
  }

  function randInt(min, max) {
    return Math.floor(rand() * (max - min + 1)) + min;
  }

  function pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[randInt(0, arr.length - 1)];
  }

  function d4() {
    return randInt(1, 4);
  }

  window.PETQ.rng = {
    seed: seed,
    rand: rand,
    randInt: randInt,
    pick: pick,
    d4: d4
  };
})();
