const readR1cs = require('r1csfile').load;
const { ZqField, utils: ffutils } = require('ffjavascript');
const { assert } = require('chai');

import * as fs from 'fs';

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
    } else if (typeof eOut == 'object' && eOut.constructor.name == 'Object') {
      for (let k in eOut) {
        checkObject(prefix + '.' + k, eOut[k]);
      }
    } else {
      if (typeof symbols[prefix] == 'undefined') {
        assert(false, 'Output variable not defined: ' + prefix);
      }
      const ba = actualOut[symbols[prefix].varIdx].toString();
      const be = eOut.toString();
      assert.strictEqual(ba, be, prefix);
    }
  }
}

async function readSymbols(path: string) {
  let symbols = {};

  const symsStr = await fs.promises.readFile(path, 'utf8');
  const lines = symsStr.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const arr = lines[i].split(',');
    if (arr.length != 4) continue;
    symbols[arr[3]] = {
      labelIdx: Number(arr[0]),
      varIdx: Number(arr[1]),
      componentIdx: Number(arr[2]),
    };
  }
  return symbols;
}

class Checker {
  r1csFilepath: string;
  symFilepath: string;
  r1cs: any;
  symbols: any;
  constructor(r1csFilepath, symFilepath) {
    this.r1csFilepath = r1csFilepath;
    this.symFilepath = symFilepath;
  }
  async load() {
    this.r1cs = await readR1cs(this.r1csFilepath, true, false);
    this.symbols = await readSymbols(this.symFilepath);
  }

  async checkConstraintsAndOutput(witnessFilePath, expectedOutputFile) {
    // 1. check constraints
    const witness = JSON.parse(fs.readFileSync(witnessFilePath).toString());
    const F = new ZqField(this.r1cs.prime);
    const constraints = this.r1cs.constraints;
    await checkConstraints(F, constraints, witness);
    // 2. check output
    if (expectedOutputFile) {
      if (fs.existsSync(expectedOutputFile)) {
        const expectedOutputJson = JSON.parse(fs.readFileSync(expectedOutputFile).toString());
        await assertOut(this.symbols, witness, expectedOutputJson);
      } else {
        console.log('no output file, skip:', expectedOutputFile);
      }
    }
    return true;
  }
}

export { Checker };
