import { delay } from './utils.js';
import { ChessEngine } from './chessEngine.js';

export class AI {
    constructor(engine = null, playsWhite = false, depth = 4) {
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

        this.killerMoves = {};
        this.history = Array.from({ length: engine.rows * engine.cols }, () => new Array(engine.rows * engine.cols).fill(0));
        this.TT = new Map();

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

        const best = this.bestMove();
            if (!best) return;

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Move time:', new Date - startTime);

        // Execute move on real engine
        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    bestMove(depth = this.depth) {
        const engine = this.engine;
        const moves = engine.getPlayerLegalMoves(engine.turn === 0);
            if (moves.length == 0) {
                console.log('NO MOVES');
                return null;
            }

        const copy = engine.clone();

        // Move ordering
        moves.sort((a, b) => this.scoreMove(copy, b, depth) - this.scoreMove(copy, a, depth));

        let bestScore = -Infinity;
        let bestMove = null;
        let bestRp;

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

        // Check TT
        const alphaOrig = alpha;
        const key = engineState.zobrist.hash;
        if (this.TT.has(key)) {
            const entry = this.TT.get(key);

            if (entry.depth >= depth) {
                if (entry.flag === 'EXACT') return { score: entry.value, report: 'TT' };
                if (entry.flag === 'LOWERBOUND') alpha = Math.max(alpha, entry.value);
                if (entry.flag === 'UPPERBOUND') beta = Math.min(beta, entry.value);
                if (alpha >= beta) return { score: entry.value, report: 'TT' };
            }
        }

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);
        }

        const isChecked = engineState.isKingInCheck(engineState.turn === 0);

        // Futility Prune
        let futilityPrune = false;
        if (depth === 1) {
            const standPat = this.evaluate(engineState).score;

            const futilityMargin = 150;

            // If eval is so bad that even a quiet move can't raise alpha
            if (!isChecked && standPat + futilityMargin <= alpha) {
                futilityPrune = true;
            }
        }

