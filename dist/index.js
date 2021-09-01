"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.testCircuitDir = exports.compileCircuitDir = void 0;
const witness_generator_1 = require("./src/witness_generator");
const checker_1 = require("./src/checker");
const path = require("path");
const fs = require("fs");
const utils = require("./src/utils");
exports.utils = utils;
const walkSync = require('walk-sync');
async function compileCircuitDir(circuitDir, options) {
    const circuitName = path.basename(circuitDir);
    let witnessGenerator = new witness_generator_1.WitnessGenerator(circuitName, options);
    await witnessGenerator.compile(circuitDir);
}
exports.compileCircuitDir = compileCircuitDir;
async function testCircuitDir(circuitDir, dataDir, options) {
    // make sure the circuit is compiled
    const circuitName = path.basename(circuitDir);
    let witnessGenerator = new witness_generator_1.WitnessGenerator(circuitName, options);
    const { r1csFilepath, symFilepath } = await witnessGenerator.compile(circuitDir);
    const checker = new checker_1.Checker(r1csFilepath, symFilepath);
    if (dataDir == null || dataDir == '') {
        dataDir = circuitDir;
    }
    for (const input of walkSync(path.resolve(dataDir), { includeBasePath: true, globs: ['**/input.json'] })) {
        const testCaseDir = path.normalize(path.dirname(input));
        //const testCaseName = path.basename(testCaseDir)
        console.log('\ntest', testCaseDir);
        const inputFile = path.join(testCaseDir, 'input.json');
        const witnessFileType = options.witnessFileType == 'bin' || options.witnessFileType == 'wtns' ? 'wtns' : 'json';
        const witnessFile = path.join(testCaseDir, 'witness.' + witnessFileType);
        const expectedOutputFile = path.join(testCaseDir, 'output.json');
        await witnessGenerator.generateWitness(inputFile, witnessFile);
        if (!options.sanityCheck || fs.existsSync(expectedOutputFile)) {
            await checker.checkConstraintsAndOutput(witnessFile, expectedOutputFile);
        }
        console.log('\ntest', testCaseDir, 'done');
    }
}
exports.testCircuitDir = testCircuitDir;
//# sourceMappingURL=index.js.map