import { delay } from '../utils.js';

export class AIV2 {
    constructor(engine = null, playsWhite = false, depth = 6) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.depth = depth;

        this.piecePoints = {
            'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
            'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000
        };
    }

    async Play() {
        await delay(500);

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;
        
        console.log("AI (" + (this.playsWhite ? "White" : "Black") + ") playing...");

        const best = this.bestMove(this.depth);
            if (!best) return; // no legal moves


        await delay(500);

        // Execute move on real engine
        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        const engine = this.engine;

        const moves = engine.getPlayerLegalMoves(engine.turn === 0);
        console.log(moves);

        let bestScore = -Infinity;
        let bestMove = null;

        for (const move of moves) {
            const copy = engine.minimalClone();
            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            const score = -this.minimax(copy, depth - 1, -Infinity, Infinity);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(engineState, depth, alpha, beta) {
        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.evaluate(engineState);
        }

        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0);

        if (moves.length === 0) {
            return this.evaluate(engineState);
        }

        let best = -Infinity;

        for (const move of moves) {
            const copy = engineState.minimalClone();
            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            // Negamax
            const score = -this.minimax(copy, depth - 1, -beta, -alpha);

            if (score > best) best = score;
            if (score > alpha) alpha = score;

            if (alpha >= beta) break; // alpha–beta cutoff
        }

        return best;
    }

    evaluate(engineState) {
        let score = 0;

        for (let r = 0; r < engineState.rows; r++) {
            for (let c = 0; c < engineState.cols; c++) {
                const p = engineState.board[r][c];
                if (!engineState.isEmpty(p)) score += this.piecePoints[p] || 0;
            }
        }

        // mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true).length;
        const blackMoves = engineState.getPlayerLegalMoves(false).length;
        score += (whiteMoves - blackMoves) * 5;

        // win
        if (engineState.gameCondition.startsWith('WHITE_WIN')) return 999999;
        if (engineState.gameCondition.startsWith('BLACK_WIN')) return -999999;
        if (engineState.gameCondition.startsWith('DRAW')) return -500000;

        return engineState.turn === 0 ? score : -score; 
    }
}