import { delay } from './utils.js';
import {
    ChessEngine, FLAG_EP,
    WP, WN, WB, WR, WQ, BP, BN, BB, BR, BQ
} from './chessEngine.js';

// Evaluation tables (row 0 = rank 8, White's point of view)
const MGPST = [
    // PAWN
    [ 0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0],
    // KNIGHT
    [-50,-40,-30,-30,-30,-30,-40,-50,
     -40,-20,  0,  5,  5,  0,-20,-40,
     -30,  5, 10, 15, 15, 10,  5,-30,
     -30,  0, 15, 20, 20, 15,  0,-30,
     -30,  5, 15, 20, 20, 15,  5,-30,
     -30,  0, 10, 15, 15, 10,  0,-30,
     -40,-20,  0,  0,  0,  0,-20,-40,
     -50,-40,-30,-30,-30,-30,-40,-50],
    // BISHOP
    [-20,-10,-10,-10,-10,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5, 10, 10,  5,  0,-10,
     -10,  5,  5, 10, 10,  5,  5,-10,
     -10,  0, 10, 10, 10, 10,  0,-10,
     -10, 10, 10, 10, 10, 10, 10,-10,
     -10,  5,  0,  0,  0,  0,  5,-10,
     -20,-10,-10,-10,-10,-10,-10,-20],
    // ROOK
    [0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0],
    // QUEEN
    [-20,-10,-10, -5, -5,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5,  5,  5,  5,  0,-10,
      -5,  0,  5,  5,  5,  5,  0, -5,
       0,  0,  5,  5,  5,  5,  0, -5,
     -10,  5,  5,  5,  5,  5,  0,-10,
     -10,  0,  5,  0,  0,  0,  0,-10,
     -20,-10,-10, -5, -5,-10,-10,-20],
    // KING
    [-30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -20,-30,-30,-40,-40,-30,-30,-20,
     -10,-20,-20,-20,-20,-20,-20,-10,
      20, 20,  0,  0,  0,  0, 20, 20,
      20, 30, 10,  0,  0, 10, 30, 20],
];
const EGPST = [
    // PAWN
    [ 0,  0,  0,  0,  0,  0,  0,  0,
     10, 10, 10, 50, 50, 10, 10, 10,
      5,  5,  5, 30, 30,  5,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      0,  0,  0, 10, 10,  0,  0,  0,
      5,  5,  5,  5,  5,  5,  5,  5,
     10, 10, 10, 10, 10, 10, 10, 10,
      0,  0,  0,  0,  0,  0,  0,  0],
    // KNIGHT
    [-40,-30,-20,-20,-20,-20,-30,-40,
     -30,-10,  0,  5,  5,  0,-10,-30,
     -20,  5, 10, 15, 15, 10,  5,-20,
     -20,  0, 15, 20, 20, 15,  0,-20,
     -20,  5, 15, 20, 20, 15,  5,-20,
     -20,  0, 10, 15, 15, 10,  0,-20,
     -30,-10,  0,  0,  0,  0,-10,-30,
     -40,-30,-20,-20,-20,-20,-30,-40],
    // BISHOP
    [-20,-10,-10,-10,-10,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5, 10, 10,  5,  0,-10,
     -10,  0, 10, 15, 15, 10,  0,-10,
     -10,  0, 10, 15, 15, 10,  0,-10,
     -10,  5, 10, 10, 10, 10,  5,-10,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -20,-10,-10,-10,-10,-10,-10,-20],
    // ROOK
    [ 0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0],
    // QUEEN
    [-20,-10,-10, -5, -5,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5,  5,  5,  5,  0,-10,
      -5,  0,  5,  5,  5,  5,  0, -5,
      -5,  0,  5,  5,  5,  5,  0, -5,
     -10,  5,  5,  5,  5,  5,  0,-10,
     -10,  0,  5,  0,  0,  0,  0,-10,
     -20,-10,-10, -5, -5,-10,-10,-20],
    // KING
    [-50,-40,-30,-20,-20,-30,-40,-50,
     -40,-20,-10,  0,  0,-10,-20,-40,
     -30,-10, 20, 30, 30, 20,-10,-30,
     -20,  0, 30, 40, 40, 30,  0,-20,
     -20,  0, 30, 40, 40, 30,  0,-20,
     -30,-10, 20, 30, 30, 20,-10,-30,
     -40,-20,-10,  0,  0,-10,-20,-40,
     -50,-40,-30,-20,-20,-30,-40,-50],
];

