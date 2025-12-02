import { delay } from '../utils.js';

export class AIV8 {
    constructor(engine, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;
        this.depth = depth;

        // AI links into engine
        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        // Material values
        this.mgValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
        this.egValues = { P: 120, N: 310, B: 330, R: 510, Q: 920, K: 0 };

        this.phaseWeight = { P: 0, N: 1, B: 1, R: 2, Q: 4, K: 0 };

        // Piece-square tables
        this.mgPst = {
            P: [
                 0,  0,   0,   0,   0,   0,  0,  0,
                50, 50,  50,  50,  50,  50, 50, 50,
                10, 10,  20,  30,  30,  20, 10, 10,
                 5,  5,  10,  25,  25,  10,  5,  5,
                 0,  0,   0,  20,  20,   0,  0,  0,
                 5, -5, -10,   0,   0, -10, -5,  5,
                 5, 10,  10, -20, -20,  10, 10,  5,
                 0,  0,   0,   0,   0,   0,  0,  0
            ],
            N: [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20,   0,   0,   0,   0, -20, -40,
                -30,   0,  10,  15,  15,  10,   0, -30,
                -30,   5,  15,  20,  20,  15,   5, -30,
                -30,   0,  15,  20,  20,  15,   0, -30,
                -30,   5,  10,  15,  15,  10,   5, -30,
                -40, -20,   0,   5,   5,   0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50
            ],
            B: [
                -20, -10, -10, -10, -10, -10, -10, -20,
                -10,   5,   0,   0,   0,   0,   5, -10,
                -10,  10,  10,  10,  10,  10,  10, -10,
                -10,   0,  10,  10,  10,  10,   0, -10,
                -10,   5,   5,  10,  10,   5,   5, -10,
                -10,   0,   5,  10,  10,   5,   0, -10,
                -10,   0,   0,   0,   0,   0,   0, -10,
                -20, -10, -10, -10, -10, -10, -10, -20
            ],
            R: [
                 0,  0,  0,  0,  0,  0,  0,  0,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                 5, 10, 10, 10, 10, 10, 10,  5,
                 0,  0,  0, 10, 10, 10,  0,  0
            ],
            Q: [
                -20, -10, -10, -5, -5, -10, -10, -20,
                -10,   0,   5,  0,  0,   0,   0, -10,
                -10,   0,   0,  0,  0,   0,   0, -10,
                  0,   0,   5,  5,  5,   5,   0,  -5,
                 -5,   0,   5,  5,  5,   5,   0,  -5,
                -10,   5,   5,  5,  5,   5,   0, -10,
                -10,   0,   5,  5,  5,   5,   0, -10,
                -20, -10, -10, -5, -5, -10, -10, -20
            ],
            K: [
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -20, -30, -30, -40, -40, -30, -30, -20,
                -10, -20, -20, -20, -20, -20, -20, -10,
                 20,  20,   0,   0,   0,   0,  20,  20,
                 20,  30,  10,   0,   0,  10,  30,  20
            ]
        };
        this.egPst = {
            P: [
                 0,  0,   0,   0,   0,   0,  0,  0,
                50, 50,  50,  50,  50,  50, 50, 50,
                10, 10,  20,  30,  30,  20, 10, 10,
                 5,  5,  10,  25,  25,  10,  5,  5,
                 0,  0,   0,  20,  20,   0,  0,  0,
                 5, -5, -10,   0,   0, -10, -5,  5,
                 5, 10,  10, -20, -20,  10, 10,  5,
                 0,  0,   0,   0,   0,   0,  0,  0
            ],
            N: [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20,   0,   0,   0,   0, -20, -40,
                -30,   0,  10,  15,  15,  10,   0, -30,
                -30,   5,  15,  20,  20,  15,   5, -30,
                -30,   0,  15,  20,  20,  15,   0, -30,
                -30,   5,  10,  15,  15,  10,   5, -30,
                -40, -20,   0,   5,   5,   0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50
            ],
            B: [
                -20, -10, -10, -10, -10, -10, -10, -20,
                -10,   5,   0,   0,   0,   0,   5, -10,
                -10,  10,  10,  10,  10,  10,  10, -10,
                -10,   0,  10,  10,  10,  10,   0, -10,
                -10,   5,   5,  10,  10,   5,   5, -10,
                -10,   0,   5,  10,  10,   5,   0, -10,
                -10,   0,   0,   0,   0,   0,   0, -10,
                -20, -10, -10, -10, -10, -10, -10, -20
            ],
            R: [
                 0,  0,  0,  0,  0,  0,  0,  0,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                -5,  0,  0,  0,  0,  0,  0, -5,
                 5, 10, 10, 10, 10, 10, 10,  5,
                 0,  0,  0, 10, 10, 10,  0,  0
            ],
            Q: [
                -20, -10, -10, -5, -5, -10, -10, -20,
                -10,   0,   5,  0,  0,   0,   0, -10,
                -10,   0,   0,  0,  0,   0,   0, -10,
                  0,   0,   5,  5,  5,   5,   0,  -5,
                 -5,   0,   5,  5,  5,   5,   0,  -5,
                -10,   5,   5,  5,  5,   5,   0, -10,
                -10,   0,   5,  5,  5,   5,   0, -10,
                -20, -10, -10, -5, -5, -10, -10, -20
            ],
            K: [
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -20, -30, -30, -40, -40, -30, -30, -20,
                -10, -20, -20, -20, -20, -20, -20, -10,
                 20,  20,   0,   0,   0,   0,  20,  20,
                 20,  30,  10,   0,   0,  10,  30,  20
            ]
        };

        // Killer moves, History tables
        this.killerMoves = new Array(depth).fill(null).map(()=>[]);
        this.history = Array.from({length:64},()=> new Uint32Array(64));

        // Transposition table
        this.TT = new Map();

        this.nodes = 0;
        this.totalNodes = 0;
    }

