template CheckNumAndBits(n) {
    signal input num;
    signal input bits[n];
    var sum=0;

    for (var i = 0; i<n; i++) {
        bits[i] * (bits[i] -1 ) === 0;
        sum += bits[i] * 2**i;
    }

    num === sum;
}

component main = CheckNumAndBits(8);
