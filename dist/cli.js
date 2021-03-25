#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const commander_1 = require("commander");
async function main() {
    try {
        const program = new commander_1.Command();
        program
            .command('compile <circuit_dir>')
            .description('compile a circom circuit dir')
            .option('-f, --force_recompile', 'ignore compiled files', false)
            .option('-v, --verbose', 'print verbose log', true)
            .action(async (circuit_dir, options) => {
            console.log({ circuit_dir, options });
            await index_1.parepareCircuitDir(circuit_dir, { alwaysRecompile: options.force_recompile, verbose: options.verbose });
        });
        program
            .command('test <circuit_dir>')
            .description('test a circom circuit with given inputs/outputs')
            .action(async (circuit_dir, options) => {
            await index_1.testCircuitDir(circuit_dir);
        });
        await program.parseAsync(process.argv);
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=cli.js.map