import { delay } from '../utils.js';

export class AIV1 {
    constructor(engine = null, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.depth = depth;

        this.nodes = 0;
        this.totalNodes = 0;
    }

    async Play() {
        await delay(1000);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;
        
        console.log("AI (" + (this.playsWhite ? "White" : "Black") + ") playing...");

        this.nodes = 0;

        const best = this.bestMove(this.depth);
            if (!best) return; // no legal moves

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Best move:', best);
        console.log('Move time:', new Date - startTime);

        // Execute move on real engine
        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        const engine = this.engine;

        const moves = engine.getPlayerLegalMoves(engine.turn === 0);

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
        this.nodes++;

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

    evaluate(engineState) {
        return engineState.whitePoints - engineState.blackPoints;
    }
}