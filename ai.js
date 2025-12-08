import { delay } from './utils.js';

export class AI {
    constructor(engine = null, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.depth = depth;

        this.pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

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
        await delay(500);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;
        
        console.log("AI (" + (this.playsWhite ? "White" : "Black") + ") playing...");

        this.nodes = 0;

        const best = this.bestMove(this.depth);
            if (!best) return; // no legal moves

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Move time:', new Date - startTime);

        // Execute move on real engine
        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth) {
        const engine = this.engine;
        const moves = engine.getPlayerLegalMoves(engine.turn === 0);
            if (moves.length == 0) {
                console.log('NO MOVES');
                return null;
            }

        const copy = engine.clone();

        // Move ordering
        moves.sort((a, b) => this.scoreMove(copy, b) - this.scoreMove(copy, a));

        let bestScore = -Infinity;
        let bestMove = null;
        let bestRp;

        let gC;
        let hash;
        let nRC;

        for (const move of moves) {
            const moved = copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            if (!moved) continue;

            let { score, report } = this.minimax(copy, depth - 1, -Infinity, Infinity, '', '');
            score = -score;

            copy.undoMove();

            console.log(move, score);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
                bestRp = report;
            }
        }

        if (bestScore == -Infinity) {
            console.log('NO LEGAL', moves, copy.turn);
            return null;
        }

