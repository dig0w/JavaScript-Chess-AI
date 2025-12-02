export class AIV8 {
    constructor(engine, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;
        this.depth = depth;

        // AI links into engine
        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        // Piece index map
        this.PIDX = { P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5 };

        // Material values
        this.MG = [ 124, 781, 825, 1276, 2538, 0 ];
        this.EG = [ 206, 854, 915, 1380, 2682, 0 ];

        this.mgPhaseScore = 15258;
        this.egPhaseScore = 3915;

        // Piece-square tables
        this.PSTM = [
            [ //Pawn
                   0,   0,   0,   0,   0,   0,   0,   0,
                  -7,   7,  -3, -13,   5, -16,  10,  -8,
                   5, -12,  -7,  22,  -8,  -5, -15,  -8,
                  13,   0, -13,   1,  11,  -2, -13,   5,
                  -4, -23,   6,  20,  40,  17,   4,  -8,
                  -9, -15,  11,  15,  32,  22,   5, -22,
                   3,   3,  10,  19,  16,  19,   7,  -5,
                   0,   0,   0,   0,   0,   0,   0,   0,
            ], [ // Knight
                -201, -83, -56, -26, -26, -56, -83, -201,
                 -67, -27,   4,  37,  37,   4, -27,  -67,
                  -9,  22,  58,  53,  53,  58,  22,   -9,
                 -34,  13,  44,  51,  51,  44,  13,  -34,
                 -35,   8,  40,  49,  49,  40,   8,  -35,
                 -61, -17,   6,  12,  12,   6, -17,  -61,
                 -77, -41, -27, -15, -15, -27, -41,  -77,
                -175, -92, -74, -73, -73, -74, -92, -175,
            ], [ // Bishop
                 -48,   1, -14, -23, -23, -14,   1, -48,
                 -17, -14,   5,   0,   0,   5, -14, -17,
                 -16,   6,   1,  11,  11,   1,   6, -16,
                 -12,  29,  22,  31,  31,  22,  29, -12,
                  -5,  11,  25,  39,  39,  25,  11,  -5,
                  -7,  21,  -5,  17,  17,  -5,  21,  -7,
                 -15,   8,  19,   4,   4,  19,   8, -15,
                 -53,  -5,  -8, -23, -23,  -8,  -5, -53,
            ], [ // Rook
                 -17, -19,  -1,   9,   9,  -1, -19, -17,
                  -2,  12,  16,  18,  18,  16,  12,  -2,
                 -22,  -2,   6,  12,  12,   6,  -2, -22,
                 -27, -15,  -4,   3,   3,  -4, -15, -27,
                 -13,  -5,  -4,  -6,  -6,  -4,  -5, -13,
                 -25, -11,  -1,   3,   3,  -1, -11, -25,
                 -21, -13,  -8,   6,   6,  -8, -13, -21,
                 -31, -20, -14,  -5,  -5, -14, -20, -31,
            ], [ // Queen
                  -2,  -2,   1,  -2,  -2,   1,  -2,  -2,
                  -5,   6,  10,   8,   8,  10,   6,  -5,
                  -4,  10,   6,   8,   8,   6,  10,  -4,
                   0,  14,  12,   5,   5,  12,  14,   0,
                   4,   5,   9,   8,   8,   9,   5,   4,
                  -3,   6,  13,   7,   7,  13,   6,  -3,
                  -3,   5,   8,  12,  12,   8,   5,  -3,
                   3,  -5,  -5,   4,   4,  -5,  -5,   3,
            ], [ // King
                  59,  89,  45,  -1,  -1,  45,  89,  59,
                  88, 120,  65,  33,  33,  65, 120,  88,
                 123, 145,  81,  31,  31,  81, 145, 123,
                 154, 179, 105,  70,  70, 105, 179, 154,
                 164, 190, 138,  98,  98, 138, 190, 164,
                 195, 258, 169, 120, 120, 169, 258, 195,
                 278, 303, 234, 179, 179, 234, 303, 278,
                 271, 327, 271, 198, 198, 271, 327, 271,
            ]
        ];
        this.PSTE = [
            [ // Pawn
                   0,   0,   0,   0,   0,   0,   0,   0,
                   0, -11,  12,  21,  25,  19,   4,   7,
                  28,  20,  21,  28,  30,   7,   6,  13,
                  10,   5,   4,  -5,  -5,  -5,  14,   9,
                   6,  -2,  -8,  -4, -13, -12, -10,  -9,
                 -10, -10, -10,   4,   4,   3,  -6,  -4,
                 -10,  -6,  10,   0,  14,   7,  -5, -19,
                   0,   0,   0,   0,   0,   0,   0,   0,
            ], [ // Knight
                -100, -88, -56, -17, -17, -56, -88,-100,
                 -69, -50, -51,  12,  12, -51, -50, -69,
                 -51, -44, -16,  17,  17, -16, -44, -51,
                 -45, -16,   9,  39,  39,   9, -16, -45,
                 -35,  -2,  13,  28,  28,  13,  -2, -35,
                 -40, -27,  -8,  29,  29,  -8, -27, -40,
                 -67, -54, -18,   8,   8, -18, -54, -67,
                 -96, -65, -49, -21, -21, -49, -65, -96,
            ], [ // Bishop
                 -46, -42, -37, -24, -24, -37, -42, -46,
                 -31, -20,  -1,   1,   1,  -1, -20, -31,
                 -30,   6,   4,   6,   6,   4,   6, -30,
                 -17,  -1, -14,  15,  15, -14,  -1, -17,
                 -20,  -6,   0,  17,  17,   0,  -6, -20,
                 -16,  -1,  -2,  10,  10,  -2,  -1, -16,
                 -37, -13, -17,   1,   1, -17, -13, -37,
                 -57, -30, -37, -12, -12, -37, -30, -57,
            ], [ // Rook
                  18,   0,  19,  13,  13,  19,   0,  18,
                   4,   5,  20,  -5,  -5,  20,   5,   4,
                   6,   1,  -7,  10,  10,  -7,   1,   6,
                  -5,   8,   7,  -6,  -6,   7,   8,  -5,
                  -6,   1,  -9,   7,   7,  -9,   1,  -6,
                   6,  -8,  -2,  -6,  -6,  -2,  -8,   6,
                 -12,  -9,  -1,  -2,  -2,  -1,  -9, -12,
                  -9, -13, -10,  -9,  -9, -10, -13,  -9,
            ], [ // Queen
                 -75, -52, -43, -36, -36, -43, -52, -75,
                 -50, -27, -24,  -8,  -8, -24, -27, -50,
                 -38, -18, -12,   1,   1, -12, -18, -38,
                 -29,  -6,   9,  21,  21,   9,  -6, -29,
                 -23,  -3,  13,  24,  24,  13,  -3, -23,
                 -39, -18,  -9,   3,   3,  -9, -18, -39,
                 -55, -31, -22,  -4,  -4, -22, -31, -55,
                 -69, -57, -47,- 26,  26, -47, -57, -69,
            ], [ // King
                  11,  59,  73,  78,  78,  73,  59,  11,
                  47, 121, 116, 131, 131, 116, 121,  47,
                  92, 172, 184, 191, 191, 184, 172,  92,
                  96, 166, 199, 199, 199, 199, 166,  96,
                 103, 156, 172, 172, 172, 172, 156, 103,
                  88, 130, 169, 175, 175, 169, 130,  88,
                  53, 100, 133, 135, 135, 133, 100,  53,
                   1,  45,  85,  76,  76,  85,  45,   1,
            ]
        ];

        // Killer moves, History tables
        this.killerMoves = new Array(depth).fill(null).map(()=>[]);
        this.history = Array.from({length:64},()=> new Uint32Array(64));

        // Transposition table
        this.TT = new Map();

        this.nodes = 0;
        this.totalNodes = 0;
    }

    async Play() {
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

        for (const move of moves) {
            const targetBefore = engineState.getPiece(move.tr, move.tc);
            const isCapture = !engineState.isEmpty(targetBefore);

            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            const tactical = move.promote ? 900 : 0;

            const score = -this.minimax(engineState, depth - 1, -beta, -alpha) + tactical;

            engineState.undoMove();

            if (score > best) best = score;
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

        return best;
    }

    scoreMove(engineState, move, depthKey = -1) {
        const target = engineState.getPiece(move.tr, move.tc);
        const moving = engineState.getPiece(move.fr, move.fc);

        let score = 0;

        // 1. MVV-LVA for captures
        if (!engineState.isEmpty(target)) {
            const victimValue = this.MG[this.PIDX[target.toUpperCase()]] || 0;
            const attackerValue = this.MG[this.PIDX[moving.toUpperCase()]] || 0;
            score += victimValue * 10 - attackerValue;
        }

        // 2. Promotions
        if (move.promote) score += 1000;

        // 5. Killer move
        const km = this.killerMoves[depthKey];
        if (km) {
            for (let i = 0; i < km.length; i++) {
                const k = km[i];
                if (k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote) {
                    score += (i === 0) ? 1500 : 1000;
                }
            }
        }

        // 6. History heuristic
        if (engineState.isEmpty(target) && !move.promote) {
            const fromIdx = move.fr * engineState.cols + move.fc;
            const toIdx = move.tr * engineState.cols + move.tc;
            score += this.history[fromIdx][toIdx];
        }

        return score;
    }

    evaluate(engineState) {
        let score = 0;

        // Material
        for (let r = 0; r < engineState.rows; r++) {
            for (let c = 0; c < engineState.cols; c++) {
                const p = engineState.getPiece(r, c);
                    if (engineState.isEmpty(p)) continue;

                const upper = p.toUpperCase();
                const idx = this.PIDX[upper];
    
                // Material
                score += this.MG[idx] || 0;

                // PST bonus
                const pstValue = (p === upper) ? this.PSTM[idx][engineState.toSq(r, c)] : -this.PSTM[idx][engineState.toSq(engineState.rows - 1 - r, c)];
                score += pstValue;

                // Pawn promotion proximity
                if (p === 'P') {
                    if (r === 1) score += 800;
                    else if (r === 2) score += 300;
                } else if (p === 'p') {
                    if (r === engineState.rows - 2) score -= 800;
                    else if (r === engineState.rows - 3) score -= 300;
                }
            }
        }

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true).length;
        const blackMoves = engineState.getPlayerLegalMoves(false).length;
        score += (whiteMoves - blackMoves) * 5;

        // Game-ending states
        if (engineState.gameCondition.startsWith('WHITE_WIN')) score += 999999 - engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('BLACK_WIN')) score += -999999 + engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('DRAW')) score += -500000;

        return engineState.turn === 0 ? score : -score;
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
}