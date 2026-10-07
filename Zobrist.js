// Uses two 32-bit halves (lo & hi), causing much less collisions (or false positives);
// And seeded RNG to prevent different keys for the same position
function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0);
    };
}
const rngLo = mulberry32(0xC0FFEE01);
const rngHi = mulberry32(0x0BADF00D);

const make = n => {
    const lo = new Int32Array(n), hi = new Int32Array(n);
    for (let i = 0; i < n; i++) { lo[i] = rngLo() | 0; hi[i] = rngHi() | 0; }
    return { lo, hi };
};

const piece = make(16 * 64);
const castle = make(16);
const ep = make(8);
const side = make(1);

export const ZOBRIST = {
    pieceLo: piece.lo,
    pieceHi: piece.hi,
    castleLo: castle.lo,
    castleHi: castle.hi,
    epLo: ep.lo,
    epHi: ep.hi,
    sideLo: side.lo[0],
    sideHi: side.hi[0]
};