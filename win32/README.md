# Porting snarkit to windows platform

+ For WASM backend:

  You can compile and test under common scheme, with an small hacking on the underlying snarkjs:

```js
//Line 146@snarkjs/build/cli.cjs

/*
import pkg from "../package.json";
const version = pkg.version;
*/
//const __dirname$1 = path__default['default'].dirname(new URL((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('cli.cjs', document.baseURI).href))).pathname);
const __dirname$1 = __dirname

```
+ For Native backend:

  It is not a trivial job to get ready for a enviroment which can be used to generate native backend code and you should follow the following instructions:

## Prerequisite

We need mingw64 target for w64 (NOT win32) and some additional ported libraries:

+ gmp [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-gmp)
+ Nlohmann JSON [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-nlohmann-json)
+ nasm win32 [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-nasm)

Package from MSYS2 can be simply downloaded, extracted and copied to mingw64 directory

+ [win32 porting of mmap](https://github.com/alitrack/mman-win32)(base on `MapviewOfFile` win32 API)

## Notes

+ Runtime provided by circom (iden3/circom_runtime) is not completely compatible so we have made a hacking version of the main.cpp, and output to sheme (.wshm) has been disabled

+ Target being compiled are named as 'circuit.exe' and 'circuit.fast.exe'

+ Of course only x86_64 arch is the only choice because of the embedded asm code (just in case for somebody planning to apply it on the future ARM windows version ...)

+ The library for finite field provided by circom (iden3/ffiasm) generate embedded asm code with abi comply with [systemV calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions#Microsoft_x64_calling_convention) and has to be patched. See the corresponding [readme](win32/runtime/README.md)

## Known issues

+ circom do not correctly escape the anti-slash ('\\') inside windows directory so the `checkAssert` expressions in circuit.cpp may be problemic. Currently it has to be resolved by using a hacking for circom:

  some code must be appended to circom/src/utils.js

```js
//append to src/util.js

const escapeChars = /[\\'"?]/g;
module.exports.escapeCString = function (str) {
    return str.replace(escapeChars, '\\$&');
}

```
and patch ports/c/builder.js

```js
//Line 95@ports/c/builder.js

    checkConstraint(a, b, strErr) {
        this.ops.push({op: "CHECKCONSTRAINT", a, b, strErr: utils.escapeCString(strErr)});
    }

    checkAssert(a, strErr) {
        this.ops.push({op: "CHECKASSERT", a, strErr: utils.escapeCString(strErr)});
    }

```
