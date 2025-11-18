// check if (r,c) is inside board
export function inside(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
}

// check if piece is white
export function isWhite(p) {
    return p !== '.' && p === p.toUpperCase();
}

// check if piece is black
export function isBlack(p) {
    return p !== '.' && p === p.toLowerCase();
}

// check if piece is empty
export function isEmpty(p) {
    return p == '.';
}

// get legal moves
export function getLegalMoves(r, c, piece) {
    const moves = [];
    const white = isWhite(piece);

    const add = (rr, cc) => {
        if (!inside(rr, cc)) return;

        const target = board[rr][cc];

        if (target === '.') {
            moves.push([rr, cc]);
            return;
        }

        // Capture enemy
        if (white && isBlack(target)) moves.push([rr, cc]);
        if (!white && isWhite(target)) moves.push([rr, cc]);
    };

    const addSlide = (dr, dc) => {
        let rr = r + dr;
        let cc = c + dc;
        while (inside(rr, cc)) {
            const target = board[rr][cc];
            if (target === '.') {
                moves.push([rr, cc]);
            } else {
                if (white && isBlack(target)) moves.push([rr, cc]);
                if (!white && isWhite(target)) moves.push([rr, cc]);
                break;
            }
            rr += dr;
            cc += dc;
        }
    };

    switch (piece.toLowerCase()) {
        // Pawn
        case 'p':
            if (white) {
                add(r - 1, c);                    // forward
                if (isBlack(board[r - 1]?.[c])) add(r - 1, c);
                if (inside(r - 1, c - 1) && isBlack(board[r - 1][c - 1])) moves.push([r - 1, c - 1]);
                if (inside(r - 1, c + 1) && isBlack(board[r - 1][c + 1])) moves.push([r - 1, c + 1]);
            } else {
                add(r + 1, c);
                if (inside(r + 1, c - 1) && isWhite(board[r + 1][c - 1])) moves.push([r + 1, c - 1]);
                if (inside(r + 1, c + 1) && isWhite(board[r + 1][c + 1])) moves.push([r + 1, c + 1]);
            }
            break;

        // Knight
        case 'n':
            [
                [r - 2, c - 1], [r - 2, c + 1],
                [r + 2, c - 1], [r + 2, c + 1],
                [r - 1, c - 2], [r - 1, c + 2],
                [r + 1, c - 2], [r + 1, c + 2]
            ].forEach(([rr, cc]) => add(rr, cc));
            break;

        // Bishop
        case 'b':
            addSlide(-1, -1);
            addSlide(-1, 1);
            addSlide(1, -1);
            addSlide(1, 1);
            break;

        // Rock
        case 'r':
            addSlide(-1, 0);
            addSlide(1, 0);
            addSlide(0, -1);
            addSlide(0, 1);
            break;

        // Queen
        case 'q':
            addSlide(-1, 0);
            addSlide(1, 0);
            addSlide(0, -1);
            addSlide(0, 1);
            addSlide(-1, -1);
            addSlide(-1, 1);
            addSlide(1, -1);
            addSlide(1, 1);
            break;

        // King
        case 'k':
            [
                [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
                [r - 1, c - 1], [r - 1, c + 1],
                [r + 1, c - 1], [r + 1, c + 1]
            ].forEach(([rr, cc]) => add(rr, cc));
            break;
    }

    return moves;
}