    async Play() {
        await delay(500);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;

        console.log('AI (' + (this.playsWhite ? 'White' : 'Black') + ') playing...');

        this.nodes = 0;

        const best = this.bestMove(this.depth, 5000);
            if (!best) return;

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Move time:', new Date - startTime);

        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        const engineState = this.engine;

        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
            if (moves.length === 0) return null;

        let bestMove = null;

        let alpha = -Infinity;
        let beta = Infinity;
        
        const copy = engineState.clone();

        // Move ordering: sort moves by heuristic
        moves.sort((a, b) => this.scoreMove(copy, b, depth) - this.scoreMove(copy, a, depth));

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];

            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            
            let score;
            if (i === 0) {
                // Full window search for first move
                score = -this.minimax(copy, depth - 1, -beta, -alpha);
            } else {
                // PVS: narrow window first
                score = -this.minimax(copy, depth - 1, -alpha - 1, -alpha);
                
                // If it fails, research with full window
                if (score > alpha) {
                    score = -this.minimax(copy, depth - 1, -beta, -alpha);
                }
            }
            
            copy.undoMove();

            if (score > alpha) {
                alpha = score;
                bestMove = move;
            }
        }

        console.log('Best move:', bestMove, alpha);

        return bestMove;
    }

    minimax(engineState, depth, alpha, beta) {
        this.nodes++;

        const alphaOrig = alpha;

        // Zobrist key
        const key = engineState.zobrist.hash;

        // Check TT
        if (this.TT.has(key)) {
            const entry = this.TT.get(key);

            if (entry.depth >= depth) {
                if (entry.flag === 'EXACT') return entry.value;
                if (entry.flag === 'LOWERBOUND') alpha = Math.max(alpha, entry.value);
                if (entry.flag === 'UPPERBOUND') beta = Math.min(beta, entry.value);
                if (alpha >= beta) return entry.value;
            }
        }

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            // Correct terminal scoring
            if (engineState.gameCondition.startsWith('WHITE_WIN'))
                return (1000000 - engineState.totalPlies * 50) * (this.playsWhite ? -1 : 1);

            if (engineState.gameCondition.startsWith('BLACK_WIN'))
                return (-1000000 - engineState.totalPlies * 50) * (this.playsWhite ? -1 : 1);

            if (engineState.gameCondition.startsWith('DRAW'))
                return 500; // draw = neutral

            // No terminal state? → do QS
            return this.quiescence(engineState, alpha, beta);
        }

        // Generate moves
        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
            if (moves.length === 0) return this.quiescence(engineState, alpha, beta);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b, depth) - this.scoreMove(engineState, a, depth));

        let best = -Infinity;
        let bestMove = null;

        for (const move of moves) {
            const targetBefore = engineState.getPiece(move.tr, move.tc);
            const isCapture = !engineState.isEmpty(targetBefore);

            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            const tactical = move.promote ? 900 : 0;

            const score = -this.minimax(engineState, depth - 1, -beta, -alpha) + tactical;

            engineState.undoMove();

            if (score > best) {
                best = score;
                bestMove = move;
            }
            if (score > alpha) alpha = score;

            if (alpha >= beta) {
                // Store killer move (up to 2)
                if (!this.killerMoves[depth]) this.killerMoves[depth] = [];
                const km = this.killerMoves[depth];
                // Avoid duplicates
                if (!km.some(k => k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote)) {
                    km.unshift({ fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc, promote: move.promote });
                    if (km.length > 2) km.pop();
                }

                if (!isCapture && !move.promote) {
                    const idxFrom = move.fr * engineState.cols + move.fc;
                    const idxTo   = move.tr * engineState.cols + move.tc;

                    this.history[idxFrom][idxTo] += depth * depth;
                }

                break; // beta cutoff
            }
        }

        // Store in TT
        let flag = 'EXACT';
        if (best <= alphaOrig) flag = 'UPPERBOUND';
        else if (best >= beta) flag = 'LOWERBOUND';

        this.TT.set(key, { value: best, depth, flag, bestMove });

        return best;
    }

    scoreMove(engineState, move, depthKey = -1) {
        const target = engineState.getPiece(move.tr, move.tc);
        const moving = engineState.getPiece(move.fr, move.fc);

        let score = 0;

        // 1. MVV-LVA for captures
        if (!engineState.isEmpty(target)) {
            const victimValue = this.mgValues[target.toUpperCase()] || 0;
            const attackerValue = this.mgValues[moving.toUpperCase()] || 0;
            score += victimValue * 100 - attackerValue;
            score += 1000;
        }

        // 2. Promotions
        if (move.promote) score += 2000;

        // 3. Killer move
        const km = this.killerMoves[depthKey];
        if (km) {
            for (let i = 0; i < km.length; i++) {
                const k = km[i];
                if (k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote) {
                    score += (i === 0) ? 1500 : 1000;
                }
            }
        }

        // 4. History heuristic
        if (engineState.isEmpty(target) && !move.promote) {
            const fromIdx = move.fr * engineState.cols + move.fc;
            const toIdx = move.tr * engineState.cols + move.tc;
            score += this.history[fromIdx][toIdx];
        }

        return score;
    }

    quiescence(engineState, alpha, beta, qDepth = 0) {
        if (qDepth > 100) return this.evaluate(engineState);

        this.nodes++;

        const standPat = this.evaluate(engineState);
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;

        // Only consider captures and promotions
        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0)
            .filter(m => !engineState.isEmpty(engineState.getPiece(m.tr, m.tc)) || m.promote);

            if (moves.length === 0) return standPat;

        // Optional: sort captures by MVV-LVA
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        for (const move of moves) {
            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            const score = -this.quiescence(engineState, -beta, -alpha, qDepth + 1);

            engineState.undoMove();

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    evaluate(engineState) {
        const rows = engineState.rows;
        const cols = engineState.cols;

        let mg = 0;
        let eg = 0;
        let phase = 0;

        // Material
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const p = engineState.getPiece(r, c);
                    if (engineState.isEmpty(p)) continue;

                const isWhite = engineState.isWhite(p);
                const type = p.toUpperCase();

                // Material
                const mgVal = this.mgValues[type];
                const egVal = this.mgValues[type];
                const mgPst = this.mgPst[type];
                const egPst = this.egPst[type];

                // PST bonus
                const whiteSq = engineState.toSq(r, c);
                const mgValWhite = mgPst[whiteSq];
                const egValWhite = egPst[whiteSq];

                const blackSq = engineState.toSq(rows - 1 - r, c);
                const mgValWBlack = mgPst[blackSq];
                const egValBlack = egPst[blackSq];

                if (isWhite) {
                    mg += mgVal + mgValWhite;
                    eg += egVal + egValWhite;
                } else {
                    mg -= mgVal + mgValWBlack;
                    eg -= egVal + egValBlack;
                }

                if (type == 'P') {
                    // Pawn promotion proximity
                    if (isWhite) {
                        const rank = 7 - r;
                        const value = Math.pow(rank / (rows - 1), 5);

                        mg += value * (this.mgValues['Q'] / 1.5);
                        eg += value * (this.egValues['Q'] - 20);
                    } else {
                        const rank = r;
                        const value = Math.pow(rank / (rows - 1), 5);

                        mg -= value * (this.mgValues['Q'] / 1.5);
                        eg -= value * (this.egValues['Q'] - 20);
                    }

                    // Doubled pawns
                    let pawnCount = 0;
                    for (let rr = 0; rr < rows; rr++) {
                        const sq = engineState.getPiece(rr, c);
                        if ((isWhite && engineState.isWhite(sq)) || (!isWhite && engineState.isBlack(sq))) pawnCount++;
                    }
                    if (pawnCount > 1) {
                        const penalty = (pawnCount - 1) * 1;
                        mg += isWhite ? -penalty : penalty;
                        eg += isWhite ? -penalty : penalty;
                    }
                }

                phase += this.phaseWeight[type];
            }
        }

        // Normalize phase (0 = EG, 24 = MG)
        if (phase > 24) phase = 24;

        // Tapered eval
        let score = (mg * phase + eg * (24 - phase)) / 24;

        // King safety
        if (engineState.isKingInCheck(true))  score -= 20;
        if (engineState.isKingInCheck(false)) score += 20;

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true).length;
        const blackMoves = engineState.getPlayerLegalMoves(false).length;
        score += (whiteMoves - blackMoves) * 5;

        // Discourage long games
        score -= engineState.totalPlies * 2;

        return engineState.turn === 0 ? score : -score;
    }
}