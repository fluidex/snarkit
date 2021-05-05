import * as fs from 'fs';
import * as path from 'path';
import * as shelljs from 'shelljs';
const si = require('systeminformation');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const { wtns } = require('snarkjs');
import { groupOrderPrimeStr, groupOrderPrime } from './math';
//import {compiler} from "circom";
//const Scalar = require("ffjavascript").Scalar;

const NODE_CMD = 'NODE_OPTIONS=--max-old-space-size=8192 node --stack-size=65500';

function shellExecFnBuilder(verbose) {
  function shellExec(cmd, options = {}) {
    if (verbose) {
      console.log(cmd);
    }
    return shelljs.exec(cmd, options);
  }
  return shellExec;
}

async function compileWasmBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath, verbose }) {
  const shellExec = shellExecFnBuilder(verbose);
  const circomcliPath = path.join(require.resolve('circom'), '..', 'cli.js');
  let cmd: string;
  cmd = `${NODE_CMD} ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -w ${binaryFilePath} -s ${symFilepath}`;
  shellExec(cmd);
}

async function generateSrcsForNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, verbose, alwaysRecompile }) {
  const shellExec = shellExecFnBuilder(verbose);
  const circomRuntimePath = path.join(require.resolve('circom_runtime'), '..', '..');
  const ffiasmPath = path.join(require.resolve('ffiasm'), '..');
  const circomcliPath = path.join(require.resolve('circom'), '..', 'cli.js');
  const cFilepath = path.join(circuitDirName, 'circuit.cpp');

  if (!alwaysRecompile && fs.existsSync(cFilepath)) {
    if (verbose) {
      console.log('skip generate c src', cFilepath);
    }
    return;
  }

  let cmd: string;
  cmd = `cp ${circomRuntimePath}/c/*.cpp ${circuitDirName}`;
  shellExec(cmd);
  cmd = `cp ${circomRuntimePath}/c/*.hpp ${circuitDirName}`;
  shellExec(cmd);
  cmd = `node ${ffiasmPath}/src/buildzqfield.js -q ${groupOrderPrimeStr} -n Fr`;
  shellExec(cmd, { cwd: circuitDirName });
  if (process.arch !== 'x64') {
    throw 'Unsupported platform ' + process.arch + '. Try wasm backend as an alternative';
  }
  if (process.platform === 'darwin') {
    cmd = `nasm -fmacho64 --prefix _  ${circuitDirName}/fr.asm`;
  } else if (process.platform === 'linux') {
    cmd = `nasm -felf64 ${circuitDirName}/fr.asm`;
  } else throw 'Unsupported platform';
  shellExec(cmd);

  cmd = `${NODE_CMD} ${circomcliPath} ${circuitFilePath} -r ${r1csFilepath} -c ${cFilepath} -s ${symFilepath}`;
  shellExec(cmd);

  // the binary needs a $arg0.dat file, so we make a symbol link here
  cmd = `ln -s circuit.dat circuit.fast.dat`;
  shellExec(cmd, { cwd: circuitDirName });
}

async function compileNativeBinary({
  circuitDirName,
  r1csFilepath,
  circuitFilePath,
  symFilepath,
  binaryFilePath,
  verbose,
  sanityCheck,
  alwaysRecompile,
}) {
  await generateSrcsForNativeBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, verbose, alwaysRecompile });
  const shellExec = shellExecFnBuilder(verbose);
  let compileCmd = `g++ ${circuitDirName}/main.cpp ${circuitDirName}/calcwit.cpp ${circuitDirName}/utils.cpp ${circuitDirName}/fr.cpp ${circuitDirName}/fr.o ${circuitDirName}/circuit.cpp -o ${binaryFilePath} -lgmp -std=c++11 -O3`;
  if (process.platform === 'darwin') {
    // do nothing
  } else if (process.platform === 'linux') {
    compileCmd += ' -pthread -fopenmp';
  } else {
    throw 'Unsupported platform';
  }
  if (sanityCheck) {
    compileCmd += ' -DSANITY_CHECK';
  }
  shellExec(compileCmd);
}

async function compileCircuitDir(circuitDirName, { alwaysRecompile, verbose, backend, sanityCheck }) {
  // console.log('compiling dir', circuitDirName);
  const circuitFilePath = path.join(circuitDirName, 'circuit.circom');
  const r1csFilepath = path.join(circuitDirName, 'circuit.r1cs');
  const symFilepath = path.join(circuitDirName, 'circuit.sym');
  let binaryFilePath: string;
  if (backend === 'native') {
    if (sanityCheck) {
      binaryFilePath = path.join(circuitDirName, 'circuit');
    } else {
      binaryFilePath = path.join(circuitDirName, 'circuit.fast');
    }
  } else {
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
    await compileNativeBinary({
      circuitDirName,
      r1csFilepath,
      circuitFilePath,
      symFilepath,
      binaryFilePath,
      verbose,
      sanityCheck,
      alwaysRecompile,
    });
  } else {
    // sanity check is not supported for wasm backend now
    await compileWasmBinary({ circuitDirName, r1csFilepath, circuitFilePath, symFilepath, binaryFilePath, verbose });
  }
  return { circuitFilePath, r1csFilepath, symFilepath, binaryFilePath };
}

