# Some 'hacking' stuff is required for building native backend under windows

### main.cpp

The main.cpp is copied from circom_runtime with written to shmem (.wshm) entry being commentted out. So the code left can be compiled smoothly with mingw64

### fr.hpp

The library for finite field provided by circom (iden3/ffiasm) could not provide a version of embedded assemble code which comply with [MS's calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions#Microsoft_x64_calling_convention), they have a systemV abi so we must use a updated header file to force compiler following this calling convention under windows, see https://gcc.gnu.org/onlinedocs/gcc/x86-Function-Attributes.html#x86-Function-Attributes:

> The default is to use the Microsoft ABI when targeting Windows. On all other systems, the default is the System V ELF ABI.

It should note that some function in ffiasm is planned to be convert into asm so we may need our hacking up-to-date.