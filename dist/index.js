"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCircuitDir = exports.parepareCircuitDir = exports.writeInputOutputIntoDir = exports.writeCircuitIntoDir = exports.CircuitTester = exports.testWithInputOutput = void 0;
const chai = require('chai');
const assert = chai.assert;
const fs = require("fs");
const path = require("path");
const shelljs = require("shelljs");
const tmp = require("tmp-promise");
const readR1cs = require('r1csfile').load;
const { ZqField, utils: ffutils } = require('ffjavascript');
const print_info = false;
const primeStr = '21888242871839275222246405745257275088548364400416034343698204186575808495617';
// This is an opinionated tester.
// Rather than allowing setting data path flexibly,
// It assumes some standard folder structure and file name
// , like circuit.circom input.json witness.json etc
// TOOD: type
async function checkConstraints(F, constraints, witness) {
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
        assert(F.isZero(F.sub(F.mul(a, b), c)), "Constraint doesn't match");
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
async function generateMainTestCircom(fileName, { src, main }) {
    if (src == '' || main == '') {
        throw new Error('invalid component ' + src + ' ' + main);
    }
    let srcCode = `include "${src}";
  component main = ${main};`;
    fs.writeFileSync(fileName, srcCode, 'utf8');
}
async function writeJsonWithBigint(path, obj) {
    let text = JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
    2);
    // maybe another implementation?:
    // let text = JSON.stringify(ffutils.stringifyBigInts(obj)));
    fs.writeFileSync(path, text, 'utf8');
}
async function readSymbols(path) {
    let symbols = {};
    const symsStr = await fs.promises.readFile(path, 'utf8');
    const lines = symsStr.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const arr = lines[i].split(',');
        if (arr.length != 4)
            continue;
        symbols[arr[3]] = {
            labelIdx: Number(arr[0]),
            varIdx: Number(arr[1]),
            componentIdx: Number(arr[2]),
        };
    }
    return symbols;
}
function parepareCircuitDir(circuitDirName, { alwaysRecompile = false, verbose = false } = {}) {
    // console.log('compiling dir', circuitDirName);
    const circuitFilePath = path.join(circuitDirName, 'circuit.circom');
    const r1csFilepath = path.join(circuitDirName, 'circuit.r1cs');
    const symFilepath = path.join(circuitDirName, 'circuit.sym');
    const binaryFilePath = path.join(circuitDirName, 'circuit');
    if (alwaysRecompile || !fs.existsSync(binaryFilePath)) {
        if (verbose) {
            console.log('compile', circuitDirName);
        }
        compileNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath });
    }
    else {
        if (verbose) {
            console.log('skip compiling binary ', binaryFilePath);
        }
    }
    return { circuitFilePath, r1csFilepath, symFilepath, binaryFilePath };
}
exports.parepareCircuitDir = parepareCircuitDir;
function compileNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath }) {
    const circomRuntimePath = path.join(require.resolve('circom_runtime'), '..', '..');
    const snarkjsPath = path.join(require.resolve('snarkjs'), '..', 'build', 'cli.cjs');
    const ffiasmPath = path.join(require.resolve('ffiasm'), '..');
    const circomcliPath = path.join(require.resolve('circom'), '..', 'cli.js');
    const cFilepath = path.join(circuitDirName, 'circuit.c');
    var cmd;
    cmd = `cp ${circomRuntimePath}/c/*.cpp ${circuitDirName}`;
    shelljs.exec(cmd);
    cmd = `cp ${circomRuntimePath}/c/*.hpp ${circuitDirName}`;
    shelljs.exec(cmd);
    cmd = `node ${ffiasmPath}/src/buildzqfield.js -q ${primeStr} -n Fr`;
    shelljs.exec(cmd, { cwd: circuitDirName });
    //cmd = `mv fr.asm fr.cpp fr.hpp ${circuitDirName}`;
    //shelljs.exec(cmd);
    if (process.platform === 'darwin') {
        cmd = `nasm -fmacho64 --prefix _  ${circuitDirName}/fr.asm`;
    }
    else if (process.platform === 'linux') {
        cmd = `nasm -felf64 ${circuitDirName}/fr.asm`;
    }
    else
        throw 'Unsupported platform';
    shelljs.exec(cmd);
    cmd = `NODE_OPTIONS=--max-old-space-size=8192 node --stack-size=65500 ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -c ${cFilepath} -s ${symFilepath}`;
    shelljs.exec(cmd);
    if (print_info) {
        cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs info ${r1csFilepath}`;
        shelljs.exec(cmd);
        // cmd = `NODE_OPTIONS=--max-old-space-size=8192 node ${snarkjsPath} r1cs print ${r1csFilepath} ${symFilepath}`;
        // shelljs.exec(cmd);
    }
    if (process.platform === 'darwin') {
        cmd = `g++ ${circuitDirName}/main.cpp ${circuitDirName}/calcwit.cpp ${circuitDirName}/utils.cpp ${circuitDirName}/fr.cpp ${circuitDirName}/fr.o ${cFilepath} -o ${binaryFilePath} -lgmp -std=c++11 -O3 -DSANITY_CHECK`;
        if (process.arch === 'arm64') {
            cmd = 'arch -x86_64 ' + cmd;
        }
        else {
            //cmd = cmd + ' -fopenmp';
        }
    }
    else if (process.platform === 'linux') {
        cmd = `g++ -pthread ${circuitDirName}/main.cpp ${circuitDirName}/calcwit.cpp ${circuitDirName}/utils.cpp ${circuitDirName}/fr.cpp ${circuitDirName}/fr.o ${cFilepath} -o ${binaryFilePath} -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK`;
    }
    else
        throw 'Unsupported platform';
    shelljs.exec(cmd);
}
class CircuitTester {
    constructor(name, { alwaysRecompile = true, verbose = false } = {}) {
        this.name = name;
        // we can specify cached files to avoid compiling every time
        this.alwaysRecompile = alwaysRecompile;
        this.verbose = verbose;
    }
    async compileAndload(circuitDirName) {
        this.circuitDirName = path.resolve(circuitDirName);
        const { r1csFilepath, symFilepath, binaryFilePath } = parepareCircuitDir(this.circuitDirName, {
            alwaysRecompile: this.alwaysRecompile,
            verbose: this.verbose,
        });
        this.binaryFilePath = binaryFilePath;
        this.r1cs = await readR1cs(r1csFilepath, true, false);
        this.symbols = await readSymbols(symFilepath);
    }
    generateWitness(inputFilePath, witnessFilePath) {
        var cmd;
        if (witnessFilePath == '') {
            witnessFilePath = path.join(path.dirname(inputFilePath), 'witness.json');
        }
        if (this.binaryFilePath == '' || !fs.existsSync(this.binaryFilePath)) {
            throw new Error('invalid bin ' + this.binaryFilePath);
        }
        // gen witness
        cmd = `${this.binaryFilePath} ${inputFilePath} ${witnessFilePath}`;
        const genWtnsOut = shelljs.exec(cmd);
        if (genWtnsOut.stderr || genWtnsOut.code != 0) {
            console.error(genWtnsOut.stderr);
            throw new Error('Could not generate witness');
        }
        return witnessFilePath;
    }
    async checkWitness(witness, expectedOutputJson) {
        const F = new ZqField(this.r1cs.prime);
        // const nVars = r1cs.nVars;
        const constraints = this.r1cs.constraints;
        await checkConstraints(F, constraints, witness);
        // assert output
        await assertOut(this.symbols, witness, expectedOutputJson);
        return true;
    }
    async checkInputOutputFile(inputFilePath, expectedOutputFile) {
        const outputJsonFilePath = this.generateWitness(inputFilePath, '');
        const witness = JSON.parse(fs.readFileSync(outputJsonFilePath).toString());
        const expectedOutputJson = JSON.parse(fs.readFileSync(expectedOutputFile).toString());
        return this.checkWitness(witness, expectedOutputJson);
    }
    async checkInputOutput(input, expectedOutputJson) {
        const inputFilePath = path.join(this.circuitDirName, 'input.json');
        await writeJsonWithBigint(inputFilePath, input);
        const outputJsonFilePath = this.generateWitness(inputFilePath, '');
        const witness = JSON.parse(fs.readFileSync(outputJsonFilePath).toString());
        return this.checkWitness(witness, expectedOutputJson);
    }
}
exports.CircuitTester = CircuitTester;
async function testCircuitDir(circuitDir) {
    let tester = new CircuitTester(path.basename(circuitDir), { alwaysRecompile: false, verbose: true });
    await tester.compileAndload(circuitDir);
    for (const testCaseName of fs.readdirSync(path.join(circuitDir, 'data'))) {
        const dataDir = path.join(circuitDir, 'data', testCaseName);
        console.log('\ntest', dataDir);
        await tester.checkInputOutputFile(path.join(dataDir, 'input.json'), path.join(dataDir, 'output.json'));
    }
}
exports.testCircuitDir = testCircuitDir;
async function writeCircuitIntoDir(circuitDir, component) {
    fs.mkdirSync(circuitDir, { recursive: true });
    const circuitFilePath = path.join(circuitDir, 'circuit.circom');
    await generateMainTestCircom(circuitFilePath, component);
}
exports.writeCircuitIntoDir = writeCircuitIntoDir;
async function writeInputOutputIntoDir(dataDir, input, output) {
    fs.mkdirSync(dataDir, { recursive: true });
    const inputFilePath = path.join(dataDir, 'input.json');
    await writeJsonWithBigint(inputFilePath, input);
    const outputFilePath = path.join(dataDir, 'output.json');
    await writeJsonWithBigint(outputFilePath, output);
}
exports.writeInputOutputIntoDir = writeInputOutputIntoDir;
async function testWithInputOutput(input, output, component, name, circuitDir = '') {
    if (circuitDir == '') {
        // create a tmp dir for test
        const targetDir = tmp.dirSync({ prefix: `tmp-${name}-circuit` });
        circuitDir = targetDir.name;
    }
    else {
        circuitDir = path.resolve(circuitDir);
        //fs.mkdirSync(circuitDir, { recursive: true });
    }
    // write input/output/circuit into the dir
    await writeCircuitIntoDir(circuitDir, component);
    await writeInputOutputIntoDir(path.join(circuitDir, 'data', name), input, output);
    // test the dir
    await testCircuitDir(circuitDir);
    console.log('test', name, 'done\n');
}
exports.testWithInputOutput = testWithInputOutput;
//# sourceMappingURL=index.js.map