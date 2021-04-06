# snarkit

A toolkit for circom circuit development.

The main difference of `snarkit` compared to the `snarkjs` official tool is that `snarkit` is more 
friendly for developing huge circuits due to first-class native witness generator support. If you are new to circuit development or your circuit is small, `snarkjs` may be a better choice for you. 

# Example

The following demos how to test a circuit with given inputs/outputs.

```
$ npm install snarkit

# first, you should prepare the circuit and input/output as the following structure
# all the input.json/output.json pair inside data/*** folder will be tested
# output.json can be an empty json file if you don't need to test against any circuit outputs.
$ find num2bits/
num2bits/
num2bits/data
num2bits/data/case01
num2bits/data/case01/output.json
num2bits/data/case01/input.json
num2bits/circuit.circom

# Snarkit has two backend: wasm and native(cpp). Only native backend can process huge circuits, you have to install some dependencies first before using it.

# use wasm backend
# compile the circuit
$ npx snarkit compile num2bits --backend wasm
# test the circuit
$ npx snarkit check num2bits --backend wasm

# use native backend
# install deps
$ sudo apt install nlohmann-json3-dev nasm g++
# compile the circuit
$ npx snarkit compile num2bits --backend native
# test the circuit
$ npx snarkit check num2bits --backend native


```