const MG_VAL = [0, 100, 320, 330, 500, 900, 0];
const EG_VAL = [0, 120, 310, 330, 510, 920, 0];

// Flattened tables indexed [pieceCode * 64 + square]
const MG_T = new Int32Array(16 * 64);
const EG_T = new Int32Array(16 * 64);
for (let type = 1; type <= 6; type++) {
    for (let sq = 0; sq < 64; sq++) {
        MG_T[type * 64 + sq] = MG_VAL[type] + MGPST[type - 1][sq ^ 56];
        EG_T[type * 64 + sq] = EG_VAL[type] + EGPST[type - 1][sq ^ 56];
        MG_T[(type + 8) * 64 + sq] = -(MG_VAL[type] + MGPST[type - 1][sq]);
        EG_T[(type + 8) * 64 + sq] = -(EG_VAL[type] + EGPST[type - 1][sq]);
    }
}

const PASSED_MG = [0, 0, 5, 10, 20, 40, 70, 0];
const PASSED_EG = [0, 5, 12, 25, 45, 75, 120, 0];

const MATE = 100000, MATE_BOUND = MATE - 256, INF = 1000000, MAX_PLY = 96;
const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0];

const wCnt = new Int8Array(10), bCnt = new Int8Array(10);
const wMin = new Int8Array(10), bMax = new Int8Array(10);
const wpSq = new Int8Array(16), bpSq = new Int8Array(16), wrSq = new Int8Array(16), brSq = new Int8Array(16);

