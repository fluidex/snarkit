import * as fs from 'fs';

import * as path from 'path';

async function generateMainTestCircom(fileName: string, { src, main }) {
  if (src == '' || main == '') {
    throw new Error('invalid component ' + src + ' ' + main);
  }
  let srcCode = `include "${src}";
    component main = ${main};`;
  fs.writeFileSync(fileName, srcCode, 'utf8');
}

async function writeJsonWithBigint(path: string, obj: Object) {
  let text = JSON.stringify(
    obj,
    (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
    2,
  );
  // maybe another implementation?:
  // let text = JSON.stringify(ffutils.stringifyBigInts(obj)));
  fs.writeFileSync(path, text, 'utf8');
}

async function writeCircuitIntoDir(circuitDir, component) {
  fs.mkdirSync(circuitDir, { recursive: true });
  const circuitFilePath = path.join(circuitDir, 'circuit.circom');
  await generateMainTestCircom(circuitFilePath, component);
}

async function writeInputOutputIntoDir(dataDir, input, output) {
  fs.mkdirSync(dataDir, { recursive: true });
  const inputFilePath = path.join(dataDir, 'input.json');
  await writeJsonWithBigint(inputFilePath, input);
  const outputFilePath = path.join(dataDir, 'output.json');
  await writeJsonWithBigint(outputFilePath, output);
}

export { writeCircuitIntoDir, writeInputOutputIntoDir, writeJsonWithBigint };
