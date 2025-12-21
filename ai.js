import { delay } from './utils.js';
import { ChessEngine } from './chessEngine.js';

export class AI {
    constructor(engine = null, playsWhite = false, timeLimit = 2000) {
        this.engine = engine;
        this.playsWhite = playsWhite;

        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        this.timeLimit = timeLimit;

        this.INFINITY = 1000000;

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

        this.moves = 0;
        this.totalMoves = 0;

        this.genMoves = 0;
        this.totalGenMoves = 0;
    }

    async Play() {
        await delay(500);

        const startTime = new Date;

        const isWhiteTurn = this.engine.turn === 0;
        if (isWhiteTurn !== this.playsWhite) return;
        
        console.log("AI (" + (this.playsWhite ? "White" : "Black") + ") playing...");

        this.nodes = 0;
        this.moves = 0;
        this.genMoves = 0;

        const best = this.bestMove();
            if (!best) return;

        this.totalNodes += this.nodes;
        this.totalMoves += this.moves;
        this.totalGenMoves += this.genMoves;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Moves made:', this.moves, 'Total moves: ', this.totalMoves);
        console.log('Gen Moves made:', this.genMoves, 'Total gen moves: ', this.totalGenMoves);
        console.log('Move time:', new Date - startTime);

        // Execute move on real engine
        this.engine.MovePiece(best.fromSq, best.toSq, best.promote);
    }

    bestMove(timeLimit = this.timeLimit, maxDepth = 100) {
        const startTime = Date.now();
        let deadline = timeLimit ? (startTime + timeLimit) : null;

        const copy = this.engine.clone();

        const moves = copy.getPlayerLegalMoves(copy.turn === 0);
        this.genMoves++;
        if (moves.length == 0) return null;

        let globalBestMove = null;
        let globalBestScore = -this.INFINITY;

        // Move ordering
        moves.sort((a, b) => this.scoreMove(copy, b) - this.scoreMove(copy, a));

        for (let d = 1; d <= maxDepth; d++) {
            if (deadline && Date.now() > deadline) {
                console.log(`Stopping ID at depth ${d-1} due to time limit`);
                break;
            }

            if (globalBestMove) {
                const idx = moves.findIndex(m => m.fromSq === globalBestMove.fromSq && m.toSq === globalBestMove.toSq && m.promote === globalBestMove.promote);
                if (idx > 0) moves.unshift(moves.splice(idx, 1)[0]);
            }

            let alpha = -this.INFINITY;
            let beta = this.INFINITY;

            let bestMoveDepth = null;
            let bestScoreDepth = -this.INFINITY;

            let timedOut = false;

            for (let i = 0; i < moves.length; i++) {
                if (deadline && Date.now() > deadline) {
                    console.log(`Time exceeded during root move loop at depth ${d}`);
                    timedOut = true;
                    break;
                }

                const move = moves[i];
                const moved = copy.MovePiece(move.fromSq, move.toSq, move.promote);
                if (!moved) continue;
                this.moves++;

                let score;
                if (i === 0) {
                    // Full-window for the first move
                    score = -this.minimax(copy, d - 1, -beta, -alpha);
                } else {
                    // Narrow-window (PVS)
                    score = -this.minimax(copy, d - 1, -alpha - 1, -alpha);
                    if (score > alpha) {
                        // Research with full window
                        score = -this.minimax(copy, d - 1, -beta, -alpha);
                    }
                }

                copy.undoMove();

                // if (score == this.INFINITY || score == -this.INFINITY) continue;

                if (score > bestScoreDepth || !bestMoveDepth) {
                    bestScoreDepth = score;
                    bestMoveDepth = move;
                }

                if (score > alpha) {
                    alpha = score;
                }
            }

            if (timedOut) break;

            globalBestMove = bestMoveDepth;
            globalBestScore = bestScoreDepth;

            console.log( globalBestMove, globalBestScore, d);
        }

        console.log('Best move:', globalBestMove, globalBestScore);
        return globalBestMove;
    }


