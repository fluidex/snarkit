"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileCircuitDir = exports.WitnessGenerator = void 0;
const fs = require("fs");
const path = require("path");
const shelljs = require("shelljs");
//import {compiler} from "circom";
//const Scalar = require("ffjavascript").Scalar;
const primeStr = '21888242871839275222246405745257275088548364400416034343698204186575808495617';
const NODE_CMD = 'NODE_OPTIONS=--max-old-space-size=8192 node --stack-size=65500';
async function compileWasmBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath }) {
    const circomcliPath = path.join(require.resolve('circom'), '..', 'cli.js');
    let cmd;
    cmd = `${NODE_CMD} ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -w ${binaryFilePath} -s ${symFilepath}`;
    shelljs.exec(cmd);
}
async function compileNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath }) {
    const circomRuntimePath = path.join(require.resolve('circom_runtime'), '..', '..');
    const ffiasmPath = path.join(require.resolve('ffiasm'), '..');
    const circomcliPath = path.join(require.resolve('circom'), '..', 'cli.js');
    const cFilepath = path.join(circuitDirName, 'circuit.cpp');
    let cmd;
    cmd = `cp ${circomRuntimePath}/c/*.cpp ${circuitDirName}`;
    shelljs.exec(cmd);
    cmd = `cp ${circomRuntimePath}/c/*.hpp ${circuitDirName}`;
    shelljs.exec(cmd);
    cmd = `node ${ffiasmPath}/src/buildzqfield.js -q ${primeStr} -n Fr`;
    shelljs.exec(cmd, { cwd: circuitDirName });
    if (process.arch !== 'x64') {
        throw 'Unsupported platform ' + process.arch + '. Try wasm backend as an alternative';
    }
    if (process.platform === 'darwin') {
        cmd = `nasm -fmacho64 --prefix _  ${circuitDirName}/fr.asm`;
    }
    else if (process.platform === 'linux') {
        cmd = `nasm -felf64 ${circuitDirName}/fr.asm`;
    }
    else
        throw 'Unsupported platform';
    shelljs.exec(cmd);
    cmd = `${NODE_CMD} ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -c ${cFilepath} -s ${symFilepath}`;
    shelljs.exec(cmd);
    if (process.platform === 'darwin') {
        cmd = `g++ ${circuitDirName}/main.cpp ${circuitDirName}/calcwit.cpp ${circuitDirName}/utils.cpp ${circuitDirName}/fr.cpp ${circuitDirName}/fr.o ${cFilepath} -o ${binaryFilePath} -lgmp -std=c++11 -O3 -DSANITY_CHECK`;
    }
    else if (process.platform === 'linux') {
        cmd = `g++ -pthread ${circuitDirName}/main.cpp ${circuitDirName}/calcwit.cpp ${circuitDirName}/utils.cpp ${circuitDirName}/fr.cpp ${circuitDirName}/fr.o ${cFilepath} -o ${binaryFilePath} -lgmp -std=c++11 -O3 -fopenmp -DSANITY_CHECK`;
    }
    else
        throw 'Unsupported platform';
    shelljs.exec(cmd);
}
async function compileCircuitDir(circuitDirName, { alwaysRecompile, verbose, backend }) {
    // console.log('compiling dir', circuitDirName);
    const circuitFilePath = path.join(circuitDirName, 'circuit.circom');
    const r1csFilepath = path.join(circuitDirName, 'circuit.r1cs');
    const symFilepath = path.join(circuitDirName, 'circuit.sym');
    let binaryFilePath;
    if (backend === 'native') {
        binaryFilePath = path.join(circuitDirName, 'circuit');
    }
    else {
        binaryFilePath = path.join(circuitDirName, 'circuit.wasm');
    }
    if (!alwaysRecompile && fs.existsSync(binaryFilePath)) {
        if (verbose) {
            console.log('skip compiling binary ', binaryFilePath);
        }
        return { circuitFilePath, r1csFilepath, symFilepath, binaryFilePath };
    }
    console.log('compile', circuitDirName);
    if (backend === 'native') {
        await compileNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath });
    }
    else {
        await compileWasmBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath });
    }
    return { circuitFilePath, r1csFilepath, symFilepath, binaryFilePath };
}
exports.compileCircuitDir = compileCircuitDir;
class WitnessGenerator {
    constructor(name, { backend, alwaysRecompile, verbose } = { backend: 'native', alwaysRecompile: true, verbose: false }) {
        this.name = name;
        // we can specify cached files to avoid compiling every time
        this.alwaysRecompile = alwaysRecompile;
        this.verbose = verbose;
        this.backend = backend;
    }
    async compile(circuitDirName) {
        this.circuitDirName = path.resolve(circuitDirName);
        const { r1csFilepath, symFilepath, binaryFilePath } = await compileCircuitDir(this.circuitDirName, {
            alwaysRecompile: this.alwaysRecompile,
            verbose: this.verbose,
            backend: this.backend,
        });
        this.binaryFilePath = binaryFilePath;
        return { r1csFilepath, symFilepath };
    }
    async generateWitness(inputFilePath, witnessFilePath) {
        var cmd;
        if (this.binaryFilePath == '' || !fs.existsSync(this.binaryFilePath)) {
            throw new Error('invalid bin ' + this.binaryFilePath + '. Has the circuit been compiled?');
        }
        if (!witnessFilePath.endsWith('.json') && !witnessFilePath.endsWith('.wtns')) {
            throw new Error('invalid witness file type');
        }
        // gen witness
        if (this.backend === 'native') {
            cmd = `${this.binaryFilePath} ${inputFilePath} ${witnessFilePath}`;
            const genWtnsOut = shelljs.exec(cmd);
            if (genWtnsOut.stderr || genWtnsOut.code != 0) {
                console.error(genWtnsOut.stderr);
                throw new Error('Could not generate witness. Make sure your CPU supports BMI2/ADX instructions(Apple M1 Rosseta not works)');
            }
        }
        else {
            const snarkjsPath = path.join(require.resolve('snarkjs'), '..', 'cli.cjs');
            if (witnessFilePath.endsWith('.wtns')) {
                cmd = `${NODE_CMD} ${snarkjsPath} wc ${this.binaryFilePath} ${inputFilePath} ${witnessFilePath}`;
                shelljs.exec(cmd);
            }
            else {
                const witnessBinFile = path.join(this.circuitDirName, 'witness.wtns');
                cmd = `${NODE_CMD} ${snarkjsPath} wc ${this.binaryFilePath} ${inputFilePath} ${witnessBinFile}`;
                shelljs.exec(cmd);
                cmd = `${NODE_CMD} ${snarkjsPath} wej ${witnessBinFile} ${witnessFilePath}`;
                shelljs.exec(cmd);
            }
        }
    }
}
exports.WitnessGenerator = WitnessGenerator;
//# sourceMappingURL=witness_generator.js.map