// Static evaluation in centipawns from the point of view of the side to move.
export function evaluate(e) {
    const b = e.board;
    let mg = 0, eg = 0;
    let nwp = 0, nbp = 0, nwr = 0, nbr = 0;
    wCnt.fill(0); bCnt.fill(0); wMin.fill(8); bMax.fill(-1);

    for (let sq = 0; sq < 64; sq++) {
        const p = b[sq];
        if (p === 0) continue;
        mg += MG_T[p * 64 + sq];
        eg += EG_T[p * 64 + sq];
        if (p === WP) {
            const f = (sq & 7) + 1, r = sq >> 3;
            wCnt[f]++; if (r < wMin[f]) wMin[f] = r;
            if (nwp < 16) wpSq[nwp++] = sq;
        } else if (p === BP) {
            const f = (sq & 7) + 1, r = sq >> 3;
            bCnt[f]++; if (r > bMax[f]) bMax[f] = r;
            if (nbp < 16) bpSq[nbp++] = sq;
        } else if (p === WR) { if (nwr < 16) wrSq[nwr++] = sq; }
        else if (p === BR) { if (nbr < 16) brSq[nbr++] = sq; }
    }

    // Pawn structure
    for (let i = 0; i < nwp; i++) {
        const sq = wpSq[i], f = (sq & 7) + 1, r = sq >> 3;
        if (wCnt[f] > 1) { mg -= 5; eg -= 10; }                                   // doubled
        if (wCnt[f - 1] + wCnt[f + 1] === 0) { mg -= 10; eg -= 15; }              // isolated
        if (bMax[f - 1] <= r && bMax[f] <= r && bMax[f + 1] <= r) { mg += PASSED_MG[r]; eg += PASSED_EG[r]; }
    }
    for (let i = 0; i < nbp; i++) {
        const sq = bpSq[i], f = (sq & 7) + 1, r = sq >> 3;
        if (bCnt[f] > 1) { mg += 5; eg += 10; }
        if (bCnt[f - 1] + bCnt[f + 1] === 0) { mg += 10; eg += 15; }
        if (wMin[f - 1] >= r && wMin[f] >= r && wMin[f + 1] >= r) { mg -= PASSED_MG[7 - r]; eg -= PASSED_EG[7 - r]; }
    }

    // Rooks: open or semi-open files, 7th rank
    for (let i = 0; i < nwr; i++) {
        const sq = wrSq[i], f = (sq & 7) + 1;
        if (wCnt[f] === 0) { if (bCnt[f] === 0) { mg += 20; eg += 10; } else { mg += 10; eg += 5; } }
        if ((sq >> 3) === 6) { mg += 15; eg += 25; }
    }
    for (let i = 0; i < nbr; i++) {
        const sq = brSq[i], f = (sq & 7) + 1;
        if (bCnt[f] === 0) { if (wCnt[f] === 0) { mg -= 20; eg -= 10; } else { mg -= 10; eg -= 5; } }
        if ((sq >> 3) === 1) { mg -= 15; eg -= 25; }
    }

    // Bishop pair
    const c = e.cnt;
    if (c[WB] >= 2) { mg += 30; eg += 50; }
    if (c[BB] >= 2) { mg -= 30; eg -= 50; }

    // King safety: pawn shield, castled king (midgame only)
    const wk = e.kingSq[0], bk = e.kingSq[1];
    if (wk >= 0 && (wk >> 3) <= 1) {
        const f = wk & 7, r = wk >> 3;
        for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) {
            if (b[(r + 1) * 8 + ff] === WP) mg += 10;
            else if (r + 2 < 8 && b[(r + 2) * 8 + ff] === WP) mg += 5;
        }
    }
    if (bk >= 0 && (bk >> 3) >= 6) {
        const f = bk & 7, r = bk >> 3;
        for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) {
            if (b[(r - 1) * 8 + ff] === BP) mg -= 10;
            else if (r - 2 >= 0 && b[(r - 2) * 8 + ff] === BP) mg -= 5;
        }
    }

    // Taper
    let phase = c[WN] + c[BN] + c[WB] + c[BB] + 2 * (c[WR] + c[BR]) + 4 * (c[WQ] + c[BQ]);
    if (phase > 24) phase = 24;
    const score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
    return (e.turn === 0 ? score : -score) + 10;        // +10: tempo
}

// late-move-reduction table
const LMR = Array.from({ length: 64 }, (_, d) => Int8Array.from({ length: 64 }, (_, m) => (d < 3 || m < 2) ? 0 : Math.floor(0.75 + Math.log(d) * Math.log(m) / 2.25)));

const TT_DEFAULT_BITS = 20;
const TT_EXACT = 1, TT_LOWER = 2, TT_UPPER = 3;

export class ChessAI {
    constructor(engine = null, playsWhite = false, timeLimit = 2000) {
        this.engine = engine;
        this.playsWhite = playsWhite;
        this.timeLimit = timeLimit;
        this.verbose = true;

        if (engine) {
            if (playsWhite) engine.whiteAI = this;
            else engine.blackAI = this;
        }

        this.INFINITY = INF;

        this.resizeHash(TT_DEFAULT_BITS);

        this.killers = new Int32Array(MAX_PLY * 2 + 4);
        this.history = new Int32Array(2 * 64 * 64);
        this.moveLists = Array.from({ length: MAX_PLY + 4 }, () => new Int32Array(256));
        this.scoreLists = Array.from({ length: MAX_PLY + 4 }, () => new Int32Array(256));
        this.quietLists = Array.from({ length: MAX_PLY + 4 }, () => new Int32Array(64));

        this.nodes = 0;
        this.nodesMove = 0;
        this.totalNodes = 0;
        this.stopped = false;
        this.deadline = 0;
        this.rootSp = 0;
        this.rootMoves = [];
        this.iterBest = 0;
        this.lastInfo = null;
    }

