import { delay } from '../../utils.js';

export class Test {
    constructor(engine = null) {
        this.engine = engine;
    }

    async test(epoch = 10000) {
        let summedTest1 = 0;
        let summedTest2 = 0;
        let summedTest3 = 0;
        let summedTest4 = 0;

        for (let i = 0; i < epoch; i++) {
            const test1Output = this.toTest1();
            summedTest1 += test1Output;

            const test2Output = this.toTest2();
            summedTest2 += test2Output;

            const test3Output = this.toTest3();
            summedTest3 += test3Output[0];
            summedTest4 += test3Output[1];
        }

        const finalTest1 = summedTest1 / epoch;
        const finalTest2 = summedTest2 / epoch;
        const finalTest3 = summedTest3 / epoch;
        const finalTest4 = summedTest4 / epoch;

        console.log('Runned tests', epoch, 'times')
        console.log('Avg Clone time:', finalTest1);;
        console.log('Avg Move and undoMove time:', finalTest2);
        console.log('Diff:', finalTest1 - finalTest2);
        console.log('Avg Move time:', finalTest3);
        console.log('Avg undoMove time:', finalTest4);
    }

    toTest1() {
        const move = {
            "fr": 7,
            "fc": 1,
            "tr": 5,
            "tc": 2,
            "promote": null
        };

        const startTime = performance.now();

        const copy = this.engine.clone();

        copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

        const elapsedMs = performance.now() - startTime;
        return elapsedMs;
    }

    toTest2() {
        const move = {
            "fr": 7,
            "fc": 1,
            "tr": 5,
            "tc": 2,
            "promote": null
        };
        const copy = this.engine.clone();

        const startTime = performance.now();

        copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

        copy.undoMove();

        const elapsedMs = performance.now() - startTime;
        return elapsedMs;
    }

    toTest3() {
        const move = {
            "fr": 7,
            "fc": 1,
            "tr": 5,
            "tc": 2,
            "promote": null
        };
        const copy = this.engine.clone();

        const startTime1 = performance.now();

        copy.MovePiece(move.fr, move.fc, move.tr, move.tc, move.promote);

        const elapsedMs1 = performance.now() - startTime1;

        const startTime2 = performance.now();

        copy.undoMove();

        const elapsedMs2 = performance.now() - startTime2;

        return [elapsedMs1, elapsedMs2];
    }
}