    minimax(engineState, depth, alpha, beta, allowNull = true) {
        this.nodes++;

        // Check TT
        const alphaOrig = alpha;
        const key = engineState.zobrist.hash;

        const ttEntry = this.TT.get(key);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'EXACT') return ttEntry.value;
            if (ttEntry.flag === 'LOWERBOUND') alpha = Math.max(alpha, ttEntry.value);
            if (ttEntry.flag === 'UPPERBOUND') beta = Math.min(beta, ttEntry.value);
            if (alpha >= beta) return ttEntry.value;
        }

        // Terminal condition
        if (depth === 0 || engineState.gameCondition !== 'PLAYING') {
            return this.quiescence(engineState, alpha, beta, 0);
        }

        const inCheck = engineState.isKingInCheck(engineState.turn === 0);

        if (allowNull && depth >= 3 && !inCheck && engineState.hasNonPawnMaterial(engineState.turn)) {
            const R = Math.min(depth - 1, depth >= 6 ? 3 : 2);
            if (R > 0) {
                const prevEp = engineState.enPassantSquare;
                const prevHash = engineState.zobrist.hash;

                engineState.makeNullMove();

                const score = -this.minimax(engineState, depth - 1 - R, -beta, -beta + 1, false);

                engineState.undoNullMove(prevEp, prevHash);

                if (score >= beta) return beta; // fail-high
            }
        }

        // Futility Prune
        let futilityPrune = false;
        if (depth === 1 && !inCheck) {
            const standPat = this.evaluate(engineState);
            // If eval is so bad that even a quiet move can't raise alpha
            if (standPat + 150 <= alpha) {
                futilityPrune = true;
            }
        }

        let moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
        this.genMoves++;
            if (moves.length === 0) return this.quiescence(engineState, alpha, beta, 0);

        // Order moves
        moves.sort((a, b) => this.scoreMove(engineState, b, depth) - this.scoreMove(engineState, a, depth));

        let best = -this.INFINITY;
        let bestMove = null;

        let moveIndex = 0;

        for (const move of moves) {
            moveIndex++;

            const isCapture = !engineState.isEmpty(move.toSq);
            const isPromotion = !!move.promote;

            // Futility prune
            if (futilityPrune && !isCapture && !isPromotion) continue; // prune quiet move

            const moved = engineState.MovePiece(move.fromSq, move.toSq, move.promote);
            if (!moved) continue;
            this.moves++;

            let score;

            // Late Move Reduction
            if (depth >= 3 && moveIndex >= 4 && !isCapture && !isPromotion && !inCheck) {
                // Reduced search
                score = -this.minimax(engineState, depth - 2, -alpha - 1, -alpha);

                // Re-search if it improved alpha
                if (score > alpha) {
                    score = -this.minimax(engineState, depth - 1, -beta, -alpha);
                }
            } else {
                // Negamax
                score = -this.minimax(engineState, depth - 1, -beta, -alpha);
            }

            engineState.undoMove();

            if (score > best) {
                best = score;
                bestMove = move;
            }
            if (score > alpha) {
                alpha = score;
            }

            // Cutoff
            if (alpha >= beta) {
                // Store killer move
                if (!this.killerMoves[depth]) this.killerMoves[depth] = [];
                const km = this.killerMoves[depth];
                if (!km.some(k => k.fromSq === move.fromSq && k.toSq === move.toSq && k.promote === move.promote)) {
                    km.unshift({ fromSq: move.fromSq, toSq: move.toSq, promote: move.promote });
                    if (km.length > 2) km.pop();
                }

                // Store History
                const isCapture = !engineState.isEmpty(move.toSq);
                if (!isCapture && !isPromotion) this.history[move.fromSq][move.toSq] += depth * depth;

                break;
            }
        }

        // Store in TT
        let flag = 'EXACT';
        if (best <= alphaOrig) flag = 'UPPERBOUND';
        else if (best >= beta) flag = 'LOWERBOUND';
        this.TT.set(key, { value: best, depth, flag, bestMove });

        if (best == -this.INFINITY) return this.quiescence(engineState, alpha, beta, 0);

        return best;
    }

    scoreMove(engineState, move, depthKey = -1) {
        const moving = engineState.getPieceSq(move.fromSq);
        const target = engineState.getPieceSq(move.toSq);

        let score = 0;

        // 1. MVV-LVA for captures
        if (!engineState.isEmpty(move.toSq)) {
            const victimValue = this.pieceValues[target.toUpperCase()] || 0;
            const attackerValue = this.pieceValues[moving.toUpperCase()] || 0;
            score += victimValue * 10 - attackerValue;
        }

        // 2. Promotions
        if (move.promote) score += 1000;

        // 3. Checks
        if (!engineState.moveKeepsKingSafe(move.fromSq, move.toSq, true)) score += 50;

        // 4. Killer move heuristic
        const km = this.killerMoves[depthKey];
        if (km) {
            for (let i = 0; i < km.length; i++) {
                const k = km[i];
                if (k.fromSq === move.fromSq && k.toSq === move.toSq && k.promote === move.promote) {
                    score += (i === 0) ? 750 : 500;
                }
            }
        }

        // 5. History heuristic
        if (engineState.isEmpty(move.toSq) && !move.promote) score += this.history[move.fromSq][move.toSq];

        return score;
    }

    quiescence(engineState, alpha, beta, qDepth = 0) {
        this.nodes++;
        if (qDepth > 3 || engineState.gameCondition !== 'PLAYING') return this.evaluate(engineState);

        const standPat = this.evaluate(engineState);
        if (standPat >= beta) return beta;
        if (alpha < standPat) {
            alpha = standPat;
        }

        // Only captures or promotions
        const moves = engineState.getPlayerLegalMoves(engineState.turn === 0).filter(m => !engineState.isEmpty(m.toSq) || m.promote);
        this.genMoves++;

        // Move ordering
        moves.sort((a, b) => this.scoreMove(engineState, b) - this.scoreMove(engineState, a));

        for (const move of moves) {
            // Delta Prune
            if (engineState.isEmpty(move.toSq) === false) {
                const target = engineState.getPieceSq(move.toSq);
                const victimValue = this.pieceValues[target.toUpperCase()] || 0;
                const deltaMargin = 100; // small safety buffer

                // If even the best-case gain can't reach alpha -> prune
                if (standPat + victimValue + deltaMargin < alpha) {
                    continue;
                }
            }

            const moved = engineState.MovePiece(move.fromSq, move.toSq, move.promote);
            if (!moved) continue;
            this.moves++;

            let score = this.quiescence(engineState, -beta, -alpha, qDepth + 1);
            score = -score;

            engineState.undoMove();

            if (score >= beta) return beta;
            if (score > alpha) {
                alpha = score;
            }
        }

        return alpha;
    }

    evaluate(engineState) {
        const side = engineState.turn === 0 ? 1 : -1;

        // End Condition
        if (engineState.gameCondition.startsWith('WHITE_WIN')) return (1000000 - (engineState.totalPlies * 2)) * -side;
        if (engineState.gameCondition.startsWith('BLACK_WIN')) return (-1000000 + (engineState.totalPlies * 2)) * -side;
        if (engineState.gameCondition.startsWith('DRAW')) return -500 * -side;

        let score = 0;

        const rows = engineState.rows;
        const cols = engineState.cols;
        const pieces = engineState.pieces;

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

                // Material
                score += dir * pieceVal;

                // PST bonus
                if (this.engine.isNormal) {
                    const pstValue = isWhite ? pst[r][c] : pst[rows - 1 - r][c];
                    score += pstValue;
                }

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

                        // Doubled pawns
                        if (ownPawnsOnFile > 1) {
                            const penalty = (ownPawnsOnFile - 1) * 5;
                            score += -dir * penalty;
                        }
                        break;
                    case 'N':
                        // Distance to middle
                        const dr = r - ((rows - 1) / 2);
                        const dc = c - ((cols - 1) / 2);
                        const distance = Math.sqrt(dr * dr + dc * dc);

                        score += dir * -distance * 5;
                        break;
                    case 'B':
                        break;
                    case 'R':
                        if (pawnsOnFile === 0) { // Open file bonus
                            score += dir * 20;
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            score += dir * 10;
                        }
                        break;
                    case 'Q':
                        break;
                    case 'K':
                        if (pawnsOnFile === 0) { // Open file bonus
                            score += -dir * 35;
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            score += -dir * 20;
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

        // Discourage long games
        score -= engineState.totalPlies * 2;

        return score * side;
    }
}