    // Allocate the transposition table with 2^bits entries
    resizeHash(bits) {
        bits = Math.max(10, Math.min(26, bits | 0));
        const size = 1 << bits;
        this.ttBits = bits;
        this.ttMask = size - 1;
        this.ttLo = new Int32Array(size);
        this.ttHi = new Int32Array(size);
        this.ttMove = new Int32Array(size);
        this.ttScore = new Int32Array(size);
        this.ttDepth = new Int8Array(size);
        this.ttFlag = new Uint8Array(size);
        this.ttAge = new Uint8Array(size);
        this.age = 0;
    }

    setHashMB(mb) {
        const entries = (mb * 1024 * 1024) / 19;
        this.resizeHash(Math.floor(Math.log2(Math.max(1024, entries))));
    }

    // Permille of the table used by the current search
    hashfull() {
        const n = Math.min(1000, this.ttMask + 1);
        let used = 0;
        for (let i = 0; i < n; i++) if (this.ttFlag[i] !== 0 && this.ttAge[i] === this.age) used++;
        return Math.round(used * 1000 / n);
    }

    clearHash() {
        this.ttFlag.fill(0);
        this.age = 0;
        this.history.fill(0);
        this.killers.fill(0);
    }


    async Play() {
        await delay(250);

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;
        if (this.engine.gameCondition !== 'PLAYING') return;

        const start = performance.now();
        const best = this.bestMove();
        if (!best) return;

        if (this.verbose) {
            console.log(`AI (${this.playsWhite ? 'White' : 'Black'}) nodes: ${this.nodesMove}, total: ${this.totalNodes}, time: ${(performance.now() - start).toFixed(0)}ms`);
        }

        // the position may have changed while we were thinking (undo / restart)
        if ((this.engine.turn === 0) !== this.playsWhite || this.engine.gameCondition !== 'PLAYING') return;
        this.engine.MovePiece(best[0], best[1], best[2]);
    }