        console.log('Best move:', bestMove, bestScore, bestRp, moves.length);
        return bestMove;
    }

    minimax(engineState, depth, alpha, beta, alphaRp, betaRp) {
        this.nodes++;

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);
        }

        let moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
            if (moves.length === 0) return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        let best = -Infinity;
        let bestRp = '';

        for (const move of moves) {
            const moved = engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            if (!moved) continue;

            // Negamax
            let { score, report } = this.minimax(engineState, depth - 1, -beta, -alpha, betaRp, alphaRp);
            score = -score;

            if (isNaN(score) || score == Infinity) console.log('SCORE IS INVALID', score);

            engineState.undoMove();

            if (score > best) {
                best = score;
                bestRp = report;
            }
            if (score > alpha) {
                alpha = score;
                alphaRp = report;
            }

            if (alpha >= beta) break; // alpha–beta cutoff
        }

        if (best == -Infinity) return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);

        return { score: best, report: bestRp };
    }

    scoreMove(engineState, move) {
        const target = engineState.getPiece(move.tr, move.tc);
        const moving = engineState.getPiece(move.fr, move.fc);

        let score = 0;

        // 1. MVV-LVA for captures
        if (!engineState.isEmpty(target)) {
            const victimValue = this.pieceValues[target.toUpperCase()] || 0;
            const attackerValue = this.pieceValues[moving.toUpperCase()] || 0;
            score += victimValue * 10 - attackerValue;
        }

        // 2. Promotions
        if (move.promote) score += 1000;

        // 3. Checks
        if (!engineState.moveKeepsKingSafe(move.fr, move.fc, move.tr, move.tc, true)) score += 50;

        return score;
    }

    quiescence(engineState, alpha, beta, qDepth = 0, alphaRp, betaRp) {
        this.nodes++;
        if (qDepth > 3 || engineState.gameCondition !== 'PLAYING') return this.evaluate(engineState);

        const { score: standPat, report: standPatRp } = this.evaluate(engineState);
        if (standPat >= beta) return { score: beta, report: betaRp };
        if (alpha < standPat) {
            alpha = standPat;
            alphaRp = standPatRp;
        }

        // Only captures or promotions
        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0)
            .filter(m => !engineState.isEmpty(engineState.getPiece(m.tr, m.tc)) || m.promote);

        // Move ordering
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        for (const move of moves) {
            const moved = engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            if (!moved) continue;

            let { score, report } = this.quiescence(engineState, -beta, -alpha, qDepth + 1, betaRp, alphaRp);
            score = -score;

            if (isNaN(score) || score == Infinity) console.log('SCORE IS INVALID', score);

            engineState.undoMove();

            if (score >= beta) return { score: beta, report: betaRp };
            if (score > alpha) {
                alpha = score;
                alphaRp = report;
            }
        }

        return { score: alpha, report: alphaRp };
    }

    evaluate(engineState) {
        const side = engineState.turn === 0 ? 1 : -1;

        // End Condition
        if (engineState.gameCondition.startsWith('WHITE_WIN')) return { score: (1000000 - (engineState.totalPlies * 2)) * -side, report: 'WHITE_WIN' };
        if (engineState.gameCondition.startsWith('BLACK_WIN')) return { score: (-1000000 + (engineState.totalPlies * 2)) * -side, report: 'BLACK_WIN' };
        if (engineState.gameCondition.startsWith('DRAW')) return { score: -500 * -side, report: 'DRAW' };

        let score = 0;
        let report = '';

        const rows = engineState.rows;
        const pieces = engineState.pieces;

        const board = Array.from({ length: rows }, () => Array.from({ length: rows }, () => '.'));

        for (const [piece, pieceBB] of Object.entries(pieces)) {
            const bb = pieceBB.clone();

            const isWhite = engineState.isWhite(piece);
            const typeChar = piece.toUpperCase();
            const pieceVal = (this.pieceValues[typeChar] || 0);
            const pst = this.pst[typeChar];
            const dir = isWhite ? 1 : -1;

            let sq = bb.bitIndex();
            while (sq >= 0) {
                const { r, c } = engineState.fromSq(sq);
                board[r][c] = piece;

                report += '\n\nsquare: r: ' + r + ' c: ' + c + ' piece: ' + piece;

                // Material
                score += dir * pieceVal;
                report += '\nmaterial: ' + dir * pieceVal;

                // // PST bonus
                // const pstValue = isWhite ? pst[r][c] : pst[rows - 1 - r][c];
                // score += pstValue;
                // report += '\npst bonus: ' + pstValue;

                // Safety
                if (typeChar !== 'K' && typeChar !== 'P') {
                    const attackers = engineState.getSquareAttacks(r, c, !isWhite);
                    const defenders = engineState.getSquareAttacks(r, c, isWhite);

                    let Avalue = 0;
                    let Dvalue = 0;

                    const sumPieceValues = (bb) => {
                        let total = 0;
                        for (const [p, pBB] of Object.entries(pieces)) {
                            const typeChar = p.toUpperCase();

                            const val = typeChar === 'K' ? 0 : (this.pieceValues[typeChar] || 0); // king usually ignored

                            const masked = bb.and ? bb.and(pBB) : bb.and(bb, pBB);
                            total += masked.popcount() * val;
                        }
                        return total;
                    }

                    Avalue = sumPieceValues(attackers);
                    Dvalue = sumPieceValues(defenders);

                    const safetyValue = Dvalue - Avalue;
                    report += '\nsafetyValue: ' + safetyValue;
                    if (safetyValue !== 0) {
                        score += dir * safetyValue;
                        report += '\nsafety: ' + dir * safetyValue;
                    }
                }

                // Piece Types
                switch (typeChar) {
                    case 'P':
                        // Pawn promotion proximity
                        const progress = isWhite ? (rows - 1 - r) / (rows - 1) : r / (rows - 1);
                        score += dir * Math.pow(progress, 5) * this.pieceValues['Q'];
                        report += '\npromotion: ' + dir * Math.pow(progress, 5) * this.pieceValues['Q'];
                        break;
                    case 'N':
                        break;
                    case 'B':
                        break;
                    case 'R':
                        break;
                    case 'Q':
                        break;
                    case 'K':
                        break;
                }

                bb.clearBit(sq);
                sq = bb.bitIndex();
            }
        }

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true);
        const blackMoves = engineState.getPlayerLegalMoves(false);
        score += (whiteMoves.length - blackMoves.length) * 5;
        report += '\nmobility: ' + (whiteMoves.length - blackMoves.length) * 5;

        // Discourage long games
        score -= engineState.totalPlies * 2;
        report += '\nlong: ' + -(engineState.totalPlies * 2);

        report += '\n\nfinal: ' + score;
        report += '\n\nboard: ';
        for (let index = 0; index < board.length; index++) {
            report += '\n' + board[index].toString();
        }

        report += '\n\nmoves: ';
        for (let index = 0; index < engineState.logs.length; index++) {
            const log = engineState.logs[index];

            report += '\n' + log.originalPiece + ' from ' + log.fr + ' ' + log.fc + ' to ' + log.tr + ' ' + log.tc + ' turn: ' + log.turn;
        }

        if (isNaN(score) || score == Infinity) console.log('SCORE IS INVALID', score);

        return { score: score * side, report };
    }
}