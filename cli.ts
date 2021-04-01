#!/usr/bin/env node
import { compileCircuitDir, testCircuitDir } from './index';
import { Command } from 'commander';

async function main() {
  try {
    const program = new Command();

    program
      .command('compile <circuit_dir>')
      .description('compile a circom circuit dir')
      .option('-f, --force_recompile', 'ignore compiled files', false)
      .option('-v, --verbose', 'print verbose log', true)
      .option('-b, --backend', 'native or wasm', 'wasm')
      .action(async (circuit_dir, options) => {
        await compileCircuitDir(circuit_dir, {
          alwaysRecompile: options.force_recompile,
          verbose: options.verbose,
          backend: options.backend,
        });
      });

    program
      .command('check <circuit_dir>')
      .alias('test')
      .option('-d, --data_dir', 'all input.json/output.json inside this dir will be tested', '')
      .option('-f, --force_recompile', 'ignore compiled files', false)
      .option('-v, --verbose', 'print verbose log', true)
      .option('-b, --backend', 'native or wasm', 'wasm')
      .description('test a circom circuit with given inputs/outputs')
      .action(async (circuit_dir, options) => {
        await testCircuitDir(circuit_dir, options.data_dir, {
          alwaysRecompile: options.force_recompile,
          verbose: options.verbose,
          backend: options.backend,
        });
      });

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
main();
