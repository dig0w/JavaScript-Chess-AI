/**
 * UCI time management.
 *
 * params: the parsed "go" arguments { wtime, btime, winc, binc, movestogo, movetime, depth, nodes, infinite, ponder }
 * turn:   0 = White to move, 1 = Black to move
 * overhead: safety margin per move in ms (network / GUI latency)
 *
 * Returns
 *   infinite  true when the clock must be ignored (go infinite / go depth / go nodes / plain go)
 *   soft      target time in ms: the search will not start a new iteration after ~55% of it
 *   hard      absolute limit in ms: the search is aborted when it is reached
 */
export function allocateTime(params, turn, overhead = 30) {
    const out = { infinite: false, soft: Infinity, hard: Infinity, depth: params.depth || 0, nodes: params.nodes || 0 };

    if (params.infinite || params.ponder) { out.infinite = true; return out; }

    if (params.movetime) {
        out.hard = Math.max(1, params.movetime - overhead);
        out.soft = out.hard * 1.45;          // the search stops starting new iterations at ~55% of soft = ~80% of the budget
        return out;
    }

    const time = turn === 0 ? params.wtime : params.btime;
    const inc = (turn === 0 ? params.winc : params.binc) || 0;

    if (time === undefined || time === null) {
        out.infinite = true;
        return out;
    }

    const t = Math.max(1, time - overhead);          // usable time
    const movesLeft = params.movestogo ? Math.min(params.movestogo, 50) : 28;

    let base = t / movesLeft + inc * 0.75;           // what we would like to spend on this move
    base = Math.min(base, t * 0.6);

    let hard = Math.min(base * 3, t * 0.8);          // never think longer than this, even if the position is hard
    let soft = Math.min(base * 1.3, hard);

    if (params.movestogo === 1) { hard = soft = t * 0.8; }   // last move before the time control: use it
    if (t < 50) { hard = soft = Math.max(1, t * 0.5); }      // nearly flagged: move almost instantly

    out.soft = Math.max(1, soft);
    out.hard = Math.max(1, hard);
    return out;
}

// Parse the tokens following "go"
export function parseGo(tokens) {
    const p = {};
    const numeric = new Set(['wtime', 'btime', 'winc', 'binc', 'movestogo', 'movetime', 'depth', 'nodes', 'mate']);
    const flags = new Set(['infinite', 'ponder']);
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (numeric.has(t)) { const v = Number(tokens[++i]); if (Number.isFinite(v)) p[t] = Math.max(0, v); }
        else if (flags.has(t)) p[t] = true;
        else if (t === 'perft') { p.perft = Number(tokens[++i]) || 1; }
        else if (t === 'searchmoves') {
            p.searchmoves = [];
            while (i + 1 < tokens.length && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(tokens[i + 1])) p.searchmoves.push(tokens[++i].toLowerCase());
        }
    }
    return p;
}