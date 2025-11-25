export const delay = ms => new Promise(res => setTimeout(res, ms));

export function rand64() {
    return (BigInt(Math.floor(Math.random()*2**30)) << 34n) ^ 
           (BigInt(Math.floor(Math.random()*2**30)) <<  4n) ^
           BigInt(Math.floor(Math.random()*2**4));
}