        let moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
            if (moves.length === 0) return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b, depth) - this.scoreMove(engineState, a, depth));

        let best = -Infinity;
        let bestMove = null;
        let bestRp = '';

        let moveIndex = 0;

        for (const move of moves) {
            moveIndex++;

            const target = engineState.getPiece(move.tr, move.tc);
            const isCapture = !engineState.isEmpty(target);
            const isPromotion = !!move.promote;

            // Futility prune
            if (futilityPrune && !isCapture && !isPromotion) continue; // prune quiet move

            const moved = engineState.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            if (!moved) continue;

            let score;
            let report;

            // Late Move Reduction
            if (depth >= 3 && moveIndex >= 4 && !isCapture && !isPromotion) {
                // Reduced search
                const { score: score1, report: report1 } = this.minimax(engineState, depth - 2, -alpha - 1, -alpha);
                score = score1;
                report = report1;

                // Re-search if it improved alpha
                if (score > alpha) {
                    const { score: score2, report: report2 } = this.minimax(engineState, depth - 1, -beta, -alpha);

                    score = score2;
                    report = report2;
                }
            } else {
                // Negamax
                const { score: score3, report: report3 } = this.minimax(engineState, depth - 1, -beta, -alpha);

                score = score3;
                report = report3;
            }

            score = -score;

            if (isNaN(score) || score == Infinity) console.log('SCORE IS INVALID', score);

            engineState.undoMove();

            if (score > best) {
                best = score;
                bestMove = move;
                bestRp = report;
            }
            if (score > alpha) {
                alpha = score;
                alphaRp = report;
            }

            if (alpha >= beta) {
                // Store killer move
                if (!this.killerMoves[depth]) this.killerMoves[depth] = [];
                const km = this.killerMoves[depth];
                if (!km.some(k => k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote)) {
                    km.unshift({ fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc, promote: move.promote });
                    if (km.length > 2) km.pop();
                }

                // Store History
                const targetBefore = engineState.getPiece(move.tr, move.tc);
                const isCapture = !engineState.isEmpty(targetBefore);

                if (!isCapture && !move.promote) {
                    const idxFrom = move.fr * engineState.cols + move.fc;
                    const idxTo   = move.tr * engineState.cols + move.tc;

                    this.history[idxFrom][idxTo] += depth ^ 2;
                }

                break; // alpha–beta cutoff
            }
        }

        // Store in TT
        let flag = 'EXACT';
        if (best <= alphaOrig) flag = 'UPPERBOUND';
        else if (best >= beta) flag = 'LOWERBOUND';
        this.TT.set(key, { value: best, depth, flag, bestMove });

        if (best == -Infinity) return this.quiescence(engineState, alpha, beta, 0, alphaRp, betaRp);

        return { score: best, report: bestRp };
    }

    scoreMove(engineState, move, depthKey = -1) {
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

        // 4. Killer move heuristic
        const km = this.killerMoves[depthKey];
        if (km) {
            for (let i = 0; i < km.length; i++) {
                const k = km[i];
                if (k.fr === move.fr && k.fc === move.fc && k.tr === move.tr && k.tc === move.tc && k.promote === move.promote) {
                    score += (i === 0) ? 750 : 500;
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
            // Delta Prune
            const target = engineState.getPiece(move.tr, move.tc);
            if (engineState.isEmpty(target) === false) {
                const victimValue = this.pieceValues[target.toUpperCase()] || 0;
                const deltaMargin = 100; // small safety buffer

                // If even the best-case gain can't reach alpha → prune
                if (standPat + victimValue + deltaMargin < alpha) {
                    continue;
                }
            }

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
        const cols = engineState.cols;
        const pieces = engineState.pieces;

        const board = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));

        const whitePawns = pieces['P'].clone();
        const blackPawns = pieces['p'].clone();
        const pawnsBB = whitePawns.or(blackPawns);

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

                // PST bonus
                if (this.engine.isNormal) {
                    const pstValue = isWhite ? pst[r][c] : pst[rows - 1 - r][c];
                    score += pstValue;
                    report += '\npst bonus: ' + pstValue;
                }

                // // Safety
                // if (typeChar !== 'K' && typeChar !== 'P') {
                //     const attackers = engineState.getSquareAttacks(r, c, !isWhite);
                //     const defenders = engineState.getSquareAttacks(r, c, isWhite);

                //     let Avalue = 0;
                //     let Dvalue = 0;

                //     const sumPieceValues = (bb) => {
                //         let total = 0;
                //         for (const [p, pBB] of Object.entries(pieces)) {
                //             const typeChar = p.toUpperCase();

                //             const val = typeChar === 'K' ? 0 : (this.pieceValues[typeChar] || 0);

                //             const masked = bb.and ? bb.and(pBB) : bb.and(bb, pBB);
                //             total += masked.popcount() * val;
                //         }
                //         return total;
                //     }

                //     Avalue = sumPieceValues(attackers);
                //     Dvalue = sumPieceValues(defenders);

                //     const safetyValue = Dvalue - Avalue;
                //     if (safetyValue !== 0) {
                //         score += -dir * safetyValue * .5;
                //         report += '\nsafety: ' + -dir * safetyValue * .5;
                //     }
                // }

                const pawnsOnFile = pawnsBB.and(ChessEngine.fileMasks[c]).popcount();
                const ownPawnsOnFile = isWhite ?
                                        whitePawns.and(ChessEngine.fileMasks[c]).popcount() :
                                        blackPawns.and(ChessEngine.fileMasks[c]).popcount();

                // Piece Types
                switch (typeChar) {
                    case 'P':
                        // Promotion proximity
                        const progress = isWhite ? (rows - 1 - r) / (rows - 1) : r / (rows - 1);
                        score += dir * Math.pow(progress, 5) * this.pieceValues['Q'];
                        report += '\npromotion: ' + dir * Math.pow(progress, 5) * this.pieceValues['Q'];

                        // Doubled pawns
                        if (ownPawnsOnFile > 1) {
                            const penalty = (ownPawnsOnFile - 1) * 5;
                            score += -dir * penalty;
                            report += '\ndoubled: ' + -dir * penalty;
                        }
                        break;
                    case 'N':
                        // Distance to middle
                        const dr = r - ((rows - 1) / 2);
                        const dc = c - ((cols - 1) / 2);
                        const distance = Math.sqrt(dr * dr + dc * dc);

                        score += dir * -distance * 5;
                        report += '\nknight to middle: ' + dir * -distance * 5;
                        break;
                    case 'B':
                        break;
                    case 'R':
                        if (pawnsOnFile === 0) { // Open file bonus
                            score += dir * 20;
                            report += '\nopen rook: ' + dir * 20 + ' | ' + pawnsOnFile;
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            score += dir * 10;
                            report += '\nsemi open rook: ' + dir * 10 + ' | ' + ownPawnsOnFile;
                        }
                        break;
                    case 'Q':
                        break;
                    case 'K':
                        if (pawnsOnFile === 0) { // Open file bonus
                            score += -dir * 35;
                            report += '\nopen king: ' + -dir * 35 + ' | ' + pawnsOnFile;
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            score += -dir * 20;
                            report += '\nsemi open king: ' + -dir * 20 + ' | ' + ownPawnsOnFile;
                        }
                        break;
                }

                bb.clearBit(sq);
                sq = bb.bitIndex();
            }
        }

        // Castling Rights
        score += engineState.castlingRights.whiteKingSide ? 5 : -5;
        score += engineState.castlingRights.whiteQueenSide ? 5 : -5;
        score += engineState.castlingRights.blackKingSide ? -5 : 5;
        score += engineState.castlingRights.blackQueenSide ? -5 : 5;
        report += '\n\nwhite King: ' + (engineState.castlingRights.whiteKingSide ? 5 : -5);
        report += '\nwhite Queen: ' + (engineState.castlingRights.whiteQueenSide ? 5 : -5);
        report += '\nblack King: ' + (engineState.castlingRights.blackKingSide ? -5 : 5);
        report += '\nblack Queen: ' + (engineState.castlingRights.blackQueenSide ? -5 : 5);

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true);
        const blackMoves = engineState.getPlayerLegalMoves(false);
        score += (whiteMoves.length - blackMoves.length) * 10;
        report += '\n\nmobility: ' + (whiteMoves.length - blackMoves.length) * 10;

        // Discourage long games
        score -= engineState.totalPlies * 2;
        report += '\nlong games: ' + -(engineState.totalPlies * 2);

        report += '\n\nfinal: ' + score * side;
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