    /**
     * Returns the best move as [fromSq, toSq, promotionChar | null], or null if there is no legal move.
     *
     * opts (all optional):
     *   soft        target time in ms; no new iteration is started after ~55% of it (default: timeLimit)
     *   infinite    ignore the clock completely (stop with the stop flag / depth / nodes)
     *   nodes       stop after this many nodes
     *   stopFlag    Int32Array (usually on a SharedArrayBuffer); the search stops when element 0 becomes non-zero
     *   searchMoves array of UCI move strings to restrict the root moves
     *   onInfo      callback({depth, score, mate, nodes, ms, nps, hashfull, pv:[uci...]}) after every completed depth
     *   analyse     do not short-cut when there is only one legal move
     * After the call: this.lastPV (array of UCI strings), this.lastInfo.
     */
    bestMove(timeLimit = this.timeLimit, maxDepth = 64, opts = {}) {
        const e = this.engine.clone();
        if (e.gameCondition !== 'PLAYING') return null;

        let rootMoves = e.legalMoveInts();
        if (opts.searchMoves && opts.searchMoves.length) {
            const wanted = new Set(opts.searchMoves);
            const filtered = rootMoves.filter(m => wanted.has(e.moveToUCI(m)));
            if (filtered.length) rootMoves = filtered;
        }
        this.lastPV = [];
        if (rootMoves.length === 0) return null;
        if (rootMoves.length === 1 && !opts.analyse && !opts.infinite) {
            this.lastPV = [e.moveToUCI(rootMoves[0])];
            this.lastInfo = { score: 0, nodes: 0, ms: 0, nps: 0 };
            return e._arr(rootMoves[0]);
        }

        const infinite = !!opts.infinite;
        const soft = infinite ? Infinity : (opts.soft ?? timeLimit);
        this.stopFlag = opts.stopFlag || null;
        this.nodeLimit = opts.nodes || 0;

        this.age = (this.age + 1) & 255;
        for (let i = 0; i < this.history.length; i++) this.history[i] >>= 1;
        this.killers.fill(0);

        const start = performance.now();
        this.deadline = infinite ? Infinity : start + timeLimit;
        this.stopped = false;
        this.nodes = 0;
        this.rootSp = e.sp;

        // initial ordering: TT move first, then captures/promotions by MVV-LVA
        const ttm = this.probeMove(e);
        const scores = new Map();
        const tmpList = this.moveLists[0], tmpScores = this.scoreLists[0];
        for (let i = 0; i < rootMoves.length; i++) tmpList[i] = rootMoves[i];
        this.scoreMoves(e, tmpList, rootMoves.length, tmpScores, 0, ttm, false);
        rootMoves.forEach((m, i) => scores.set(m, tmpScores[i]));
        rootMoves.sort((a, b) => scores.get(b) - scores.get(a));
        this.rootMoves = rootMoves;

        let best = rootMoves[0], bestScore = 0;

        for (let depth = 1; depth <= maxDepth; depth++) {
            if (depth > 1 && performance.now() - start > soft * 0.55) break;

            let alpha = -INF, beta = INF, delta = 30;
            if (depth >= 5) { alpha = bestScore - delta; beta = bestScore + delta; }

            let score;
            for (; ;) {
                this.iterBest = 0;
                score = this.searchRoot(e, depth, alpha, beta);
                if (this.stopped) break;
                if (score <= alpha) { beta = (alpha + beta) >> 1; alpha = Math.max(score - delta, -INF); delta *= 2; }
                else if (score >= beta) { beta = Math.min(score + delta, INF); delta *= 2; }
                else break;
            }

            if (this.stopped) {
                // a partially searched iteration still counts if it already found an improvement
                if (this.iterBest) best = this.iterBest;
                break;
            }

            best = this.rootMoves[0];
            bestScore = score;

            const ms = performance.now() - start;
            this.lastPV = this.extractPV(e, best, depth);
            if (opts.onInfo) {
                const isMate = Math.abs(score) >= MATE_BOUND;
                opts.onInfo({
                    depth, score, nodes: this.nodes, ms, nps: Math.round(this.nodes / Math.max(ms, 1) * 1000),
                    mate: isMate ? Math.sign(score) * ((MATE - Math.abs(score) + 1) >> 1) : null,
                    hashfull: this.hashfull(), pv: this.lastPV
                });
            } else if (this.verbose) {
                console.log('info depth', depth, 'nodes', this.nodes, 'time', ms.toFixed(0), 'nps', Math.round(this.nodes / Math.max(ms, 1) * 1000), 'pv', this.lastPV.join(' '), 'score cp', score);
            }
            if (Math.abs(score) >= MATE_BOUND && depth >= (MATE - Math.abs(score)) + 2) break;   // forced mate found
        }

        const elapsed = performance.now() - start;
        this.nodesMove = this.nodes;
        this.totalNodes += this.nodes;
        this.lastInfo = { score: bestScore, nodes: this.nodes, ms: elapsed, nps: this.nodes / Math.max(elapsed, 1) * 1000 };
        if (this.lastPV.length === 0 || this.lastPV[0] !== e.moveToUCI(best)) this.lastPV = [e.moveToUCI(best)];
        this.stopFlag = null;
        return e._arr(best);
    }

    // Principal variation: the best move followed by the transposition-table line
    extractPV(e, first, maxLen) {
        const pv = [e.moveToUCI(first)];
        let made = 0;
        e.makeMove(first); made++;
        const list = new Int32Array(256);
        for (let i = 1; i < Math.max(maxLen, 2) && i < 24; i++) {
            const tm = this.probeMove(e);
            if (!tm) break;
            const n = e.genMoves(list);
            let found = false;
            for (let j = 0; j < n; j++) if (list[j] === tm) { found = true; break; }
            if (!found || !e.makeMove(tm)) break;
            made++;
            pv.push(e.moveToUCI(tm));
            if (e.repetitions() > 1) break;
        }
        while (made-- > 0) e.unmakeMove();
        return pv;
    }

