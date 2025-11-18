export class ChessRender {
    constructor(engine = null) {
        this.engine = engine;
        engine.renderer = this;

        this.boardEl = null;
        this.turnDisplay = null;
        this.whiteCaptures = null;
        this.blackCaptures = null;

        this.lastSelected = null;
        this.blurredTime = null;

        this.assetPrefix = 'assets/chess.com_';
    }

    BeginPlay() {
        this.boardEl = document.getElementById('board');
        this.turnDisplay = document.getElementById('turn-display');

        this.whiteCaptures = document.getElementById('whiteOpponent').children[1];
        this.blackCaptures = document.getElementById('blackOpponent').children[1];

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

        this.UpdateTurn();

        this.UpdateCaptures();
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

    UpdateTurn() {
        this.turnDisplay.textContent = this.engine.turn == 0 ? 'White' : 'Black';
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

    onSquareClick(e) {
        const r = +e.target.dataset.r;
        const c = +e.target.dataset.c;

        const clickedSame =
            this.lastSelected &&
            this.lastSelected.r === r &&
            this.lastSelected.c === c;

        const blurRecently = (new Date() - this.blurredTime) < 100;

        // Case 1: clicking same square -> deselect
        if (clickedSame) {
            this.lastSelected = null;
            console.log("Deselected same square");
            e.target.blur();
            return;
        }

        // Case 2: blur happened too recently -> avoid unwanted deselection
        if (!blurRecently && this.lastSelected !== null) {
            this.lastSelected = null;
            console.log("Deselected due to blur timing");
            e.target.blur();
            return;
        }

        // Case 3: has previous target and a valid new target -> move piece
        if (this.lastSelected != null) {
            console.log('Move from', this.lastSelected?.r, this.lastSelected?.c, 'to', r, c);
            this.engine.MovePiece(this.lastSelected?.r, this.lastSelected?.c, r, c);
            this.UpdateSquare(this.lastSelected?.r, this.lastSelected?.c);
            this.UpdateSquare(r, c);
            this.UpdateCaptures();

            this.lastSelected = null;
            e.target.blur();
            return;
        }

        const piece = this.engine.board[r][c];

        // Case 4: click on empty square -> clear selection
        if (this.engine.isEmpty(piece)) {
            this.lastSelected = null;
            console.log("Clicked empty -> clear selection");
            e.target.blur();
            return;
        }

        // Case 5: click on piece of the oponent → clear selection
        if ((this.engine.isWhite(piece) && this.engine.turn != 0) || (this.engine.isBlack(piece) && this.engine.turn != 1)) {
            this.lastSelected = null;
            console.log("Clicked oponent piece -> clear selection");
            e.target.blur();
            return;
        }

        // Case 6: click on a piece -> select        
        this.lastSelected = { r, c };
    }

    onSquareBlur(e) {
        this.blurredTime = new Date();
    }
}
