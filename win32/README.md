# Porting snarkit to windows platform

Current progress:

+ For WASM backend:

  Can compile and test under common scheme, with an small hacking on the underlying snarkjs:

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

  *Still being blocked, because the library for finite field provided by circom (iden3/ffiasm) could not provide a version of embedded assemble code which 
comply with [MS's calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions#Microsoft_x64_calling_convention) so the generated binary do not work yet*

## Prerequisite

We need mingw64 and some additional ported libraries:

+ gmp [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-gmp)
+ Nlohmann JSON [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-nlohmann-json)
+ nasm win32 [from MSYS2](https://packages.msys2.org/package/mingw-w64-x86_64-nasm)

Package from MSYS2 can be simply downloaded, extracted and copied to mingw64 directory

+ [win32 porting of mmap](https://github.com/alitrack/mman-win32)(base on `MapviewOfFile` win32 API)

## Notes

+ Runtime provided by circom (iden3/circom_runtime) is not completely compatible so we have made a hacking version of the main.cpp, and output to sheme (.wshm) has been disabled

+ Target being compiled are named as 'circuit.exe' and 'circuit.fast.exe'

## Known issues

+ circom do not correctly escape the anti-slash ('\\') inside windows directory so the `checkAssert` expressions in circuit.cpp may be problemic