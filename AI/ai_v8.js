import { delay } from '../utils.js';
import { ChessEngine } from '../faster/chessEngine.js';

export class AIV8 {
    constructor(engine, playsWhite = false, depth = 2) {
        this.engine = engine;
        this.playsWhite = playsWhite;
        this.depth = depth;

        // AI links into engine
        if (playsWhite) engine.whiteAI = this;
        else engine.blackAI = this;

        // Material values
        this.mgValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
        this.egValues = { P: 120, N: 310, B: 330, R: 510, Q: 920, K: 20000 };

        this.phaseWeight = { P: 0, N: 1, B: 1, R: 2, Q: 4, K: 0 };

        // Piece-square tables
        this.mgPst = {
            P: [
                0, 0, 0, 0, 0, 0, 0, 0,
                5, 10, 10, -20, -20, 10, 10, 5,
                5, -5, -10, 0, 0, -10, -5, 5,
                0, 0, 0, 20, 20, 0, 0, 0,
                5, 5, 10, 25, 25, 10, 5, 5,
                10, 10, 20, 30, 30, 20, 10, 10,
                50, 50, 50, 50, 50, 50, 50, 50,
                0, 0, 0, 0, 0, 0, 0, 0
            ],
            N: [
                -50,-40,-30,-30,-30,-30,-40,-50,
                -40,-20, 0, 5, 5, 0,-20,-40,
                -30, 5,10,15,15,10, 5,-30,
                -30, 0,15,20,20,15, 0,-30,
                -30, 5,15,20,20,15, 5,-30,
                -30, 0,10,15,15,10, 0,-30,
                -40,-20, 0, 0, 0, 0,-20,-40,
                -50,-40,-30,-30,-30,-30,-40,-50
            ],
            B: [
                -20,-10,-10,-10,-10,-10,-10,-20,
                -10, 0, 0, 0, 0, 0, 0,-10,
                -10, 0, 5,10,10, 5, 0,-10,
                -10, 5, 5,10,10, 5, 5,-10,
                -10, 0,10,10,10,10, 0,-10,
                -10,10,10,10,10,10,10,-10,
                -10, 5, 0, 0, 0, 0, 5,-10,
                -20,-10,-10,-10,-10,-10,-10,-20
            ],
            R: [
                0,0,0,0,0,0,0,0,
                5,10,10,10,10,10,10,5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                0,0,0,5,5,0,0,0
            ],
            Q: [
                -20,-10,-10,-5,-5,-10,-10,-20,
                -10,0,0,0,0,0,0,-10,
                -10,0,5,5,5,5,0,-10,
                -5,0,5,5,5,5,0,-5,
                0,0,5,5,5,5,0,-5,
                -10,5,5,5,5,5,0,-10,
                -10,0,5,0,0,0,0,-10,
                -20,-10,-10,-5,-5,-10,-10,-20
            ],
            K: [
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,
                -20,-30,-30,-40,-40,-30,-30,-20,
                -10,-20,-20,-20,-20,-20,-20,-10,
                20, 20, 0, 0, 0, 0, 20, 20,
                20, 30, 10, 0, 0, 10, 30, 20
            ]
        };
        this.egPst = {
            P: [
                0, 0, 0, 0, 0, 0, 0, 0,
                10, 10, 10, 10, 10, 10, 10, 10,
                5, 5, 5, 5, 5, 5, 5, 5,
                0, 0, 0, 10, 10, 0, 0, 0,
                0, 0, 0, 20, 20, 0, 0, 0,
                5, 5, 5, 30, 30, 5, 5, 5,
                10, 10, 10, 50, 50, 10, 10, 10,
                0, 0, 0, 0, 0, 0, 0, 0
            ],
            N: [
                -40,-30,-20,-20,-20,-20,-30,-40,
                -30,-10, 0, 5, 5, 0,-10,-30,
                -20, 5,10,15,15,10, 5,-20,
                -20, 0,15,20,20,15, 0,-20,
                -20, 5,15,20,20,15, 5,-20,
                -20, 0,10,15,15,10, 0,-20,
                -30,-10, 0, 0, 0, 0,-10,-30,
                -40,-30,-20,-20,-20,-20,-30,-40
            ],
            B: [
                -20,-10,-10,-10,-10,-10,-10,-20,
                -10, 0, 0, 0, 0, 0, 0,-10,
                -10, 0, 5,10,10, 5, 0,-10,
                -10, 0,10,15,15,10, 0,-10,
                -10, 0,10,15,15,10, 0,-10,
                -10, 5,10,10,10,10, 5,-10,
                -10, 0, 0, 0, 0, 0, 0,-10,
                -20,-10,-10,-10,-10,-10,-10,-20
            ],
            R: [
                0,0,0,5,5,0,0,0,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                -5,0,0,0,0,0,0,-5,
                5,10,10,10,10,10,10,5,
                0,0,0,0,0,0,0,0
            ],
            Q: [
                -20,-10,-10,-5,-5,-10,-10,-20,
                -10,0,0,0,0,0,0,-10,
                -10,0,5,5,5,5,0,-10,
                -5,0,5,5,5,5,0,-5,
                -5,0,5,5,5,5,0,-5,
                -10,5,5,5,5,5,0,-10,
                -10,0,5,0,0,0,0,-10,
                -20,-10,-10,-5,-5,-10,-10,-20
            ],
            K: [
                -50,-40,-30,-20,-20,-30,-40,-50,
                -40,-20,-10,0,0,-10,-20,-40,
                -30,-10,20,30,30,20,-10,-30,
                -20,0,30,40,40,30,0,-20,
                -20,0,30,40,40,30,0,-20,
                -30,-10,20,30,30,20,-10,-30,
                -40,-20,-10,0,0,-10,-20,-40,
                -50,-40,-30,-20,-20,-30,-40,-50
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

        const best = this.bestMove(this.depth, 2000);
            if (!best) return;

        this.totalNodes += this.nodes;

        console.log('Nodes searched:', this.nodes, 'Total nodes: ', this.totalNodes);
        console.log('Move time:', new Date - startTime);

        this.engine.MovePiece(best.fr, best.fc, best.tr, best.tc, best.promote);
    }

    moveKey(m) {
        return `${m.fr},${m.fc},${m.tr},${m.tc},${m.promote || 0}`;
    }

    bestMove(maxDepth, timeLimitMs = null) {
        const startTime = Date.now();
        let deadline = timeLimitMs ? (startTime + timeLimitMs) : null;

        // Root score table
        const rootScores = new Map();
        
        let globalBestMove = null;
        let globalBestScore = -Infinity;

        const copy = this.engine.clone();

        for (let d = 1; d <= maxDepth; d++) {
            if (deadline && Date.now() > deadline) {
                console.log(`Stopping ID at depth ${d-1} due to time limit`);
                break;
            }

            const moves = copy.getPlayerLegalMoves(copy.turn === 0);
                if (moves.length === 0) return null;

            // Move ordering
            moves.sort((a, b) => this.scoreMove(copy, b, d) - this.scoreMove(copy, a, d));

            if (globalBestMove) {
                const idx = moves.findIndex(m => m.fr === globalBestMove.fr && m.fc === globalBestMove.fc &&
                                                m.tr === globalBestMove.tr && m.tc === globalBestMove.tc &&
                                                (m.promote || null) === (globalBestMove.promote || null));
                if (idx > 0) {
                    moves.unshift(moves.splice(idx, 1)[0]);
                }
            }

            let alpha = -Infinity;
            let beta = Infinity;

            let depthBestMove = null;
            let depthBestScore = -Infinity;

            let timedOut = false;

            for (let i = 0; i < moves.length; i++) {
                if (deadline && Date.now() > deadline) {
                    console.log(`Time exceeded during root move loop at depth ${d}`);
                    timedOut = true;
                    break;
                }
                
                const m = moves[i];
                const key = this.moveKey(m);

                copy.MovePiece(m.fr, m.fc, m.tr, m.tc, m.promote);

                const newMoves = copy.getPlayerLegalMoves(copy.turn === 0);

                let score;
                if (i === 0) {
                    // full-window for the first move
                    score = -this.minimax(copy, d - 1, -beta, -alpha, newMoves);
                } else {
                    // narrow-window (PVS)
                    score = -this.minimax(copy, d - 1, -alpha - 1, -alpha, newMoves);
                    if (score > alpha) {
                        // research with full window
                        score = -this.minimax(copy, d - 1, -beta, -alpha, newMoves);
                    }
                }

                copy.undoMove();

                rootScores.set(key, { move: m, score });

                // if (score > depthBestScore) {
                //     console.log(m, score, depthBestScore, d);
                //     depthBestScore = score;
                //     depthBestMove = m;
                // }

                if (score > alpha) alpha = score;
            }

            // if (timedOut) { break; }

            let bestEntry = null;
            for (const entry of rootScores.values()) {
                if (!bestEntry || entry.score > bestEntry.score) {
                    bestEntry = entry;
                }
            }

            if (bestEntry) {
                globalBestMove = bestEntry.move;
                globalBestScore = bestEntry.score;
            }
        }

        console.log(rootScores);

        console.log('Best move:', globalBestMove, globalBestScore);

        return globalBestMove;
    }

    minimax(engineState, depth, alpha, beta, newMoves = null) {
        this.nodes++;

        const alphaOrig = alpha;

        // Check TT
        const key = engineState.zobrist.hash;
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
            if (engineState.gameCondition.startsWith('WHITE_WIN'))
                return (1000000 - engineState.totalPlies * 50) * (this.playsWhite ? -1 : 1);

            if (engineState.gameCondition.startsWith('BLACK_WIN'))
                return (-1000000 - engineState.totalPlies * 50) * (this.playsWhite ? -1 : 1);

            if (engineState.gameCondition.startsWith('DRAW'))
                return 500;

            return this.quiescence(engineState, alpha, beta);
        }

        // Generate moves
        let moves = newMoves;
            if (!moves) moves = engineState.getPlayerLegalMoves(engineState.turn === 0);
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
                // Store killer move
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

        const pieces = engineState.pieces;

        const mgValues = this.mgValues;
        const egValues = this.egValues;
        const mgPst = this.mgPst;
        const egPst = this.egPst;
        const phaseWeight = this.phaseWeight;

        const whitePawns = pieces['P'].clone();
        const blackPawns = pieces['p'].clone();
        const pawnsBB = whitePawns.or(blackPawns);

        let mg = 0, eg = 0, phase = 0;

        const order = ['P','N','B','R','Q','K','p','n','b','r','q','k'];

        for (const pc of order) {
            const bb = pieces[pc].clone();
                if (!bb) continue;

            const isWhitePiece = (pc === pc.toUpperCase());
            const typeChar = pc.toUpperCase();

            const mgVal = mgValues[typeChar];
            const egVal = egValues[typeChar];

            let sq = bb.bitIndex();
            while (sq >= 0) {
                // Material
                if (isWhitePiece) {
                    mg += mgVal;
                    eg += egVal;
                } else {
                    mg -= mgVal;
                    eg -= egVal;
                }
                
                // PST
                if (isWhitePiece) {
                    mg += mgPst[typeChar][sq];
                    eg += egPst[typeChar][sq];
                } else {
                    const { r, c } = engineState.fromSq(sq);
                    const mirSq = engineState.toSq(rows - 1 - r, c);
                    mg -= mgPst[typeChar][mirSq];
                    eg -= egPst[typeChar][mirSq];
                }

                const { r, c: file } = engineState.fromSq(sq);

                const pawnsOnFile = pawnsBB.popcount32(pawnsBB.and(ChessEngine.fileMasks[file]));
                const ownPawnsOnFile = isWhitePiece ?
                                       whitePawns.popcount32(whitePawns.and(ChessEngine.fileMasks[file])) :
                                       blackPawns.popcount32(blackPawns.and(ChessEngine.fileMasks[file]));
                
                // Safety
                if (typeChar !== 'K' && typeChar !== 'P') {
                    const attackers = engineState.getSquareAttacks(r, file, !isWhitePiece);
                    const defenders = engineState.getSquareAttacks(r, file, isWhitePiece);

                    const A = attackers.popcount32(attackers);
                    const D = defenders.popcount32(defenders);

                    let safety = D - A;

                    if (safety > 0) { // More defended than attacked
                        if (isWhitePiece) {
                            mg += safety * mgVal;
                            eg += safety * egVal;
                        } else {
                            mg -= safety * mgVal;
                            eg -= safety * egVal;
                        }
                    } else if (safety < 0) { // More attacked than defended
                        const penalty = Math.min(-safety, 1);
                        if (isWhitePiece) {
                            mg -= safety * mgVal;
                            eg -= safety * 0.5 * egVal;
                        } else {
                            mg += safety + mgVal;
                            eg += safety * 0.5 * egVal;
                        }
                    }
                }

                switch (typeChar) {
                    case 'P':
                        // Pawn promotion proximity
                        const progress = isWhitePiece ? (rows - 1 - r) / (rows - 1) : r / (rows - 1);
                        const promoWeight = Math.pow(progress, 5);
                        const queenMg = this.mgValues['Q'];
                        const queenEg = this.egValues['Q'];

                        if (isWhitePiece) {
                            mg += promoWeight * (queenMg / 1.5);
                            eg += promoWeight * (queenEg - 20);
                        } else {
                            mg -= promoWeight * (queenMg / 1.5);
                            eg -= promoWeight * (queenEg - 20);
                        }

                        // Doubled pawns
                        if (pawnsOnFile > 1) {
                            const penalty = (pawnsOnFile - 1) * 5;
                            if (isWhitePiece) {
                                mg -= penalty;
                                eg -= penalty;
                            } else {
                                mg += penalty;
                                eg += penalty;
                            }
                        }
                        break;
                    case 'N':
                        break;
                    case 'B':
                        break;
                    case 'R':
                        if (pawnsOnFile === 0) { // Open file bonus
                            if (isWhitePiece) {
                                mg += 20;
                                eg += 30;
                            } else {
                                mg -= 20;
                                eg -= 30;
                            }
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            if (isWhitePiece) {
                                mg += 10;
                                eg += 15;
                            } else {
                                mg -= 10;
                                eg -= 15;
                            }
                        }
                        break;
                    case 'Q':
                        break;
                    case 'K':
                        if (pawnsOnFile === 0) { // Open file bonus
                            if (isWhitePiece) {
                                mg -= 35;
                                eg -= 5;
                            } else {
                                mg += 35;
                                eg += 5;
                            }
                        } else if (ownPawnsOnFile === 0) { // Semi-open file bonus
                            if (isWhitePiece) {
                                mg -= 20;
                                eg -= 3;
                            } else {
                                mg += 20;
                                eg += 3;
                            }
                        }
                        break;
                }

                phase += phaseWeight[typeChar];

                bb.clearBit(sq);
                sq = bb.bitIndex();
            }
        }

        // Normalize phase (0 = EG, 24 = MG)
        if (phase > 24) phase = 24;
        if (phase < 0) phase = 0;

        // Tapered eval
        let score = (mg * phase + eg * (24 - phase)) / 24;

        // King safety
        if (engineState.isKingInCheck(true))  score -= 20;
        if (engineState.isKingInCheck(false)) score += 20;

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true).length;
        const blackMoves = engineState.getPlayerLegalMoves(false).length;
        score += (whiteMoves - blackMoves) * 5;

        // Castling Rights
        score += engineState.castlingRights.whiteKingSide ? 5 : -5;
        score += engineState.castlingRights.whiteQueenSide ? 5 : -5;
        score += engineState.castlingRights.blackKingSide ? -5 : 5;
        score += engineState.castlingRights.blackQueenSide ? -5 : 5;

        // Discourage long games
        score -= engineState.totalPlies * 2;

        return engineState.turn === 0 ? score : -score;
    }
}
