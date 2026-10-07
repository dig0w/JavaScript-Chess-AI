// Uses 64-square mailbox in a Uint8Array (sq = r * 8 + f, a1 = 0, h8 = 63)
// Piece code = type | (color << 3), (P=1 N=2 B=3 R=4 Q=5 K=6 ; white 1..6, black 9..14 ; 0 = empty)
// Move code = from | (to << 6) | (promoType << 12) | (flag << 15)

import { ZOBRIST } from './Zobrist.js';

export const PAWN = 1, KNIGHT_T = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING_T = 6;
export const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
export const BP = 9, BN = 10, BB = 11, BR = 12, BQ = 13, BK = 14;

export const FLAG_EP = 1, FLAG_CK = 2, FLAG_CQ = 3, FLAG_DP = 4;

const CHARS = '.PNBRQK??pnbrqk'.split('');
const CHAR_TO_PIECE = {};
CHARS.forEach((c, i) => { if (c !== '?' && c !== '.') CHAR_TO_PIECE[c] = i; });

const PROMO_CHAR = ['', '', 'n', 'b', 'r', 'q'];
const PROMO_TYPE = { n: 2, b: 3, r: 4, q: 5 };

// Castling-rights: 1 = white king side, 2 = white queen side, 4 = black king side, 8 = black queen side
const CASTLE_MASK = new Uint8Array(64).fill(15);
CASTLE_MASK[0] = 15 & ~2; CASTLE_MASK[4] = 15 & ~3; CASTLE_MASK[7] = 15 & ~1;
CASTLE_MASK[56] = 15 & ~8; CASTLE_MASK[60] = 15 & ~12; CASTLE_MASK[63] = 15 & ~4;

// Ray tables (N,S,E,W,NE,NW,SE,SW)
const DIR_DF = [0, 0, 1, -1, 1, -1, 1, -1];
const DIR_DR = [1, -1, 0, 0, 1, 1, -1, -1];

const RAYS = DIR_DF.map((df, d) => {
    const perSq = [];
    for (let sq = 0; sq < 64; sq++) {
        const list = [];
        let f = (sq & 7) + df, r = (sq >> 3) + DIR_DR[d];
        while (f >= 0 && f < 8 && r >= 0 && r < 8) { list.push(r * 8 + f); f += df; r += DIR_DR[d]; }
        perSq.push(Int8Array.from(list));
    }
    return perSq;
});

