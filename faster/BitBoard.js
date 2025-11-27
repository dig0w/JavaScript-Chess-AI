export class BitBoard {
    constructor(hi = 0, lo = 0) {
        // Always store unsigned 32-bit
        this.hi = hi >>> 0;
        this.lo = lo >>> 0;
    }

    clone() {
        return new BitBoard(this.hi, this.lo);
    }
    
    // --- core operations ---
    clearBit(sq) {
        if (sq < 32) this.lo &= ~(1 << sq);
        else         this.hi &= ~(1 << (sq-32));
    }

    setBit(sq) {
        if (sq < 32) this.lo |= (1 << sq);
        else         this.hi |= (1 << (sq-32));
    }


    and(b) { return new BitBoard(this.hi & b.hi, this.lo & b.lo); }
    or(b)  { return new BitBoard(this.hi | b.hi, this.lo | b.lo); }
    xor(b) { return new BitBoard(this.hi ^ b.hi, this.lo ^ b.lo); }
    not()  { return new BitBoard(~this.hi, ~this.lo); }

    // --- shifting (64-bit safe) ---
    shiftLeft(n) {
        if (n === 0) return new BitBoard(this.hi, this.lo);
        if (n < 32) {
            return new BitBoard(
                (this.hi << n) | (this.lo >>> (32 - n)),
                this.lo << n
            );
        }
        return new BitBoard(this.lo << (n - 32), 0);
    }

    shiftRight(n) {
        if (n === 0) return new BitBoard(this.hi, this.lo);
        if (n < 32) {
            return new BitBoard(
                this.hi >>> n,
                (this.lo >>> n) | (this.hi << (32 - n))
            );
        }
        return new BitBoard(0, this.hi >>> (n - 32));
    }

    // --- useful checks ---
    has(sq) {
        if (sq < 32) return (this.lo & (1 << sq)) !== 0;
        else return (this.hi & (1 << (sq - 32))) !== 0;
    }
    isZero() { return (this.hi | this.lo) === 0; }

    // position of single bit → returns square index 0..63
    bitIndex() {
        if (this.hi) return 32 + 31 - Math.clz32(this.hi);
        if (this.lo) return 31 - Math.clz32(this.lo);
        return -1;
    }

    // return debug binary string
    toBinary() {
        return (
            this.hi.toString(2).padStart(32,"0") +
            this.lo.toString(2).padStart(32,"0")
        );
    }
}