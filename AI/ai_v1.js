import { delay } from '../utils.js';

export class AIV1 {
    constructor(engine = null, playsWhite = false) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.depth = 6;
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
            const copy = engine.clone();
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
            return engineState.evaluate();
        }

        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0);

        if (moves.length === 0) {
            return engineState.evaluate();
        }

        let best = -Infinity;

        for (const move of moves) {
            const copy = engineState.clone();
            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

            // Negamax
            const score = -this.minimax(copy, depth - 1, -beta, -alpha);

            if (score > best) best = score;
            if (score > alpha) alpha = score;

            if (alpha >= beta) break; // alpha–beta cutoff
        }

        return best;
    }
}