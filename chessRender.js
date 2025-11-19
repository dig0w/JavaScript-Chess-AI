export class ChessRender {
    constructor(engine = null) {
        this.engine = engine;
        engine.renderer = this;

        this.boardEl = null;
        this.turnDisplay = null;
        this.whiteCaptures = null;
        this.blackCaptures = null;
        this.endScreen = null;

        this.lastSelected = null;
        this.blurredTime = null;

        this.assetPrefix = 'assets/chess.com_';
    }

    BeginPlay() {
        this.boardEl = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');
        this.whiteCaptures = document.getElementById('whiteOpponent').children[1];
        this.blackCaptures = document.getElementById('blackOpponent').children[1];
        this.endScreen = document.getElementById('end-screen');

        this.boardEl.style.gridTemplateRows = `repeat(${this.engine.rows}, minmax(0, 1fr))`;
        this.boardEl.style.gridTemplateColumns = `repeat(${this.engine.cols}, minmax(0, 1fr))`;

        for (let r = 0; r < this.engine.rows; r++) {
            for (let c = 0; c < this.engine.cols; c++) {
                const sq = document.createElement('button');
                sq.classList.add('square');
                sq.dataset.r = r;
                sq.dataset.c = c;

                if ((r + c) % 2 === 0) {
                    sq.classList.add('dark');
                }

                sq.onclick = (e) => this.onSquareClick(e);
                sq.onblur = (e) => this.onSquareBlur(e);

                this.boardEl.appendChild(sq);

                this.UpdateSquare(r, c);
            }
        }

        this.UpdateGame();

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('square')) return;

            if (this.lastSelected !== null) {
                this.lastSelected = null;
                this.desHighlightMoves();
            }
        });
    }

    UpdateSquare(r, c) {
        const sq = this.boardEl.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (!sq) return;
        
        const piece = this.engine.board[r][c];
        
        if (this.engine.isEmpty(this.engine.board[r][c])) {
            sq.style.backgroundImage = null;
            return;
        }

        sq.style.backgroundImage = 'url(' + this.assetPrefix + (this.engine.isWhite(piece) ? 'w' : 'b') + piece.toLowerCase() + '.png)';
    }

    UpdateGame() {
        this.UpdateCheck();
        this.UpdateCaptures();
        this.UpdateTurn();

        switch (this.engine.gameCondition) {
            case 'WHITE_WINS_CHECKMATE':
                this.endScreen.classList.remove('hidden');

                this.endScreen.classList.add('won');

                this.endScreen.children[0].children[0].children[0].textContent = 'White Won!';
                this.endScreen.children[0].children[0].children[1].textContent = 'by checkmate';
                break;
            case 'BLACK_WINS_CHECKMATE':
                this.endScreen.classList.remove('hidden');

                this.endScreen.classList.add('won');

                this.endScreen.children[0].children[0].children[0].textContent = 'Black Won!';
                this.endScreen.children[0].children[0].children[1].textContent = 'by checkmate';
                break;
            case 'DRAW_STALEMATE':
                this.endScreen.classList.remove('hidden');

                this.endScreen.classList.add('draw');

                this.endScreen.children[0].children[0].children[0].textContent = 'Draw!';
                this.endScreen.children[0].children[0].children[1].textContent = 'by stalemate';
                break;
            case 'PLAYING':
            default:
                break;
        }
    }

    UpdateCheck() {
        document.querySelectorAll('.checked').forEach(sq => sq.classList.remove('checked'));

        if (this.engine.whiteKingChecked) {
            const kingChar = 'K';
            const kings = this.engine.getPieces(kingChar);
            const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

            const sq = document.querySelector(`.square[data-r="${kr}"][data-c="${kc}"]`);
            if (sq) sq.classList.add('checked');
        }
        if (this.engine.blackKingChecked) {
            const kingChar = 'k';
            const kings = this.engine.getPieces(kingChar);
            const { r: kr, c: kc } = kings[0] ? kings[0] : { r: -1, c: -1 };

            const sq = document.querySelector(`.square[data-r="${kr}"][data-c="${kc}"]`);
            if (sq) sq.classList.add('checked');
        }
    }

    UpdateCaptures() {
        this.whiteCaptures.children[0].innerHTML = '';
        for (let i = 0; i < this.engine.whiteCaptures.length; i++) {
            const li = document.createElement('li');
            li.textContent = this.engine.whiteCaptures[i].toUpperCase();

            this.whiteCaptures.children[0].appendChild(li);
        }

        const whiteDiff = this.engine.whiteCapturesPoints - this.engine.blackCapturesPoints;
        this.whiteCaptures.children[1].textContent = whiteDiff === 0 ? '' : (whiteDiff > 0 ? `+${whiteDiff}` : `${whiteDiff}`);


        this.blackCaptures.children[0].innerHTML = '';
        for (let i = 0; i < this.engine.blackCaptures.length; i++) {
            const li = document.createElement('li');
            li.textContent = this.engine.blackCaptures[i].toUpperCase();

            this.blackCaptures.children[0].appendChild(li);
        }

        const blackDiff = this.engine.blackCapturesPoints - this.engine.whiteCapturesPoints;
        this.blackCaptures.children[1].textContent = blackDiff === 0 ? '' : (blackDiff > 0 ? `+${blackDiff}` : `${blackDiff}`);
    }

    UpdateTurn() {
        this.turnDisplay.textContent = this.engine.turn == 0 ? 'White' : 'Black';
    }

    onSquareClick(e) {
        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        const clickedSame =
            this.lastSelected &&
            this.lastSelected.r === r &&
            this.lastSelected.c === c;

        // Case 1: clicking same square -> deselect
        if (clickedSame) {
            console.log('Deselected same square');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 2: blur happened too recently -> avoid unwanted deselection
        if ((new Date() - this.blurredTime) >= 300 && this.lastSelected !== null) {
            console.log('Deselected due to blur timing');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 3: has previous target and a valid new target -> move piece
        if (this.lastSelected != null && this.engine.isLegalMove(this.lastSelected?.r, this.lastSelected?.c, r, c)) {
            console.log('Move from', this.lastSelected?.r, this.lastSelected?.c, 'to', r, c);
            this.engine.MovePiece(this.lastSelected?.r, this.lastSelected?.c, r, c);

            this.UpdateSquare(this.lastSelected?.r, this.lastSelected?.c);
            this.UpdateSquare(r, c);
            this.UpdateGame();

            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        const piece = this.engine.board[r][c];

        // Case 4: click on empty square -> clear selection
        if (this.engine.isEmpty(piece)) {
            console.log('Clicked empty -> clear selection');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 5: click on piece of the oponent → clear selection
        if ((this.engine.isWhite(piece) && this.engine.turn != 0) || (this.engine.isBlack(piece) && this.engine.turn != 1)) {
            console.log('Clicked oponent piece -> clear selection');
            this.lastSelected = null;
            this.desHighlightMoves();
            e.target.blur();
            return;
        }

        // Case 6: click on a piece -> select        
        this.lastSelected = { r, c };

        this.highlightMoves(r, c);
    }

    onSquareBlur(e) {
        this.blurredTime = new Date();
    }

    highlightMoves(r, c) {
        this.desHighlightMoves();

        const moves = this.engine.getLegalMoves(r, c);

        moves.forEach(([r, c]) => {
            const sq = document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
            if (sq) sq.classList.add('highlight');
        });
    }

    desHighlightMoves() {
        document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));
    }
}
