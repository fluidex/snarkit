declare class Checker {
    r1csFilepath: string;
    symFilepath: string;
    r1cs: any;
    symbols: any;
    signals: any;
    constructor(r1csFilepath: any, symFilepath: any);
    load(): Promise<void>;
    checkConstraintsAndOutput(witnessFilePath: any, expectedOutputFile: any): Promise<boolean>;
}
export { Checker };
