declare function writeJsonWithBigint(path: string, obj: Object): Promise<void>;
declare function writeCircuitIntoDir(circuitDir: any, component: any): Promise<void>;
declare function writeInputOutputIntoDir(dataDir: any, input: any, output: any): Promise<void>;
export { writeCircuitIntoDir, writeInputOutputIntoDir, writeJsonWithBigint };