    checkTime() {
        if (performance.now() >= this.deadline) this.stopped = true;
        else if (this.nodeLimit && this.nodes >= this.nodeLimit) this.stopped = true;
        else if (this.stopFlag && Atomics.load(this.stopFlag, 0) !== 0) this.stopped = true;
    }

    probeMove(e) {
        const idx = e.hashLo & this.ttMask;
        if (this.ttFlag[idx] && this.ttLo[idx] === e.hashLo && this.ttHi[idx] === e.hashHi) return this.ttMove[idx];
        return 0;
    }

    searchRoot(e, depth, alpha, beta) {
        const moves = this.rootMoves;
        const origAlpha = alpha;
        let best = -INF, bestMove = 0;

        for (let i = 0; i < moves.length; i++) {
            const m = moves[i];
            e.makeMove(m);
            let score;
            if (i === 0) score = -this.negamax(e, depth - 1, -beta, -alpha, 1, true);
            else {
                score = -this.negamax(e, depth - 1, -alpha - 1, -alpha, 1, true);
                if (score > alpha && score < beta) score = -this.negamax(e, depth - 1, -beta, -alpha, 1, true);
            }
            e.unmakeMove();
            if (this.stopped) return 0;

            if (score > best) {
                best = score; bestMove = m;
                if (score > origAlpha) this.iterBest = m;
                if (score > alpha) alpha = score;
                if (score >= beta) break;
            }
        }

        // keep the best move first for the next iteration
        const idx = moves.indexOf(bestMove);
        if (idx > 0) { moves.splice(idx, 1); moves.unshift(bestMove); }
        return best;
    }

    isRepetition(e) {
        const lo = e.hashLo, hi = e.hashHi;
        const stop = Math.max(0, e.sp - e.halfmoveClock);
        let earlier = 0;
        for (let j = e.sp - 2; j >= stop; j -= 2) {
            if (e.posLo[j] === lo && e.posHi[j] === hi) {
                if (j >= this.rootSp) return true;          // repeated inside the search tree: treat as a draw
                if (++earlier >= 2) return true;            // third occurrence including the game history
            }
        }
        return false;
    }

    negamax(e, depth, alpha, beta, ply, allowNull) {
        if ((++this.nodes & 2047) === 0) this.checkTime();
        if (this.stopped) return 0;

        const pv = beta - alpha > 1;

        if (ply > 0) {
            if (e.halfmoveClock >= 100 || this.isRepetition(e) || e.isInsufficientMaterial()) return 0;
            // mate-distance pruning
            if (alpha < -MATE + ply) alpha = -MATE + ply;
            if (beta > MATE - ply - 1) beta = MATE - ply - 1;
            if (alpha >= beta) return alpha;
        }
        if (ply >= MAX_PLY) return evaluate(e);

        const inCheck = e.inCheck();
        if (inCheck) depth++; // check extension
        if (depth <= 0) return this.quiescence(e, alpha, beta, ply, 0);

        // Transposition table
        const idx = e.hashLo & this.ttMask;
        let ttMove = 0;
        if (this.ttFlag[idx] !== 0 && this.ttLo[idx] === e.hashLo && this.ttHi[idx] === e.hashHi) {
            ttMove = this.ttMove[idx];
            if (!pv && this.ttDepth[idx] >= depth) {
                let s = this.ttScore[idx];
                if (s >= MATE_BOUND) s -= ply; else if (s <= -MATE_BOUND) s += ply;
                const flag = this.ttFlag[idx];
                if (flag === TT_EXACT) return s;
                if (flag === TT_LOWER && s >= beta) return s;
                if (flag === TT_UPPER && s <= alpha) return s;
            }
        }

        const staticEval = inCheck ? -INF : evaluate(e);

        if (!pv && !inCheck) {
            // reverse futility ("static null move") pruning
            if (depth <= 4 && staticEval - 100 * depth >= beta && beta > -MATE_BOUND && staticEval < MATE_BOUND) return staticEval;

            // null-move pruning
            if (allowNull && depth >= 3 && staticEval >= beta && e.hasNonPawnMaterial(e.turn === 0)) {
                const R = 2 + (depth >= 6 ? 1 : 0);
                e.makeNullMove();
                const s = -this.negamax(e, depth - 1 - R, -beta, -beta + 1, ply + 1, false);
                e.undoNullMove();
                if (this.stopped) return 0;
                if (s >= beta) return s >= MATE_BOUND ? beta : s;
            }
        }

        // Generate and order moves
        const list = this.moveLists[ply], scores = this.scoreLists[ply];
        const n = e.genMoves(list);
        this.scoreMoves(e, list, n, scores, ply, ttMove, false);

        const origAlpha = alpha;
        const us = e.turn;
        const quiets = this.quietLists[ply];
        let nQuiets = 0, legal = 0, best = -INF, bestMove = 0;
        const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];