const jumpTable = offsets => {
    const out = [];
    for (let sq = 0; sq < 64; sq++) {
        const list = [];
        for (const [df, dr] of offsets) {
            const f = (sq & 7) + df, r = (sq >> 3) + dr;
            if (f >= 0 && f < 8 && r >= 0 && r < 8) list.push(r * 8 + f);
        }
        out.push(Int8Array.from(list));
    }
    return out;
};
const KNIGHT_MOVES = jumpTable([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]);
const KING_MOVES = jumpTable([[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]);
const PAWN_ATT = [jumpTable([[-1, 1], [1, 1]]), jumpTable([[-1, -1], [1, -1]])];

export const DEFAULT_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

export class ChessEngine {
    static START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    /** @param init  an 8x8 array of piece characters (row 0 = rank 8) or a FEN string */
    constructor(init = DEFAULT_BOARD) {
        this.rows = 8;
        this.cols = 8;
        this.squares = 64;
        this.isNormal = true;

        this.promoPieces = ['q', 'r', 'b', 'n'];
        this.piecePoints = { p: 1, b: 3, n: 3, r: 5, q: 9, k: 0 };

        this.board = new Uint8Array(64);
        this.cnt = new Uint8Array(16);
        this.kingSq = new Int8Array(2).fill(-1);

        this._alloc(1024);

        this.logs = [];
        this.gameCondition = 'PLAYING';
        this.whiteAI = null;
        this.blackAI = null;
        this.renderer = null;

        if (typeof init === 'string') this.loadFEN(init);
        else this._loadBoardArray(init);
    }

    // Setup
    _alloc(cap) {
        this.cap = cap;
        this.uMove = new Int32Array(cap);
        this.uCap = new Uint8Array(cap);
        this.uCastle = new Uint8Array(cap);
        this.uEp = new Int8Array(cap);
        this.uHm = new Int16Array(cap);
        this.posLo = new Int32Array(cap);
        this.posHi = new Int32Array(cap);
    }

    _grow() {
        const old = { m: this.uMove, c: this.uCap, k: this.uCastle, e: this.uEp, h: this.uHm, l: this.posLo, i: this.posHi };
        this._alloc(this.cap * 2);
        this.uMove.set(old.m); this.uCap.set(old.c); this.uCastle.set(old.k); this.uEp.set(old.e);
        this.uHm.set(old.h); this.posLo.set(old.l); this.posHi.set(old.i);
    }

    _loadBoardArray(arr) {
        if (!Array.isArray(arr) || arr.length !== 8 || arr.some(r => r.length !== 8))
            throw new Error('ChessEngine: only 8x8 boards are supported');
        this.board.fill(0);
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const ch = arr[r][c];
                if (ch !== '.' && ch !== ' ' && ch) this.board[(7 - r) * 8 + c] = CHAR_TO_PIECE[ch];
            }
        this.turn = 0;
        this.castle = 15;
        this.enPassantSquare = -1;
        this.halfmoveClock = 0;
        this.totalPlies = 0;
        this._finishSetup();
    }

    _finishSetup() {
        this.cnt.fill(0);
        this.kingSq.fill(-1);

        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (!p) continue;
            this.cnt[p]++;
            if (p === WK) this.kingSq[0] = sq;
            else if (p === BK) this.kingSq[1] = sq;
        }

        // Drop castling rights that the position cannot support
        const b = this.board;
        if (b[4] !== WK) this.castle &= ~3;
        if (b[7] !== WR) this.castle &= ~1;
        if (b[0] !== WR) this.castle &= ~2;
        if (b[60] !== BK) this.castle &= ~12;
        if (b[63] !== BR) this.castle &= ~4;
        if (b[56] !== BR) this.castle &= ~8;

        // An en-passant square only counts if an enemy pawn can actually capture onto it
        if (this.enPassantSquare !== -1) {
            const ep = this.enPassantSquare;
            const attacker = this.turn === 0 ? WP : BP;
            const from = PAWN_ATT[this.turn ^ 1][ep];
            let ok = false;
            for (let i = 0; i < from.length; i++) if (b[from[i]] === attacker) ok = true;
            if (!ok) this.enPassantSquare = -1;
        }

        this.sp = 0;
        this._computeHash();
        this.posLo[0] = this.hashLo;
        this.posHi[0] = this.hashHi;
    }

    _computeHash() {
        let lo = 0, hi = 0;
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p) { lo ^= ZOBRIST.pieceLo[p * 64 + sq]; hi ^= ZOBRIST.pieceHi[p * 64 + sq]; }
        }
        lo ^= ZOBRIST.castleLo[this.castle]; hi ^= ZOBRIST.castleHi[this.castle];
        if (this.enPassantSquare !== -1) { lo ^= ZOBRIST.epLo[this.enPassantSquare & 7]; hi ^= ZOBRIST.epHi[this.enPassantSquare & 7]; }
        if (this.turn === 1) { lo ^= ZOBRIST.sideLo; hi ^= ZOBRIST.sideHi; }
        this.hashLo = lo;
        this.hashHi = hi;
    }

    clone() {
        const c = Object.create(ChessEngine.prototype);
        c.rows = 8; c.cols = 8; c.squares = 64; c.isNormal = true;
        c.promoPieces = this.promoPieces; c.piecePoints = this.piecePoints;
        c.board = this.board.slice();
        c.cnt = this.cnt.slice();
        c.kingSq = this.kingSq.slice();
        c.cap = this.cap;
        c.uMove = this.uMove.slice(); c.uCap = this.uCap.slice(); c.uCastle = this.uCastle.slice();
        c.uEp = this.uEp.slice(); c.uHm = this.uHm.slice();
        c.posLo = this.posLo.slice(); c.posHi = this.posHi.slice();
        c.sp = this.sp;
        c.turn = this.turn; c.castle = this.castle; c.enPassantSquare = this.enPassantSquare;
        c.halfmoveClock = this.halfmoveClock; c.totalPlies = this.totalPlies;
        c.hashLo = this.hashLo; c.hashHi = this.hashHi;
        c.gameCondition = this.gameCondition;
        c.logs = [];
        c.whiteAI = null; c.blackAI = null; c.renderer = null;
        return c;
    }


    // Attacks
    // Is `sq` attacked by a piece of colour `by` (0 = white, 1 = black)?
    isAttacked(sq, by) {
        const b = this.board;
        const o = by << 3;

        let list = PAWN_ATT[by ^ 1][sq];
        for (let i = 0; i < list.length; i++) if (b[list[i]] === (PAWN | o)) return true;

        list = KNIGHT_MOVES[sq];
        for (let i = 0; i < list.length; i++) if (b[list[i]] === (KNIGHT_T | o)) return true;

        list = KING_MOVES[sq];
        for (let i = 0; i < list.length; i++) if (b[list[i]] === (KING_T | o)) return true;

        const rook = ROOK | o, bishop = BISHOP | o, queen = QUEEN | o;
        for (let d = 0; d < 4; d++) {
            const ray = RAYS[d][sq];
            for (let i = 0; i < ray.length; i++) {
                const p = b[ray[i]];
                if (p !== 0) { if (p === rook || p === queen) return true; break; }
            }
        }
        for (let d = 4; d < 8; d++) {
            const ray = RAYS[d][sq];
            for (let i = 0; i < ray.length; i++) {
                const p = b[ray[i]];
                if (p !== 0) { if (p === bishop || p === queen) return true; break; }
            }
        }
        return false;
    }

    // Is the king of colour `us` currently attacked?
    inCheck(us = this.turn) {
        const k = this.kingSq[us];
        return k < 0 ? true : this.isAttacked(k, us ^ 1);
    }


    // Move Generation
    // Writes pseudo-legal moves for the side to move into `list`; returns the count.
    // capsOnly = captures + queen promotions only (for quiescence).
    genMoves(list, capsOnly = false) {
        const b = this.board, us = this.turn, ep = this.enPassantSquare;
        let n = 0;

        for (let sq = 0; sq < 64; sq++) {
            const p = b[sq];
            if (p === 0 || (p >> 3) !== us) continue;
            const t = p & 7;

            if (t === PAWN) {
                const rank = sq >> 3;
                const promoRank = us === 0 ? 6 : 1;
                const att = PAWN_ATT[us][sq];
                for (let i = 0; i < att.length; i++) {
                    const to = att[i], tp = b[to];
                    if (tp !== 0) {
                        if ((tp >> 3) === us) continue;
                        if (rank === promoRank) {
                            list[n++] = sq | (to << 6) | (QUEEN << 12);
                            if (!capsOnly) { list[n++] = sq | (to << 6) | (ROOK << 12); list[n++] = sq | (to << 6) | (BISHOP << 12); list[n++] = sq | (to << 6) | (KNIGHT_T << 12); }
                        } else list[n++] = sq | (to << 6);
                    } else if (to === ep) list[n++] = sq | (to << 6) | (FLAG_EP << 15);
                }
                const fwd = us === 0 ? sq + 8 : sq - 8;
                if (b[fwd] === 0) {
                    if (rank === promoRank) {
                        list[n++] = sq | (fwd << 6) | (QUEEN << 12);
                        if (!capsOnly) { list[n++] = sq | (fwd << 6) | (ROOK << 12); list[n++] = sq | (fwd << 6) | (BISHOP << 12); list[n++] = sq | (fwd << 6) | (KNIGHT_T << 12); }
                    } else if (!capsOnly) {
                        list[n++] = sq | (fwd << 6);
                        if (rank === (us === 0 ? 1 : 6)) {
                            const f2 = us === 0 ? sq + 16 : sq - 16;
                            if (b[f2] === 0) list[n++] = sq | (f2 << 6) | (FLAG_DP << 15);
                        }
                    }
                }
            } else if (t === KNIGHT_T || t === KING_T) {
                const tbl = t === KNIGHT_T ? KNIGHT_MOVES[sq] : KING_MOVES[sq];
                for (let i = 0; i < tbl.length; i++) {
                    const to = tbl[i], tp = b[to];
                    if (tp === 0) { if (!capsOnly) list[n++] = sq | (to << 6); }
                    else if ((tp >> 3) !== us) list[n++] = sq | (to << 6);
                }
            } else {
                const d0 = t === BISHOP ? 4 : 0, d1 = t === ROOK ? 4 : 8;
                for (let d = d0; d < d1; d++) {
                    const ray = RAYS[d][sq];
                    for (let i = 0; i < ray.length; i++) {
                        const to = ray[i], tp = b[to];
                        if (tp === 0) { if (!capsOnly) list[n++] = sq | (to << 6); }
                        else { if ((tp >> 3) !== us) list[n++] = sq | (to << 6); break; }
                    }
                }
            }
        }

        if (!capsOnly && this.castle !== 0) {
            const home = us === 0 ? 4 : 60;
            const bits = us === 0 ? this.castle & 3 : (this.castle >> 2) & 3;
            if (bits && b[home] === (us === 0 ? WK : BK) && !this.isAttacked(home, us ^ 1)) {
                const rook = us === 0 ? WR : BR, them = us ^ 1;
                if ((bits & 1) && b[home + 1] === 0 && b[home + 2] === 0 && b[home + 3] === rook && !this.isAttacked(home + 1, them))
                    list[n++] = home | ((home + 2) << 6) | (FLAG_CK << 15);
                if ((bits & 2) && b[home - 1] === 0 && b[home - 2] === 0 && b[home - 3] === 0 && b[home - 4] === rook && !this.isAttacked(home - 1, them))
                    list[n++] = home | ((home - 2) << 6) | (FLAG_CQ << 15);
            }
        }
        return n;
    }

    // Make & Unmake (no logging, no UI, no end-of-game evaluation)
    // Plays a pseudo-legal move. Returns true if it was legal (and stays on the board);
    // returns false (and leaves the position untouched) if it would leave the mover's king in check.
    makeMove(m) {
        const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
        const b = this.board, us = this.turn;
        const piece = b[from];
        let cap = b[to];

        if (this.sp + 2 >= this.cap) this._grow();
        const i = ++this.sp;
        this.uMove[i] = m;
        this.uCastle[i] = this.castle;
        this.uEp[i] = this.enPassantSquare;
        this.uHm[i] = this.halfmoveClock;

        const PL = ZOBRIST.pieceLo, PH = ZOBRIST.pieceHi;
        let lo = this.hashLo, hi = this.hashHi, k;

        if (this.enPassantSquare >= 0) { const f = this.enPassantSquare & 7; lo ^= ZOBRIST.epLo[f]; hi ^= ZOBRIST.epHi[f]; }

        k = piece * 64 + from; lo ^= PL[k]; hi ^= PH[k];

        if (flag === FLAG_EP) {
            const cs = us === 0 ? to - 8 : to + 8;
            cap = b[cs]; b[cs] = 0;
            k = cap * 64 + cs; lo ^= PL[k]; hi ^= PH[k];
            this.cnt[cap]--;
        } else if (cap !== 0) {
            k = cap * 64 + to; lo ^= PL[k]; hi ^= PH[k];
            this.cnt[cap]--;
        }
        this.uCap[i] = cap;

        let placed = piece;
        if (promo !== 0) {
            placed = promo | (us << 3);
            this.cnt[piece]--; this.cnt[placed]++;
        }
        b[from] = 0;
        b[to] = placed;
        k = placed * 64 + to; lo ^= PL[k]; hi ^= PH[k];

        if (flag === FLAG_CK) {
            const rook = us === 0 ? WR : BR;
            b[from + 3] = 0; b[from + 1] = rook;
            k = rook * 64 + from + 3; lo ^= PL[k]; hi ^= PH[k];
            k = rook * 64 + from + 1; lo ^= PL[k]; hi ^= PH[k];
        } else if (flag === FLAG_CQ) {
            const rook = us === 0 ? WR : BR;
            b[from - 4] = 0; b[from - 1] = rook;
            k = rook * 64 + from - 4; lo ^= PL[k]; hi ^= PH[k];
            k = rook * 64 + from - 1; lo ^= PL[k]; hi ^= PH[k];
        }

        if ((piece & 7) === KING_T) this.kingSq[us] = to;

        const oc = this.castle, nc = oc & CASTLE_MASK[from] & CASTLE_MASK[to];
        if (nc !== oc) {
            lo ^= ZOBRIST.castleLo[oc] ^ ZOBRIST.castleLo[nc];
            hi ^= ZOBRIST.castleHi[oc] ^ ZOBRIST.castleHi[nc];
            this.castle = nc;
        }

        let ep = -1;
        if (flag === FLAG_DP) {
            const enemyPawn = us === 0 ? BP : WP, f = to & 7;
            if ((f > 0 && b[to - 1] === enemyPawn) || (f < 7 && b[to + 1] === enemyPawn)) {
                ep = (from + to) >> 1;
                lo ^= ZOBRIST.epLo[f]; hi ^= ZOBRIST.epHi[f];
            }
        }
        this.enPassantSquare = ep;

        this.halfmoveClock = ((piece & 7) === PAWN || cap !== 0) ? 0 : this.halfmoveClock + 1;

        lo ^= ZOBRIST.sideLo; hi ^= ZOBRIST.sideHi;
        this.turn = us ^ 1;
        this.totalPlies++;
        this.hashLo = lo; this.hashHi = hi;
        this.posLo[i] = lo; this.posHi[i] = hi;

        if (this.isAttacked(this.kingSq[us], us ^ 1)) { this.unmakeMove(); return false; }
        return true;
    }

    unmakeMove() {
        const i = this.sp, m = this.uMove[i];
        const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
        const b = this.board, us = this.turn ^ 1;
        const cap = this.uCap[i];

        let piece = b[to];
        if (promo !== 0) {
            this.cnt[piece]--;
            piece = PAWN | (us << 3);
            this.cnt[piece]++;
        }
        b[from] = piece;
        b[to] = 0;

        if (flag === FLAG_EP) {
            b[us === 0 ? to - 8 : to + 8] = cap; this.cnt[cap]++;
        } else if (cap !== 0) {
            b[to] = cap; this.cnt[cap]++;
        }

        if (flag === FLAG_CK) { b[from + 3] = b[from + 1]; b[from + 1] = 0; }
        else if (flag === FLAG_CQ) { b[from - 4] = b[from - 1]; b[from - 1] = 0; }

        if ((piece & 7) === KING_T) this.kingSq[us] = from;

        this.castle = this.uCastle[i];
        this.enPassantSquare = this.uEp[i];
        this.halfmoveClock = this.uHm[i];
        this.turn = us;
        this.totalPlies--;
        this.sp = i - 1;
        this.hashLo = this.posLo[i - 1];
        this.hashHi = this.posHi[i - 1];
    }

    // Pass the move (null-move pruning)
    makeNullMove() {
        if (this.sp + 2 >= this.cap) this._grow();
        const i = ++this.sp;
        this.uMove[i] = 0;
        this.uCastle[i] = this.castle;
        this.uEp[i] = this.enPassantSquare;
        this.uHm[i] = this.halfmoveClock;
        let lo = this.hashLo, hi = this.hashHi;
        if (this.enPassantSquare >= 0) { const f = this.enPassantSquare & 7; lo ^= ZOBRIST.epLo[f]; hi ^= ZOBRIST.epHi[f]; }
        lo ^= ZOBRIST.sideLo; hi ^= ZOBRIST.sideHi;
        this.enPassantSquare = -1;
        this.turn ^= 1;
        this.totalPlies++;
        this.hashLo = lo; this.hashHi = hi;
        this.posLo[i] = lo; this.posHi[i] = hi;
    }

    undoNullMove() {
        const i = this.sp;
        this.turn ^= 1;
        this.totalPlies--;
        this.enPassantSquare = this.uEp[i];
        this.halfmoveClock = this.uHm[i];
        this.sp = i - 1;
        this.hashLo = this.posLo[i - 1];
        this.hashHi = this.posHi[i - 1];
    }

    // How many times has the current position occurred (including now)?
    repetitions() {
        let count = 1;
        const lo = this.hashLo, hi = this.hashHi;
        const stop = Math.max(0, this.sp - this.halfmoveClock);
        for (let j = this.sp - 2; j >= stop; j -= 2)
            if (this.posLo[j] === lo && this.posHi[j] === hi) count++;
        return count;
    }

    // Dead position by material: K v K, K+minor v K, or only bishops that all stand on the same colour
    isInsufficientMaterial() {
        const c = this.cnt;
        if (c[WP] | c[BP] | c[WR] | c[BR] | c[WQ] | c[BQ]) return false;
        const knights = c[WN] + c[BN], bishops = c[WB] + c[BB];
        if (knights === 0 && bishops <= 1) return true;
        if (knights === 1 && bishops === 0) return true;
        if (knights === 0) {
            let colour = -1;
            for (let sq = 0; sq < 64; sq++) {
                const p = this.board[sq] & 7;
                if (p === BISHOP) {
                    const col = ((sq >> 3) + (sq & 7)) & 1;
                    if (colour === -1) colour = col; else if (colour !== col) return false;
                }
            }
            return true;
        }
        return false;
    }

    hasNonPawnMaterial(isWhite) {
        const o = isWhite ? 0 : 8, c = this.cnt;
        return (c[KNIGHT_T | o] | c[BISHOP | o] | c[ROOK | o] | c[QUEEN | o]) !== 0;
    }


    // Public API (kept compatible with the previous engine)
    _arr(m) {
        const promo = (m >> 12) & 7;
        return [m & 63, (m >> 6) & 63, promo ? PROMO_CHAR[promo] : null];
    }

    moveToUCI(m) {
        const promo = (m >> 12) & 7;
        return this.squareToNotation(m & 63) + this.squareToNotation((m >> 6) & 63) + (promo ? PROMO_CHAR[promo] : '');
    }

    // All legal moves of the side to move, as ints
    legalMoveInts() {
        const list = new Int32Array(256);
        const n = this.genMoves(list), out = [];
        for (let i = 0; i < n; i++) if (this.makeMove(list[i])) { this.unmakeMove(); out.push(list[i]); }
        return out;
    }

    // UCI move string ("e2e4", "e7e8q") -> legal move int in the current position, or -1
    uciToMove(str) {
        if (typeof str !== 'string' || str.length < 4) return -1;
        const list = new Int32Array(256), n = this.genMoves(list);
        for (let i = 0; i < n; i++) {
            if (this.moveToUCI(list[i]) !== str.toLowerCase()) continue;
            if (this.makeMove(list[i])) { this.unmakeMove(); return list[i]; }
        }
        return -1;
    }

    // Number of leaf nodes of the legal move tree
    perft(depth) {
        if (!this._perftLists) this._perftLists = Array.from({ length: 64 }, () => new Int32Array(256));
        const go = (d, ply) => {
            const list = this._perftLists[ply], n = this.genMoves(list);
            let nodes = 0;
            for (let i = 0; i < n; i++) {
                if (!this.makeMove(list[i])) continue;
                nodes += d === 1 ? 1 : go(d - 1, ply + 1);
                this.unmakeMove();
            }
            return nodes;
        };
        return depth <= 0 ? 1 : go(depth, 0);
    }

    // Perft split by root move: [[uci, nodes], ...]
    perftDivide(depth) {
        const out = [];
        for (const m of this.legalMoveInts()) {
            this.makeMove(m);
            out.push([this.moveToUCI(m), depth <= 1 ? 1 : this.perft(depth - 1)]);
            this.unmakeMove();
        }
        return out;
    }

    // Simple text diagram
    toString() {
        let s = '';
        for (let r = 7; r >= 0; r--) {
            s += ' +---+---+---+---+---+---+---+---+\n';
            for (let f = 0; f < 8; f++) s += ' | ' + (this.board[r * 8 + f] ? CHARS[this.board[r * 8 + f]] : ' ');
            s += ' | ' + (r + 1) + '\n';
        }
        return s + ' +---+---+---+---+---+---+---+---+\n   a   b   c   d   e   f   g   h\n';
    }

    _forSide(isWhite, fn) {
        if (isWhite === undefined || isWhite === (this.turn === 0)) return fn();
        this.makeNullMove();
        try { return fn(); } finally { this.undoNullMove(); }
    }

    getLegalMoves(sq) {
        const p = this.board[sq];
        if (!p) return [];
        return this._forSide((p >> 3) === 0, () => this.legalMoveInts().filter(m => (m & 63) === sq).map(m => this._arr(m)));
    }

    hasLegalMoves(isWhite) {
        return this._forSide(isWhite, () => {
            const list = new Int32Array(256);
            const n = this.genMoves(list);
            for (let i = 0; i < n; i++) if (this.makeMove(list[i])) { this.unmakeMove(); return true; }
            return false;
        });
    }

    // Is the king of the given colour in check?
    isKingInCheck(isWhite) { return this.inCheck(isWhite ? 0 : 1); }

    getKing(isWhite) {
        const k = this.kingSq[isWhite ? 0 : 1];
        return k < 0 ? null : k;
    }

    evaluateEndConditions() {
        if (!this.hasLegalMoves()) {
            if (this.inCheck()) return this.turn === 0 ? 'BLACK_WINS_CHECKMATE' : 'WHITE_WINS_CHECKMATE';
            return 'DRAW_STALEMATE';
        }
        if (this.isInsufficientMaterial()) return 'DRAW_DEAD_POSITION';
        if (this.halfmoveClock >= 100) return 'DRAW_50-MOVE_RULE';
        if (this.repetitions() >= 3) return 'DRAW_THREEFOLD_REPETITION';
        return null;
    }

    // Plays a move on the real board (with logging, UI updates, end-of-game detection and AI hand-off)
    // Returns false if the move is not legal. `force` is accepted for compatibility but a move must still be legal
    MovePiece(fromSq, toSq, promotePiece = null, force = false) {
        if (this.gameCondition !== 'PLAYING') return false;
        if (!Number.isInteger(fromSq) || !Number.isInteger(toSq) || fromSq < 0 || fromSq > 63 || toSq < 0 || toSq > 63) return false;

        const piece = this.board[fromSq];
        if (!piece || (piece >> 3) !== this.turn) return false;

        const isPawn = (piece & 7) === PAWN;
        const lastRank = this.turn === 0 ? 7 : 0;
        let promoType = 0;
        if (isPawn && (toSq >> 3) === lastRank) {
            if (!promotePiece) {
                if (this.renderer) { this.renderer.Promote(fromSq, toSq); return false; }
                promotePiece = 'q';
            }
            promoType = PROMO_TYPE[String(promotePiece).toLowerCase()] || 0;
            if (!promoType) return false;
        }

        // find the matching legal move
        const list = new Int32Array(256);
        const n = this.genMoves(list);
        let move = -1;
        for (let i = 0; i < n; i++) {
            const m = list[i];
            if ((m & 63) === fromSq && ((m >> 6) & 63) === toSq && ((m >> 12) & 7) === promoType) {
                if (this.makeMove(m)) { this.unmakeMove(); move = m; }
                break;
            }
        }
        if (move < 0) return false;

        const flag = (move >> 15) & 7;
        const isWhite = this.turn === 0;
        const targetPiece = flag === FLAG_EP ? CHARS[isWhite ? BP : WP] : CHARS[this.board[toSq]];
        const notation = this._notation(move);
        const prevCondition = this.gameCondition;

        this.makeMove(move);
        const result = this.evaluateEndConditions();
        if (result) this.gameCondition = result;

        const entry = {
            fromSq, toSq,
            originalPiece: CHARS[piece],
            targetPiece,
            promotePiece: promoType ? (isWhite ? PROMO_CHAR[promoType].toUpperCase() : PROMO_CHAR[promoType]) : null,
            castle: flag === FLAG_CK ? 1 : flag === FLAG_CQ ? 2 : 0,
            isEnPassantCapture: flag === FLAG_EP,
            notation,
            gameCondition: prevCondition,
            move
        };
        this.logs.push(entry);

        if (this.renderer) this._rendererAfterMove(entry, isWhite);

        if (this.renderer && this.gameCondition === 'PLAYING') {
            const ai = this.turn === 0 ? this.whiteAI : this.blackAI;
            if (ai) ai.Play();
        }
        return true;
    }

    undoMove() {
        if (this.logs.length === 0) return false;
        const entry = this.logs.pop();
        this.unmakeMove();
        this.gameCondition = entry.gameCondition;

        if (this.renderer) this._rendererAfterUndo(entry, (entry.originalPiece === entry.originalPiece.toUpperCase()));
        return true;
    }

    _rendererAfterMove(entry, isWhite) {
        const R = this.renderer;
        const { fromSq, toSq, targetPiece, promotePiece, castle, isEnPassantCapture } = entry;
        const { r: fr, c: fc } = this.fromSq(fromSq);
        const { r: tr, c: tc } = this.fromSq(toSq);
        const isCapture = targetPiece !== '.';

        if (isCapture) {
            if (isWhite) { R.whiteCaptures.push(targetPiece); R.whitePoints += this.piecePoints[targetPiece.toLowerCase()]; }
            else { R.blackCaptures.push(targetPiece); R.blackPoints += this.piecePoints[targetPiece.toLowerCase()]; }
        }
        if (promotePiece) {
            if (isWhite) R.whitePoints += this.piecePoints[promotePiece.toLowerCase()];
            else R.blackPoints += this.piecePoints[promotePiece.toLowerCase()];
        }
        if (castle === 1) { R.UpdateSquare(tr, 7); R.UpdateSquare(tr, 5); }
        else if (castle === 2) { R.UpdateSquare(tr, 3); R.UpdateSquare(tr, 0); }
        if (isEnPassantCapture) R.UpdateSquare(isWhite ? tr + 1 : tr - 1, tc);

        R.whiteKingChecked = this.isKingInCheck(true);
        R.blackKingChecked = this.isKingInCheck(false);

        R.UpdateSquare(fr, fc);
        R.UpdateSquare(tr, tc);
        R.UpdateGame();
        R.AddToLog();

        if (promotePiece) R.PlaySound(3);
        else if (R.whiteKingChecked || R.blackKingChecked) R.PlaySound(2);
        else if (isCapture) R.PlaySound(1);
        else if (castle !== 0) R.PlaySound(4);
        else R.PlaySound(0);
    }

    _rendererAfterUndo(entry, isWhite) {
        const R = this.renderer;
        const { fromSq, toSq, targetPiece, promotePiece, castle, isEnPassantCapture } = entry;
        const { r: fr, c: fc } = this.fromSq(fromSq);
        const { r: tr, c: tc } = this.fromSq(toSq);
        const isCapture = targetPiece !== '.';

        if (isCapture) {
            if (isWhite) { R.whiteCaptures.splice(-1); R.whitePoints -= this.piecePoints[targetPiece.toLowerCase()]; }
            else { R.blackCaptures.splice(-1); R.blackPoints -= this.piecePoints[targetPiece.toLowerCase()]; }
        }
        if (promotePiece) {
            if (isWhite) R.whitePoints -= this.piecePoints[promotePiece.toLowerCase()];
            else R.blackPoints -= this.piecePoints[promotePiece.toLowerCase()];
        }
        if (castle === 1) { R.UpdateSquare(tr, 7); R.UpdateSquare(tr, 5); }
        else if (castle === 2) { R.UpdateSquare(tr, 3); R.UpdateSquare(tr, 0); }
        if (isEnPassantCapture) R.UpdateSquare(isWhite ? tr + 1 : tr - 1, tc);

        R.whiteKingChecked = this.isKingInCheck(true);
        R.blackKingChecked = this.isKingInCheck(false);

        R.UpdateSquare(fr, fc);
        R.UpdateSquare(tr, tc);
        R.UpdateGame();
        R.RemoveFromLog();

        if (promotePiece) R.PlaySound(3);
        else if (R.whiteKingChecked || R.blackKingChecked) R.PlaySound(2);
        else if (isCapture) R.PlaySound(1);
        else if (castle !== 0) R.PlaySound(4);
        else R.PlaySound(0);
    }


    // Standard SAN for a legal move in the CURRENT position (must be called before the move is played)
    _notation(m) {
        const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
        const piece = this.board[from], t = piece & 7;
        let s;

        if (flag === FLAG_CK) s = 'O-O';
        else if (flag === FLAG_CQ) s = 'O-O-O';
        else {
            const isCapture = this.board[to] !== 0 || flag === FLAG_EP;
            s = '';
            if (t !== PAWN) {
                s += CHARS[t];
                // disambiguation: other pieces of the same kind that can legally reach the same square
                const list = new Int32Array(256), n = this.genMoves(list);
                let ambiguous = false, sameFile = false, sameRank = false;
                for (let i = 0; i < n; i++) {
                    const o = list[i], of = o & 63;
                    if (of === from || ((o >> 6) & 63) !== to || this.board[of] !== piece) continue;
                    if (!this.makeMove(o)) continue;
                    this.unmakeMove();
                    ambiguous = true;
                    if ((of & 7) === (from & 7)) sameFile = true;
                    if ((of >> 3) === (from >> 3)) sameRank = true;
                }
                if (ambiguous) {
                    if (!sameFile) s += String.fromCharCode(97 + (from & 7));
                    else if (!sameRank) s += String.fromCharCode(49 + (from >> 3));
                    else s += this.squareToNotation(from);
                }
            } else if (isCapture) s += String.fromCharCode(97 + (from & 7));

            if (isCapture) s += 'x';
            s += this.squareToNotation(to);
            if (promo) s += '=' + PROMO_CHAR[promo].toUpperCase();
        }

        this.makeMove(m);
        if (this.inCheck()) s += this.hasLegalMoves() ? '+' : '#';
        this.unmakeMove();

        if (flag === FLAG_EP) s += ' e.p.';
        return s;
    }

    getMoveUCI(move) {
        if (typeof move === 'number') return this.moveToUCI(move);
        return `${this.squareToNotation(move[0])}${this.squareToNotation(move[1])}${move[2] ? move[2] : ''}`;
    }

    // Helpers
    getPieceSq(sq) { return CHARS[this.board[sq]] || '.'; }
    getPiece(r, c) { return this.getPieceSq(this.toSq(r, c)); }

    isWhitePiece(p) { return p ? p !== '.' && p === p.toUpperCase() : null; }
    isBlackPiece(p) { return p ? p !== '.' && p === p.toLowerCase() : null; }
    isEmptyPiece(p) { return p ? p == '.' : null; }

    toSq(r, c) { return (this.rows - 1 - r) * this.cols + c; }
    fromSq(sq) { return { r: this.rows - 1 - Math.floor(sq / this.rows), c: sq % this.cols }; }

    squareToNotation(sq) {
        return String.fromCharCode(97 + (sq & 7)) + ((sq >> 3) + 1);
    }

    notationToSquare(notation) {
        return (parseInt(notation[1]) - 1) * 8 + (notation.charCodeAt(0) - 97);
    }


    // FEN Support
    loadFEN(fen) {
        const parts = fen.trim().split(/\s+/);
        this.board.fill(0);
        const ranks = parts[0].split('/');
        if (ranks.length !== 8) throw new Error('Bad FEN: ' + fen);
        for (let r = 0; r < 8; r++) {
            let f = 0;
            for (const ch of ranks[r]) {
                if (ch >= '1' && ch <= '8') f += +ch;
                else this.board[(7 - r) * 8 + f++] = CHAR_TO_PIECE[ch];
            }
        }
        this.turn = (parts[1] || 'w') === 'b' ? 1 : 0;
        const c = parts[2] || '-';
        this.castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
        this.enPassantSquare = !parts[3] || parts[3] === '-' ? -1 : this.notationToSquare(parts[3]);
        this.halfmoveClock = parts[4] ? +parts[4] : 0;
        const full = parts[5] ? +parts[5] : 1;
        this.totalPlies = (full - 1) * 2 + this.turn;
        this._finishSetup();
        this.logs = [];
        this.gameCondition = 'PLAYING';
    }

    static fromFEN(fen) { return new ChessEngine(fen); }

    getFEN() {
        let s = '';
        for (let r = 7; r >= 0; r--) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const p = this.board[r * 8 + f];
                if (!p) { empty++; continue; }
                if (empty) { s += empty; empty = 0; }
                s += CHARS[p];
            }
            if (empty) s += empty;
            if (r > 0) s += '/';
        }
        const c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
        return `${s} ${this.turn === 0 ? 'w' : 'b'} ${c || '-'} ${this.enPassantSquare === -1 ? '-' : this.squareToNotation(this.enPassantSquare)} ${this.halfmoveClock} ${Math.floor(this.totalPlies / 2) + 1}`;
    }
}