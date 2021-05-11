# snarkit

A toolkit to compile and debug circom circuit.

# Features

### Better support for huge circuits

`snarkit` supports both wasm witness generator and native(cpp) witness generator.
So compared to the `snarkjs` official tool, `snarkit` is more friendly for developing huge circuits by using native backend.

### Better error detection

`snarkit` can print very helpful error messages when the circuit code goes wrong. It can display the code line number and the component/signals related to the error, so we can detect the reason for the error quickly and fix it. Example:

```
# display incorrect component and signals
$ snarkit check ./testdata/num2bits_err/

Invalid constraint:
0 * 0 != ((-1)*signal1 + 1*signal2 + 2*signal3 + 4*signal4 + 8*signal5 + 16*signal6 + 32*signal7 + 64*signal8 + 128*signal9)
Related signals:
signal1: main.num
signal2: main.bits[0]
signal3: main.bits[1]
signal4: main.bits[2]
signal5: main.bits[3]
signal6: main.bits[4]
signal7: main.bits[5]
signal8: main.bits[6]
signal9: main.bits[7]
please check your circuit and input

# display incorrect code line number
$ snarkit check ./testdata/num2bits_err/ --sanity_check

Constraint doesn't match, /home/ubuntu/repos/snarkit/testdata/num2bits_err/circuit.circom:11:4: 3 != 7circuit: /home/ubuntu/repos/snarkit/testdata/num2bits_err/calcwit.cpp:201: void Circom_CalcWit::checkConstraint(int, PFrElement, PFrElement, const char*): Assertion `false' failed.
Aborted (core dumped)
```

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
$ sudo apt install nlohmann-json3-dev nasm g++ libgmp-dev
# compile the circuit
$ npx snarkit compile num2bits --backend native
# test the circuit
$ npx snarkit check num2bits --backend native


```