        for (let i = 0; i < n; i++) {
            // selection sort: take the best remaining move
            let bi = i, bs = scores[i];
            for (let j = i + 1; j < n; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
            const m = list[bi];
            list[bi] = list[i]; scores[bi] = scores[i]; list[i] = m; scores[i] = bs;

            const isCapture = e.board[(m >> 6) & 63] !== 0 || ((m >> 15) & 7) === FLAG_EP;
            const isPromo = ((m >> 12) & 7) !== 0;
            const quiet = !isCapture && !isPromo;

            if (!e.makeMove(m)) continue;
            legal++;
            const gives = e.inCheck();

            // forward pruning of late quiet moves (never the first legal move)
            if (legal > 1 && quiet && !pv && !inCheck && !gives && best > -MATE_BOUND) {
                if (depth <= 3 && legal >= 5 + depth * depth) { e.unmakeMove(); continue; }                 // late-move pruning
                if (depth <= 2 && staticEval + 100 + 90 * depth <= alpha) { e.unmakeMove(); continue; }     // futility pruning
            }

            const newDepth = depth - 1;
            let score;
            if (legal === 1) {
                score = -this.negamax(e, newDepth, -beta, -alpha, ply + 1, true);
            } else {
                let r = 0;
                if (depth >= 3 && quiet && !inCheck && !gives && legal >= 4) {
                    r = LMR[depth > 63 ? 63 : depth][legal > 63 ? 63 : legal];
                    if (pv) r--;
                    if (m === k1 || m === k2) r--;
                    if (r < 0) r = 0;
                    if (r > newDepth - 1) r = newDepth - 1 > 0 ? newDepth - 1 : 0;
                }
                score = -this.negamax(e, newDepth - r, -alpha - 1, -alpha, ply + 1, true);
                if (score > alpha && r > 0) score = -this.negamax(e, newDepth, -alpha - 1, -alpha, ply + 1, true);
                if (score > alpha && score < beta) score = -this.negamax(e, newDepth, -beta, -alpha, ply + 1, true);
            }
            e.unmakeMove();
            if (this.stopped) return 0;

            if (quiet && nQuiets < 64) quiets[nQuiets++] = m;

            if (score > best) {
                best = score; bestMove = m;
                if (score > alpha) {
                    alpha = score;
                    if (alpha >= beta) {
                        if (quiet) {
                            if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
                            const bonus = depth * depth;
                            this.bump(us, m, bonus);
                            for (let q = 0; q < nQuiets - 1; q++) this.bump(us, quiets[q], -bonus);
                        }
                        break;
                    }
                }
            }
        }

        if (legal === 0) return inCheck ? -MATE + ply : 0;

        // Store in the transposition table
        const flag = best <= origAlpha ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT;
        if (this.ttFlag[idx] === 0 || this.ttAge[idx] !== this.age || depth >= this.ttDepth[idx] ||
            (this.ttLo[idx] === e.hashLo && this.ttHi[idx] === e.hashHi)) {
            let s = best;
            if (s >= MATE_BOUND) s += ply; else if (s <= -MATE_BOUND) s -= ply;
            this.ttLo[idx] = e.hashLo; this.ttHi[idx] = e.hashHi;
            this.ttMove[idx] = bestMove;
            this.ttScore[idx] = s;
            this.ttDepth[idx] = depth > 127 ? 127 : depth;
            this.ttFlag[idx] = flag;
            this.ttAge[idx] = this.age;
        }
        return best;
    }