class WitnessGenerator {
  circuit: any;
  component: any;
  name: string;
  circuitDirName: string;
  binaryFilePath: string;
  alwaysRecompile: boolean;
  sanityCheck: boolean;
  verbose: boolean;
  writeExpectedOutput: boolean;
  backend: string;
  constructor(
    name,
    { backend, alwaysRecompile, verbose, sanityCheck } = { backend: 'native', alwaysRecompile: true, verbose: false, sanityCheck: true },
  ) {
    this.name = name;
    // we can specify cached files to avoid compiling every time
    this.alwaysRecompile = alwaysRecompile;
    this.verbose = verbose;
    this.backend = backend;
    this.sanityCheck = sanityCheck;
    if (this.verbose) {
      if (this.backend == 'wasm' && this.sanityCheck) {
        console.log('WARN: sanity check is not supported for wasm backend now');
      }
    }
  }

  async compile(circuitDirName) {
    this.circuitDirName = path.resolve(circuitDirName);
    if (this.backend === 'native') {
      const needFeatures = ['bmi2', 'adx'];
      let cpuFeatures = (await si.cpu()).flags.split(/\s/);
      if (process.platform === 'darwin') {
        const stdout = shelljs.exec('sysctl machdep.cpu.leaf7_features', { silent: true });
        const features = stdout.trim().toLowerCase().split(/\s/).slice(1);
        cpuFeatures.push(...features);
      }
      for (const f of needFeatures) {
        if (!cpuFeatures.includes(f)) {
          console.log(`cpu missing needed feature ${f} for native backend, fallback to wasm`);
          console.log(`cpus earlier than Intel Boradwell / AMD Ryzen are not supported for native backend`);
          this.backend = 'wasm';
          break;
        }
      }
    }

    const { r1csFilepath, symFilepath, binaryFilePath } = await compileCircuitDir(this.circuitDirName, {
      alwaysRecompile: this.alwaysRecompile,
      verbose: this.verbose,
      backend: this.backend,
      sanityCheck: this.sanityCheck,
    });
    this.binaryFilePath = binaryFilePath;
    return { r1csFilepath, symFilepath };
  }

  async generateWitness(inputFilePath: string, witnessFilePath: string) {
    var cmd: string;
    if (this.binaryFilePath == '' || !fs.existsSync(this.binaryFilePath)) {
      throw new Error('invalid bin ' + this.binaryFilePath + '. Has the circuit been compiled?');
    }
    if (!witnessFilePath.endsWith('.json') && !witnessFilePath.endsWith('.wtns')) {
      throw new Error('invalid witness file type');
    }
    // gen witness
    if (this.backend === 'native') {
      cmd = `${this.binaryFilePath} ${inputFilePath} ${witnessFilePath}`;
      if (this.verbose) {
        console.log(cmd);
      }
      const genWtnsOut = shelljs.exec(cmd, { silent: !this.verbose });

      if (genWtnsOut.stderr || genWtnsOut.code != 0) {
        if (!this.verbose) {
          // don't display stderr twice
          console.error('\n' + genWtnsOut.stderr);
        }
        throw new Error('Could not generate witness');
      }
    } else {
      const snarkjsPath = path.join(require.resolve('snarkjs'), '..', 'cli.cjs');
      if (witnessFilePath.endsWith('.wtns')) {
        cmd = `${NODE_CMD} ${snarkjsPath} wc ${this.binaryFilePath} ${inputFilePath} ${witnessFilePath}`;
        shelljs.exec(cmd);
      } else {
        const witnessBinFile = path.join(this.circuitDirName, 'witness.wtns');
        const sameProcess = true;
        if (sameProcess) {
          const input = unstringifyBigInts(JSON.parse(await fs.promises.readFile(inputFilePath, 'utf8')));
          await wtns.calculate(input, this.binaryFilePath, witnessBinFile, defaultWitnessOption());
        } else {
          cmd = `${NODE_CMD} ${snarkjsPath} wc ${this.binaryFilePath} ${inputFilePath} ${witnessBinFile}`;
          shelljs.exec(cmd);
        }
        cmd = `${NODE_CMD} ${snarkjsPath} wej ${witnessBinFile} ${witnessFilePath}`;
        shelljs.exec(cmd);
      }
    }
  }
}

function defaultWitnessOption() {
  let logFn = console.log;
  let calculateWitnessOptions = {
    sanityCheck: true,
    logTrigger: logFn,
    logOutput: logFn,
    logStartComponent: logFn,
    logFinishComponent: logFn,
    logSetSignal: logFn,
    logGetSignal: logFn,
  };
  return calculateWitnessOptions;
}

export { WitnessGenerator, compileCircuitDir };
