/**
 * UCI front-end for the engine:      node UCI.js
 *
 * Supported commands
 *   uci, isready, ucinewgame, setoption, position [startpos | fen <fen>] [moves ...], quit
 *   go [wtime btime winc binc movestogo] [movetime] [depth] [nodes] [searchmoves ...] [infinite] [ponder] [perft N]
 *   stop            (works while the engine is thinking)
 *   ponderhit       (accepted, pondering is not implemented)
 *   d               (print board / FEN / hash)       eval        (static evaluation)
 *
 * Options: Hash (MB), Clear Hash, Move Overhead (ms), Threads (only 1), Ponder (accepted, unused)
 *
 * The search runs in a worker thread so that stop / isready / quit are answered while it is thinking.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { ChessEngine } from './chessEngine.js';
import { ChessAI, evaluate } from './ai.js';
import { allocateTime, parseGo } from './uciTime.js';

const DEFAULTS = { hash: 64, overhead: 30 };

function meta() {
    try {
        const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
        return { name: pkg.name || 'chess', version: pkg.version || '1.0', author: (typeof pkg.author === 'string' ? pkg.author : pkg.author?.name) || 'unknown' };
    } catch { return { name: 'chess', version: '1.0', author: 'unknown' }; }
}

const UCI_HEADER = () => {
    const m = meta();
    return [
        `id name ${m.name} v${m.version}`,
        `id author ${m.author}`,
        '',
        `option name Hash type spin default ${DEFAULTS.hash} min 1 max 512`,
        'option name Clear Hash type button',
        `option name Move Overhead type spin default ${DEFAULTS.overhead} min 0 max 5000`,
        'option name Threads type spin default 1 min 1 max 1',
        'option name Ponder type check default false',
        'uciok'
    ];
};

// Main thread: reads stdin, answers the commands that must not wait for the search
if (isMainThread) {
    const stopFlag = new Int32Array(new SharedArrayBuffer(4));
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { stopBuf: stopFlag.buffer } });

    let searching = false;          // the worker is inside a search
    let infiniteSearch = false;
    let stopRequested = false;
    let held = null;                // "bestmove" of a "go infinite" that finished early, waiting for "stop"
    let closing = false;

    const print = line => process.stdout.write(line + '\n');

    worker.on('message', msg => {
        if (msg.type === 'out') print(msg.line);
        else if (msg.type === 'idle') searching = false;
        else if (msg.type === 'bestmove') {
            searching = false;
            if (msg.hold && !stopRequested) held = msg.line;
            else { print(msg.line); infiniteSearch = false; }
        }
    });
    worker.on('error', err => { print('info string worker error: ' + (err && err.stack || err)); process.exit(1); });
    worker.on('exit', () => process.exit(0));

    const rl = readline.createInterface({ input: process.stdin, terminal: false });

    rl.on('line', raw => {
        const line = raw.trim();
        if (!line) return;
        const cmd = line.split(/\s+/)[0];

        switch (cmd) {
            case 'uci':
                UCI_HEADER().forEach(print);
                break;
            case 'stop':
                stopRequested = true;
                Atomics.store(stopFlag, 0, 1);
                if (held) { print(held); held = null; infiniteSearch = false; }
                break;
            case 'isready':
                if (searching) print('readyok');           // answer immediately while thinking
                else worker.postMessage({ type: 'line', line });
                break;
            case 'go':
                stopRequested = false;
                held = null;
                Atomics.store(stopFlag, 0, 0);
                searching = true;
                infiniteSearch = /\b(infinite|ponder)\b/.test(line);
                worker.postMessage({ type: 'line', line });
                break;
            case 'quit':
                Atomics.store(stopFlag, 0, 1);
                process.exit(0);
                break;
            default:
                worker.postMessage({ type: 'line', line });
        }
    });

    rl.on('close', () => {
        // stdin ended (e.g. piped commands): let a finite search finish, abort an endless one, then exit
        closing = true;
        if (infiniteSearch) Atomics.store(stopFlag, 0, 1);
        worker.postMessage({ type: 'quit' });
    });
}
// Worker thread: owns the position and the search
else {
    const stopFlag = new Int32Array(workerData.stopBuf);
    const out = line => parentPort.postMessage({ type: 'out', line });

    const engine = new ChessEngine();
    const ai = new ChessAI(engine, true, 1000);
    ai.verbose = false;
    ai.setHashMB(DEFAULTS.hash);

    let overhead = DEFAULTS.overhead;

    parentPort.on('message', msg => {
        if (msg.type === 'quit') { process.exit(0); }
        else if (msg.type === 'line') {
            try { handle(msg.line); }
            catch (err) { out('info string error: ' + (err && err.message || err)); }
        }
    });

    function handle(line) {
        const tokens = line.split(/\s+/);
        const cmd = tokens[0];

        switch (cmd) {
            case 'isready': out('readyok'); break;
            case 'ucinewgame': engine.loadFEN(ChessEngine.START_FEN); ai.clearHash(); break;
            case 'setoption': setOption(tokens); break;
            case 'position': setPosition(tokens); break;
            case 'go': go(tokens.slice(1)); break;
            case 'd': display(); break;
            case 'eval': out(`Static evaluation: ${evaluate(engine)} cp (side to move)`); break;
            case 'ponderhit': case 'debug': case 'register': break;
            case 'perft': runPerft(Number(tokens[1]) || 1); break;
            default: out(`info string unknown command: ${cmd}`);
        }
    }

    function setOption(tokens) {
        const vi = tokens.indexOf('value');
        const name = tokens.slice(1 + (tokens[1] === 'name' ? 1 : 0), vi === -1 ? tokens.length : vi).join(' ').toLowerCase();
        const value = vi === -1 ? '' : tokens.slice(vi + 1).join(' ');
        switch (name) {
            case 'hash': {
                const mb = Math.max(1, Math.min(512, parseInt(value, 10) || DEFAULTS.hash));
                ai.setHashMB(mb);
                break;
            }
            case 'clear hash': ai.clearHash(); break;
            case 'move overhead': overhead = Math.max(0, Math.min(5000, parseInt(value, 10) || 0)); break;
            case 'threads': case 'ponder': break;
            default: out(`info string unknown option: ${name}`);
        }
    }

    function setPosition(tokens) {
        let i = 1;
        if (tokens[i] === 'startpos') { engine.loadFEN(ChessEngine.START_FEN); i++; }
        else if (tokens[i] === 'fen') {
            const fen = [];
            i++;
            while (i < tokens.length && tokens[i] !== 'moves') fen.push(tokens[i++]);
            engine.loadFEN(fen.join(' '));
        } else { out('info string position: expected startpos or fen'); return; }

        if (tokens[i] === 'moves') {
            for (i++; i < tokens.length; i++) {
                const m = engine.uciToMove(tokens[i]);
                if (m < 0) { out(`info string illegal move ${tokens[i]}, ignoring the rest`); break; }
                engine.makeMove(m);
            }
        }
    }

    function runPerft(depth) {
        const t = performance.now();
        let total = 0;
        for (const [m, n] of engine.perftDivide(depth)) { out(`${m}: ${n}`); total += n; }
        const ms = performance.now() - t;
        out('');
        out(`Nodes searched: ${total}`);
        out(`info string perft ${depth} took ${ms.toFixed(0)} ms (${(total / Math.max(ms, 1) / 1000).toFixed(1)}M nodes/s)`);
    }

    function display() {
        out(engine.toString());
        out(`Fen: ${engine.getFEN()}`);
        out(`Key: ${(engine.hashHi >>> 0).toString(16).padStart(8, '0')}${(engine.hashLo >>> 0).toString(16).padStart(8, '0')}`);
        out(`Checkers: ${engine.inCheck() ? 'yes' : 'no'}`);
    }

    function go(tokens) {
        const p = parseGo(tokens);

        if (p.perft) { runPerft(p.perft); parentPort.postMessage({ type: 'idle' }); return; }      // perft prints no bestmove

        const lim = allocateTime(p, engine.turn, overhead);
        const wantsAnalysis = lim.infinite || lim.depth > 0 || lim.nodes > 0;

        const best = ai.bestMove(
            lim.hard === Infinity ? 1e9 : lim.hard,
            lim.depth > 0 ? Math.min(lim.depth, 64) : 64,
            {
                soft: lim.soft, infinite: lim.infinite, nodes: lim.nodes, stopFlag,
                searchMoves: p.searchmoves, analyse: wantsAnalysis,
                onInfo: i => {
                    const score = i.mate !== null ? `mate ${i.mate}` : `cp ${i.score}`;
                    out(`info depth ${i.depth} score ${score} nodes ${i.nodes} nps ${i.nps} hashfull ${i.hashfull} time ${Math.round(i.ms)} pv ${i.pv.join(' ')}`);
                }
            }
        );

        let line;
        if (!best) line = 'bestmove (none)';
        else {
            line = 'bestmove ' + engine.getMoveUCI(best);
            if (ai.lastPV && ai.lastPV.length > 1) line += ' ponder ' + ai.lastPV[1];
        }
        parentPort.postMessage({ type: 'bestmove', line, hold: !!(p.infinite || p.ponder) });
    }
}