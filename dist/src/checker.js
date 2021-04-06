"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checker = void 0;
const readR1cs = require('r1csfile').load;
const { ZqField, utils: ffutils } = require('ffjavascript');
const { assert } = require('chai');
const fs = require("fs");
const binFileUtils = require('@iden3/binfileutils');
// copyed from snarkjs/src/wtns_utils.js
async function readWtnsHeader(fd, sections) {
    await binFileUtils.startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await binFileUtils.readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await binFileUtils.endReadSection(fd);
    return { n8, q, nWitness };
}
async function readWtns(fileName) {
    const { fd, sections } = await binFileUtils.readBinFile(fileName, 'wtns', 2);
    const { n8, nWitness } = await readWtnsHeader(fd, sections);
    await binFileUtils.startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i = 0; i < nWitness; i++) {
        const v = await binFileUtils.readBigInt(fd, n8);
        res.push(v);
    }
    await binFileUtils.endReadSection(fd);
    await fd.close();
    return res;
}
// TOOD: type
async function checkConstraints(F, constraints, witness, signals) {
    if (!constraints) {
        throw new Error('empty constraints');
    }
    for (let i = 0; i < constraints.length; i++) {
        checkConstraint(constraints[i]);
    }
    function checkConstraint(constraint) {
        const a = evalLC(constraint[0]);
        const b = evalLC(constraint[1]);
        const c = evalLC(constraint[2]);
        if (!F.isZero(F.sub(F.mul(a, b), c))) {
            console.log('invalid constraint, related signals:');
            let sigs = new Set();
            for (const c of constraint) {
                for (const s in c) {
                    sigs.add(Number(s));
                }
            }
            for (const s of sigs) {
                console.log(`Signal ${s}: ${(signals[s].join(' '))}`);
            }
            console.log('please check your circuit and input');
            throw new Error("Constraint doesn't match");
        }
    }
    function evalLC(lc) {
        let v = F.zero;
        for (let w in lc) {
            v = F.add(v, F.mul(BigInt(lc[w]), BigInt(witness[w])));
        }
        return v;
    }
}
// TOOD: type
async function assertOut(symbols, actualOut, expectedOut) {
    if (!symbols) {
        throw new Error('empty symbols');
    }
    checkObject('main', expectedOut);
    function checkObject(prefix, eOut) {
        if (Array.isArray(eOut)) {
            for (let i = 0; i < eOut.length; i++) {
                checkObject(prefix + '[' + i + ']', eOut[i]);
            }
        }
        else if (typeof eOut == 'object' && eOut.constructor.name == 'Object') {
            for (let k in eOut) {
                checkObject(prefix + '.' + k, eOut[k]);
            }
        }
        else {
            if (typeof symbols[prefix] == 'undefined') {
                assert(false, 'Output variable not defined: ' + prefix);
            }
            const ba = actualOut[symbols[prefix].varIdx].toString();
            const be = eOut.toString();
            assert.strictEqual(ba, be, prefix);
        }
    }
}
async function readSymbols(path) {
    let symbols = {};
    let signals = {};
    const symsStr = await fs.promises.readFile(path, 'utf8');
    const lines = symsStr.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const arr = lines[i].split(',');
        if (arr.length != 4)
            continue;
        const symbol = arr[3];
        const labelIdx = Number(arr[0]);
        const varIdx = Number(arr[1]);
        const componentIdx = Number(arr[2]);
        symbols[symbol] = {
            labelIdx,
            varIdx,
            componentIdx,
        };
        if (signals[varIdx] == null) {
            signals[varIdx] = [symbol];
        }
        else {
            signals[varIdx].push(symbol);
        }
    }
    return { symbols, signals };
}
class Checker {
    constructor(r1csFilepath, symFilepath) {
        this.r1csFilepath = r1csFilepath;
        this.symFilepath = symFilepath;
    }
    async load() {
        this.r1cs = await readR1cs(this.r1csFilepath, true, false);
        const { symbols, signals } = await readSymbols(this.symFilepath);
        this.symbols = symbols;
        this.signals = signals;
    }
    async checkConstraintsAndOutput(witnessFilePath, expectedOutputFile) {
        // 1. check constraints
        let witness;
        if (witnessFilePath.endsWith('json')) {
            witness = JSON.parse(fs.readFileSync(witnessFilePath).toString());
        }
        else {
            witness = await readWtns(witnessFilePath);
        }
        const F = new ZqField(this.r1cs.prime);
        const constraints = this.r1cs.constraints;
        await checkConstraints(F, constraints, witness, this.signals);
        // 2. check output
        if (expectedOutputFile) {
            if (fs.existsSync(expectedOutputFile)) {
                const expectedOutputJson = JSON.parse(fs.readFileSync(expectedOutputFile).toString());
                await assertOut(this.symbols, witness, expectedOutputJson);
            }
            else {
                console.log('no output file, skip:', expectedOutputFile);
            }
        }
        return true;
    }
}
exports.Checker = Checker;
//# sourceMappingURL=checker.js.map