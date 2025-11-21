import { delay } from '../utils.js';

export class AIV5 {
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

        this.nodes = 0;
        this.totalNodes = 0;
    }

    async Play() {
        await delay(1000);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;

        console.log('AI (' + (this.playsWhite ? 'White' : 'Black') + ') playing...');

        this.nodes = 0;

        const best = this.bestMove(this.depth);
            if (!best) return;

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Best move:', best);
        console.log('Move time:', new Date - startTime);

        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        const engine = this.engine;
        const moves = engine.getPlayerLegalMoves(engine.turn === 0);

        // Move ordering: sort moves by heuristic
        moves.sort((a, b) => this.scoreMove(engine, b) - this.scoreMove(engine, a));

        let bestScore = -Infinity;
        let bestMove = null;

        const copy = engine.minimalClone();

        for (const move of moves) {
            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            const score = -this.minimax(copy, depth - 1, -Infinity, Infinity);

            copy.undoMove();

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(engineState, depth, alpha, beta) {
        this.nodes++;

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.evaluate(engineState);
        }

        let moves = engineState.getPlayerLegalMoves(engineState.turn === 0);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        if (moves.length === 0) return this.evaluate(engineState);

        let best = -Infinity;

        for (const move of moves) {
            engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            // const copy = engineState.minimalClone();
            // copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            let tactical = 0;
            if (move.promote) tactical += 900;

            // const score = -this.minimax(copy, depth - 1, -beta, -alpha) + tactical;
            const score = -this.minimax(engineState, depth - 1, -beta, -alpha) + tactical;

            engineState.undoMove();

            if (score > best) best = score;
            if (score > alpha) alpha = score;

            if (alpha >= beta) break; // alpha-beta cutoff
        }

        return best;
    }

    scoreMove(engineState, move) {
        const target = engineState.board[move.tr][move.tc];
        const moving = engineState.board[move.fr][move.fc];

        let score = 0;

        // Capture (MVV-LVA)
        if (!engineState.isEmpty(target)) {
            const victimValue = this.piecePoints[target.toUpperCase()] || 0;
            const attackerValue = this.piecePoints[moving.toUpperCase()] || 0;
            score += victimValue * 10 - attackerValue;
        }

        // Promotion bonus
        if (move.promote) score += 1000;

        // Check bonus
        const copy = engineState.minimalClone();
        copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
        if (copy.isKingInCheck(!engineState.isWhite(moving))) score += 50;

        return score;
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
        if (engineState.gameCondition.startsWith('WHITE_WIN')) score += 999999 - engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('BLACK_WIN')) score += -999999 + engineState.totalPlies * 50;
        else if (engineState.gameCondition.startsWith('DRAW')) score += -500000;

        return engineState.turn === 0 ? score : -score;
    }
}