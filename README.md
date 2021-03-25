# circom-circuit-tester

A simple tool to test circom circuit with given inputs/outputs using the C tester.

# Example

```
# install deps
$ sudo apt install nlohmann-json3-dev nasm g++
$ npm install https://github.com/Fluidex/circom-circuit-tester

# first, you should prepare the circuit and input/output as the following structure
# all the input.json/output.json pair inside data/*** folder will be tested
$ find num2bits/
num2bits/
num2bits/data
num2bits/data/case01
num2bits/data/case01/output.json
num2bits/data/case01/input.json
num2bits/circuit.circom

# compile the circuit
$ npx snarkit compile num2bits
# test the circuit
$ npx snarkit test num2bits
```


