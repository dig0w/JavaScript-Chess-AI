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

        this.phaseWeight = {
            P: 0,
            N: 1,
            B: 1,
            R: 2,
            Q: 4,
            K: 0
        };

        this.pieceVal = {
            P: { mg: 100, eg: 120 },
            N: { mg: 320, eg: 310 },
            B: { mg: 330, eg: 330 },
            R: { mg: 500, eg: 510 },
            Q: { mg: 900, eg: 920 },
            K: { mg: 20000, eg: 20000 },
        };

        this.pstMG = {
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

        this.pstEG = {
            P: [
                [0, 0, 0, 0, 0, 0, 0, 0],
                [10, 10, 10, 10, 10, 10, 10, 10],
                [5, 5, 5, 5, 5, 5, 5, 5],
                [0, 0, 0, 10, 10, 0, 0, 0],
                [0, 0, 0, 20, 20, 0, 0, 0],
                [5, 5, 5, 30, 30, 5, 5, 5],
                [10, 10, 10, 50, 50, 10, 10, 10],
                [0, 0, 0, 0, 0, 0, 0, 0]
            ],
            N: [
                [-40,-30,-20,-20,-20,-20,-30,-40],
                [-30,-10, 0, 5, 5, 0,-10,-30],
                [-20, 5,10,15,15,10, 5,-20],
                [-20, 0,15,20,20,15, 0,-20],
                [-20, 5,15,20,20,15, 5,-20],
                [-20, 0,10,15,15,10, 0,-20],
                [-30,-10, 0, 0, 0, 0,-10,-30],
                [-40,-30,-20,-20,-20,-20,-30,-40]
            ],
            B: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10, 0, 0, 0, 0, 0, 0,-10],
                [-10, 0, 5,10,10, 5, 0,-10],
                [-10, 0,10,15,15,10, 0,-10],
                [-10, 0,10,15,15,10, 0,-10],
                [-10, 5,10,10,10,10, 5,-10],
                [-10, 0, 0, 0, 0, 0, 0,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            R: [
                [0,0,0,5,5,0,0,0],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [-5,0,0,0,0,0,0,-5],
                [5,10,10,10,10,10,10,5],
                [0,0,0,0,0,0,0,0]
            ],
            Q: [
                [-20,-10,-10,-5,-5,-10,-10,-20],
                [-10,0,0,0,0,0,0,-10],
                [-10,0,5,5,5,5,0,-10],
                [-5,0,5,5,5,5,0,-5],
                [-5,0,5,5,5,5,0,-5],
                [-10,5,5,5,5,5,0,-10],
                [-10,0,5,0,0,0,0,-10],
                [-20,-10,-10,-5,-5,-10,-10,-20]
            ],
            K: [
                [-50,-40,-30,-20,-20,-30,-40,-50],
                [-40,-20,-10,0,0,-10,-20,-40],
                [-30,-10,20,30,30,20,-10,-30],
                [-20,0,30,40,40,30,0,-20],
                [-20,0,30,40,40,30,0,-20],
                [-30,-10,20,30,30,20,-10,-30],
                [-40,-20,-10,0,0,-10,-20,-40],
                [-50,-40,-30,-20,-20,-30,-40,-50]
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

        let bestMove = null;

        let alpha = -Infinity;
        let beta = Infinity;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];

            copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);
            this.moveCount++;

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
        const board = engineState.board;
        const rows = engineState.rows;
        const cols = engineState.cols;

        let mg = 0;
        let eg = 0;
        let phase = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const p = board[r][c];
                    if (engineState.isEmpty(p)) continue;

                const white = engineState.isWhite(p);
                const type = p.toUpperCase();

                // Material
                const val = this.pieceVal[type];
                const mgPst = this.pstMG[type];
                const egPst = this.pstEG[type];

                // PST bonus
                const mgV = mgPst[r][c];
                const egV = egPst[r][c];

                if (white) {
                    mg += val.mg + mgV;
                    eg += val.eg + egV;
                } else {
                    mg -= val.mg + mgPst[7 - r][c];
                    eg -= val.eg + egPst[7 - r][c];
                }

                if (p.toUpperCase() == 'P') {
                    // Pawn promotion proximity
                    if (white) {
                        const rank = 7 - r;
                        const value = Math.pow(rank / (rows - 1), 5);

                        mg += value * (this.pieceVal.Q.mg / 1.5);
                        eg += value * (this.pieceVal.Q.eg - 20);
                    } else {
                        const rank = r;
                        const value = Math.pow(rank / (rows - 1), 5);

                        mg -= value * (this.pieceVal.Q.mg / 1.5);
                        eg -= value * (this.pieceVal.Q.eg - 20);
                    }

                    // Doubled pawns
                    let pawnCount = 0;
                    for (let rr = 0; rr < rows; rr++) {
                        const sq = board[rr][c];
                        if ((white && engineState.isWhite(sq)) || (!white && engineState.isBlack(sq))) pawnCount++;
                    }
                    if (pawnCount > 1) {
                        const penalty = (pawnCount - 1) * 1;
                        mg += white ? -penalty : penalty;
                        eg += white ? -penalty : penalty;
                    }
                }

                phase += this.phaseWeight[type];
            }
        }

        // Normalize phase (0 = EG, 24 = MG)
        if (phase > 24) phase = 24;

        // Tapered eval
        let score = (mg * phase + eg * (24 - phase)) / 24;

        // King safety
        if (engineState.isKingInCheck(true))  score -= 20;
        if (engineState.isKingInCheck(false)) score += 20;

        // Mobility
        const whiteMoves = engineState.getPlayerLegalMoves(true);
        const blackMoves = engineState.getPlayerLegalMoves(false);
        score += (whiteMoves.length - blackMoves.length) * 5;

        // Hanging pieces penalty
        score += this.hangingPenalty(blackMoves, true, board, this.pieceVal);
        score += this.hangingPenalty(whiteMoves, false, board, this.pieceVal);

        // Fork penalty
        score += this.forkPenalty(blackMoves, board, this.pieceVal, true);
        score += this.forkPenalty(whiteMoves, board, this.pieceVal, false);

        // Discourage long games
        score -= engineState.totalPlies * 2;

        this.count++;

        return engineState.turn === 0 ? score : -score;
    }

    hangingPenalty(moves, isWhitePiece, board, pieceVal) {
        if (!moves) return 0;

        let penalty = 0;

        for (const m of moves) {
            if (!m.capture) continue; // only capture moves
            const target = board[m.to.r][m.to.c];
            if (!target) continue;

            if (isWhitePiece && target === target.toUpperCase()) {
                penalty -= pieceVal[target.toUpperCase()].mg * 0.2;
            }
            if (!isWhitePiece && target === target.toLowerCase()) {
                penalty += pieceVal[target.toUpperCase()].mg * 0.2;
            }
        }
        return penalty;
    }

    forkPenalty(moves, board, pieceVal, whiteFork) {
        if (!moves) return 0;

        let penalty = 0;

        for (const m of moves) {
            if (!m.capture) continue;
            const from = m.from;
            const piece = board[from.r][from.c];

            // only apply if the attacking piece is minor/major (not pawn)
            const attackerType = piece.toUpperCase();
            if (attackerType === "P") continue;

            let hits = 0;
            for (const m2 of moves) {
                if (m2 === m) continue;
                if (!m2.capture) continue;
                const target = board[m2.to.r][m2.to.c];
                if (!target) continue;
                const val = pieceVal[target.toUpperCase()].mg;
                if (val >= pieceVal.N.mg) hits++; // knights or better
            }

            if (hits >= 2) penalty += 30; // lightweight fork punishment
        }

        return whiteFork ? -penalty : +penalty;
    }
}