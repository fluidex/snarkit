"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJsonWithBigint = exports.writeInputOutputIntoDir = exports.writeCircuitIntoDir = void 0;
const fs = require("fs");
const path = require("path");
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
exports.writeJsonWithBigint = writeJsonWithBigint;
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
//# sourceMappingURL=utils.js.map