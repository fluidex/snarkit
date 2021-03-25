declare function parepareCircuitDir(circuitDirName: any, { alwaysRecompile, verbose }?: {
    alwaysRecompile?: boolean;
    verbose?: boolean;
}): {
    circuitFilePath: string;
    r1csFilepath: string;
    symFilepath: string;
    binaryFilePath: string;
};
declare class CircuitTester {
    circuit: any;
    component: any;
    name: string;
    circuitDirName: string;
    r1csFilepath: string;
    symFilepath: string;
    binaryFilePath: string;
    r1cs: any;
    symbols: any;
    alwaysRecompile: boolean;
    verbose: boolean;
    writeExpectedOutput: boolean;
    constructor(name: any, { alwaysRecompile, verbose }?: {
        alwaysRecompile?: boolean;
        verbose?: boolean;
    });
    compileAndload(circuitDirName: any): Promise<void>;
    generateWitness(inputFilePath: any, witnessFilePath: any): any;
    checkWitness(witness: any, expectedOutputJson: any): Promise<boolean>;
    checkInputOutputFile(inputFilePath: any, expectedOutputFile: any): Promise<boolean>;
    checkInputOutput(input: any, expectedOutputJson: any): Promise<boolean>;
}
declare function testCircuitDir(circuitDir: any): Promise<void>;
declare function writeCircuitIntoDir(circuitDir: any, component: any): Promise<void>;
declare function writeInputOutputIntoDir(dataDir: any, input: any, output: any): Promise<void>;
declare function testWithInputOutput(input: any, output: any, component: any, name: any, circuitDir?: string): Promise<void>;
export { testWithInputOutput, CircuitTester, writeCircuitIntoDir, writeInputOutputIntoDir, parepareCircuitDir, testCircuitDir };
