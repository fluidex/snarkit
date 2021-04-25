import { WitnessGenerator } from './src/witness_generator';
import { Checker } from './src/checker';
import * as path from 'path';
import * as utils from './src/utils';
const walkSync = require('walk-sync');

async function compileCircuitDir(circuitDir, options) {
  const circuitName = path.basename(circuitDir);
  let witnessGenerator = new WitnessGenerator(circuitName, options);
  await witnessGenerator.compile(circuitDir);
}

async function testCircuitDir(circuitDir, dataDir, options) {
  // make sure the circuit is compiled
  const circuitName = path.basename(circuitDir);
  let witnessGenerator = new WitnessGenerator(circuitName, options);
  const { r1csFilepath, symFilepath } = await witnessGenerator.compile(circuitDir);

  const checker = new Checker(r1csFilepath, symFilepath);
  await checker.load();

  if (dataDir == null || dataDir == '') {
    dataDir = circuitDir;
  }
  for (const input of walkSync(path.resolve(dataDir), { includeBasePath: true, globs: ['**/input.json'] })) {
    const testCaseDir = path.dirname(input);
    //const testCaseName = path.basename(testCaseDir)
    console.log('\ntest', testCaseDir);
    const inputFile = path.join(testCaseDir, 'input.json');
    const witnessFileType = options.witnessFileType == 'bin' || options.witnessFileType == 'wtns' ? 'wtns' : 'json';
    const witnessFile = path.join(testCaseDir, 'witness.' + witnessFileType);
    const expectedOutputFile = path.join(testCaseDir, 'output.json');
    await witnessGenerator.generateWitness(inputFile, witnessFile);
    await checker.checkConstraintsAndOutput(witnessFile, expectedOutputFile);
    console.log('\ntest', testCaseDir, 'done');
  }
}

export { compileCircuitDir, testCircuitDir, utils };