    bump(us, m, bonus) {
        const i = (us << 12) | ((m & 63) << 6) | ((m >> 6) & 63);
        let v = this.history[i] + bonus;
        if (v > 16000) v = 16000; else if (v < -16000) v = -16000;
        this.history[i] = v;
    }

    scoreMoves(e, list, n, scores, ply, ttMove, qs) {
        const b = e.board, us = e.turn;
        const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];
        for (let i = 0; i < n; i++) {
            const m = list[i];
            if (m === ttMove) { scores[i] = 1 << 30; continue; }
            const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
            const victim = flag === FLAG_EP ? 1 : (b[to] & 7);
            if (victim !== 0) scores[i] = (1 << 20) + victim * 16 - (b[from] & 7) + (promo ? promo * 64 : 0);
            else if (promo) scores[i] = (1 << 20) + promo * 64;
            else if (m === k1) scores[i] = 1 << 19;
            else if (m === k2) scores[i] = (1 << 19) - 1;
            else scores[i] = this.history[(us << 12) | (from << 6) | to];
        }
    }

    quiescence(e, alpha, beta, ply, qd) {
        if ((++this.nodes & 2047) === 0) this.checkTime();
        if (this.stopped) return 0;
        if (ply >= MAX_PLY) return evaluate(e);
        if (e.halfmoveClock >= 100 || e.isInsufficientMaterial()) return 0;

        const inCheck = e.inCheck();
        let best, stand = 0;
        if (!inCheck) {
            stand = evaluate(e);
            if (stand >= beta) return stand;
            if (stand > alpha) alpha = stand;
            best = stand;
        } else {
            best = -MATE + ply;
        }

        const list = this.moveLists[ply], scores = this.scoreLists[ply];
        const n = inCheck ? e.genMoves(list, false) : e.genMoves(list, true);
        this.scoreMoves(e, list, n, scores, ply, 0, true);

        let legal = 0;
        for (let i = 0; i < n; i++) {
            let bi = i, bs = scores[i];
            for (let j = i + 1; j < n; j++) if (scores[j] > bs) { bs = scores[j]; bi = j; }
            const m = list[bi];
            list[bi] = list[i]; scores[bi] = scores[i]; list[i] = m; scores[i] = bs;

            if (!inCheck) {
                // delta pruning
                const victim = (m >> 15 & 7) === FLAG_EP ? 1 : (e.board[(m >> 6) & 63] & 7);
                if (stand + PIECE_VALUE[victim] + 200 < alpha && ((m >> 12) & 7) === 0) continue;
            }

            if (!e.makeMove(m)) continue;
            legal++;
            const score = -this.quiescence(e, -beta, -alpha, ply + 1, qd + 1);
            e.unmakeMove();
            if (this.stopped) return 0;

            if (score > best) {
                best = score;
                if (score > alpha) {
                    alpha = score;
                    if (alpha >= beta) break;
                }
            }
        }

        if (inCheck && legal === 0) return -MATE + ply;
        return best;
    }
}