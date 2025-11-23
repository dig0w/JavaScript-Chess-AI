import { delay } from '../utils.js';

export class AIV6 {
    constructor(engine = null, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.depth = depth;

        this.piecePoints = {
            'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
            'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000
        };

        this.pst = {
            P: [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [5, 10, 10, -20, -20, 10, 10, 5],
                [5, -5, -10, 0, 0, -10, -5, 5],
                [0, 0, 0, 20, 20, 0, 0, 0],
                [5, 5, 10, 25, 25, 10, 5, 5],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ],
            N: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20, 0, 5, 5, 0,-20,-40],
                [-30, 5,10,15,15,10, 5,-30],
                [-30, 0,15,20,20,15, 0,-30],
                [-30, 5,15,20,20,15, 5,-30],
                [-30, 0,10,15,15,10, 0,-30],
                [-40,-20, 0, 0, 0, 0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            B: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10, 0, 0, 0, 0, 0, 0,-10],
                [-10, 0, 5,10,10, 5, 0,-10],
                [-10, 5, 5,10,10, 5, 5,-10],
                [-10, 0,10,10,10,10, 0,-10],
                [-10,10,10,10,10,10,10,-10],
                [-10, 5, 0, 0, 0, 0, 5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            R: [
                [0,0,0,0,0,0,0,0],
                [5,10,10,10,10,10,10,5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [0,0,0,5,5,0,0,0]
            ],
            Q: [
                [-20,-10,-10,-5,-5,-10,-10,-20],
                [-10,0,0,0,0,0,0,-10],
                [-10,0,5,5,5,5,0,-10],
                [-5,0,5,5,5,5,0,-5],
                [0,0,5,5,5,5,0,-5],
                [-10,5,5,5,5,5,0,-10],
                [-10,0,5,0,0,0,0,-10],
                [-20,-10,-10,-5,-5,-10,-10,-20]
            ],
            K: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20, 0, 0, 0, 0, 20, 20],
                [20, 30, 10, 0, 0, 10, 30, 20]
            ]
        };

        this.killerMoves = {};

        this.history = Array.from({ length: engine.rows * engine.cols }, () => new Array(engine.rows * engine.cols).fill(0));

        this.nodes = 0;
        this.totalNodes = 0;

        this.count = 0;
        this.moveCount = 0;
    }

    async Play() {
        await delay(1000);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;

        console.log('AI (' + (this.playsWhite ? 'White' : 'Black') + ') playing...');

        this.nodes = 0;

        const best = this.bestMove(this.depth);
        console.log('Best move:', best);
            if (!best) return;

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Count:', this.count);
        console.log('Move Count:', this.moveCount);
        console.log('Move time:', new Date - startTime);

        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        // Generate moves
        const moves = this.engine.getPlayerLegalMoves(this.engine.turn === 0);
            if (moves.length === 0) return null;

        const copy = this.engine.minimalClone();

        // Order moves
        moves.sort((a, b) => this.scoreMove(copy, b, depth) - this.scoreMove(copy, a, depth));

        // let bestScore = -Infinity;
        let bestMove = null;

        let alpha = -Infinity;
        let beta = Infinity;

        // for (const move of moves) {
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];

            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            this.moveCount++;

            // const score = -this.minimax(copy, depth - 1, -Infinity, Infinity);
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

            // if (score > bestScore) {
            //     bestScore = score;
            //     bestMove = move;
            // }
            if (score > alpha) {
                alpha = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(engineState, depth, alpha, beta) {
        this.nodes++;

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.quiescence(engineState, alpha, beta);
        }

        // Generate moves
        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
            if (moves.length === 0) return this.quiescence(engineState, alpha, beta);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b, depth) - this.scoreMove(engineState, a, depth));

        let best = -Infinity;
        const depthKey = depth;

        for (const move of moves) {
            const targetBefore = engineState.board[move.tr][move.tc];
            const isCapture = !engineState.isEmpty(targetBefore);

            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            this.moveCount++;

            const tactical = move.promote ? 900 : 0;

            const score = -this.minimax(engineState, depth - 1, -beta, -alpha) + tactical;

            engineState.undoMove();

            if (score > best) best = score;
            if (score > alpha) alpha = score;

            if (alpha >= beta) {
                // Store killer move (up to 2)
                if (!this.killerMoves[depthKey]) this.killerMoves[depthKey] = [];
                const km = this.killerMoves[depthKey];
                // Avoid duplicates
                if (!km.some(k => k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote)) {
                    km.unshift({ fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc, promote: move.promote });
                    if (km.length > 2) km.pop();
                }

                if (!isCapture && !move.promote) {
                    const idxFrom = move.fr * engineState.cols + move.fc;
                    const idxTo   = move.tr * engineState.cols + move.tc;

                    this.history[idxFrom][idxTo] += depthKey * depthKey;
                }

                break; // beta cutoff
            }
        }

        return best;
    }

    scoreMove(engineState, move, depthKey = -1) {
        const target = engineState.board[move.tr][move.tc];
        const moving = engineState.board[move.fr][move.fc];

        let score = 0;

        // 1. MVV-LVA for captures
        if (!engineState.isEmpty(target)) {
            const victimValue = this.piecePoints[target.toUpperCase()] || 0;
            const attackerValue = this.piecePoints[moving.toUpperCase()] || 0;
            score += victimValue * 100 - attackerValue;
            score += 1000;
        }

        // 2. Promotions
        if (move.promote) score += 2000;

        // 3. Check bonus
        engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            this.moveCount++;
            if (engineState.isKingInCheck(!engineState.isWhite(moving))) score += 50;
        engineState.undoMove();

        // 4. Killer move
        const km = this.killerMoves[depthKey];
        if (km) {
            for (let i = 0; i < km.length; i++) {
                const k = km[i];
                if (k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote) {
                    score += (i === 0) ? 1500 : 1000;
                }
            }
        }

        // 5. History heuristic
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
            .filter(m => !engineState.isEmpty(engineState.board[m.tr][m.tc]) || m.promote);

            if (moves.length === 0) return standPat;

        // Optional: sort captures by MVV-LVA
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        for (const move of moves) {
            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            this.moveCount++;

            const score = -this.quiescence(engineState, -beta, -alpha, qDepth + 1);

            engineState.undoMove();

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    evaluate(engineState) {
        let score = 0;

        for (let r = 0; r < engineState.rows; r++) {
            for (let c = 0; c < engineState.cols; c++) {
                const p = engineState.board[r][c];
                if (engineState.isEmpty(p)) continue;

                // Material
                score += this.piecePoints[p] || 0;

                // PST bonus
                const upper = p.toUpperCase();
                const pstValue = (p === upper) ? this.pst[upper][r][c] : -this.pst[upper][engineState.rows - 1 - r][c];
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

        // Discourage long games
        score -= engineState.totalPlies * 2;

        // Game-ending states
        const result = engineState.evaluateEndConditions();
        if (result) engineState.gameCondition = result;

        if (engineState.gameCondition.startsWith('WHITE_WIN')) score += 999999 - engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('BLACK_WIN')) score += -999999 + engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('DRAW')) score += -500000;

        this.count++;

        return engineState.turn === 0 ? score : -score;
    }
}