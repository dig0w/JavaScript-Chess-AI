export class Zobrist {
    constructor(rows = 8, cols = 8) {
        this.rows = rows;
        this.cols = cols;

        this.piece = {};    // piece[pieceType][square]
        this.castle = new Array(16);
        this.ep = new Array(cols).fill(0);
        this.turn = this.rand();

        const pieces = ['P','N','B','R','Q','K','p','n','b','r','q','k'];

        for (const p of pieces) {
            this.piece[p] = new Array(rows*cols);
            for (let i = 0; i < rows*cols; i++) {
                this.piece[p][i] = this.rand();
            }
        }

        // Castling rights
        for (let i = 0; i < 16; i++) this.castle[i] = this.rand();

        // En-passant for each file
        for (let f = 0; f < 8; f++) this.ep[f] = this.rand();

        this.hash = 0;
    }

    rand() {
        return (Math.random() * 2**32) | 0;
    }

    // Piece
    xorPiece(piece, sq) {
        if (!piece || piece === '.') return;
        this.hash ^= this.piece[piece][sq];
    }

    // Castling rights
    xorCastleRights(castlingRights) {
        let mask = 0;
        if (castlingRights.whiteKingSide)  mask |= 1 << 0;
        if (castlingRights.whiteQueenSide) mask |= 1 << 1;
        if (castlingRights.blackKingSide)  mask |= 1 << 2;
        if (castlingRights.blackQueenSide) mask |= 1 << 3;

        this.hash ^= this.castle[mask & 0xF];
    }

    // En-passant square file
    xorEP(file) {
        if (file >= 0 && file < this.cols) this.hash ^= this.ep[file];
    }

    // Turn to move
    xorTurn() {
        this.hash ^= this.turn;
    }

    clone() {
        const copy = new Zobrist(this.rows, this.cols);

        for (const key of Object.keys(this.piece)) {
            copy.piece[key] = this.piece[key].slice();
        }

        // Deep copy arrays
        copy.castle = this.castle.slice();
        copy.ep = this.ep.slice();

        // Copy primitive fields
        copy.turn = this.turn;
        copy.hash = this.hash;

        return copy;
    }
}