import {writeFileSync,existsSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Keypair} from '@solana/web3.js';

const adapterDir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const contractsDir=resolve(adapterDir,'..');
const programPath=resolve(contractsDir,'.program-keypair.json');
const payerPath=resolve(adapterDir,'.dev-keypair.json');

function loadOrCreate(path){
 if(existsSync(path))return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path,'utf8'))));
 const keypair=Keypair.generate();
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify([...keypair.secretKey]));
 return keypair;
}

const program=loadOrCreate(programPath);
const payer=loadOrCreate(payerPath);
console.log(JSON.stringify({
 programId:program.publicKey.toBase58(),
 programKeypair:programPath,
 payer:payer.publicKey.toBase58(),
 payerKeypair:payerPath,
 faucet:'https://faucet.solana.com'
},null,2));
