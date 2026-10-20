import {createHash} from 'node:crypto';

export const PROGRAM_ID_DEFAULT='F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x';
export const TOKEN_PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const ASSOCIATED_TOKEN_PROGRAM='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
export const SYSTEM_PROGRAM='11111111111111111111111111111111';
export const COMPUTE_BUDGET_PROGRAM='ComputeBudget111111111111111111111111111111';

export const ESCROW_LOCKED=0,ESCROW_REFUNDED=1,ESCROW_SETTLED=2;
export const MIN_LOCK_SECONDS=86400;

const INSTRUCTION_NAMES=[
 'initialize','stake','unstake','deposit_escrow','refund_escrow','settle','cancel_match',
 'set_paused','set_settlement_authority','set_lock_seconds'
];
export const DISCRIMINATORS=Object.fromEntries(INSTRUCTION_NAMES.map(name=>[
 name,createHash('sha256').update('global:'+name).digest().subarray(0,8)
]));

export function instructionName(data){
 if(!data||data.length<8)return null;
 for(const [name,disc] of Object.entries(DISCRIMINATORS))if(disc.equals(data.subarray(0,8)))return name;
 return null;
}

export function intentHash(intentId){
 if(typeof intentId!=='string'||!intentId)throw new Error('Intent ID required.');
 try{
  let s=intentId.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const bytes=Buffer.from(s,'base64');
  if(bytes.length===32)return bytes;
 }catch{/* hashed below */}
 return sha256Sync(intentId);
}

export function matchHash(matchId){
 if(typeof matchId!=='string'||!matchId||matchId.length>64)throw new Error('Match ID required.');
 return sha256Sync(matchId);
}

export function refundAllowed(sides,cancelled,settled){
 return !settled&&(sides!==0b11||cancelled===true);
}

export function payouts(winner,amountUnits,participants){
 if(![-1,0,1].includes(winner))throw new Error('Winner must be -1, 0, or 1.');
 if(!/^\d{1,30}$/.test(String(amountUnits))||BigInt(amountUnits)<=0n)throw new Error('Invalid stake.');
 if(!Array.isArray(participants)||participants.length!==2)throw new Error('Both escrow participants are required.');
 const stake=BigInt(amountUnits);
 return participants.map(p=>{
  if(![0,1].includes(p.side)||typeof p.wallet!=='string')throw new Error('Invalid participant.');
  const paid=winner===-1?stake:winner===p.side?stake*2n:0n;
  return {wallet:p.wallet,amountUnits:paid.toString()};
 });
}

export function asInt(value,label){
 if(value==null||value==='')return null;
 const n=typeof value==='number'?value:Number(value);
 if(!Number.isInteger(n))throw new Error(label+' must be an integer.');
 return n;
}

export function assertUserIntent(intent){
 if(!intent||typeof intent!=='object')throw new Error('Intent required.');
 if(!['stake','unstake','escrow','refund'].includes(intent.kind))throw new Error('Unsupported intent kind.');
 if(typeof intent.wallet!=='string'||!intent.wallet)throw new Error('Wallet required.');
 if(intent.kind==='stake'){
  intent.card=asInt(intent.card,'Card');
  intent.targetLevel=asInt(intent.targetLevel,'Target level');
  if(intent.card==null||intent.card<0||intent.card>11)throw new Error('Card index must be 0–11.');
  if(intent.targetLevel==null||intent.targetLevel<2||intent.targetLevel>5)throw new Error('Target level must be 2–5.');
 }
 if(intent.kind==='escrow'||intent.kind==='refund'){
  intent.side=asInt(intent.side,'Side');
  if(![0,1].includes(intent.side))throw new Error('Side must be 0 or 1.');
  if(typeof intent.matchId!=='string'||!intent.matchId)throw new Error('Match ID required.');
 }
 if(intent.kind==='unstake'&&typeof intent.position!=='string')throw new Error('Staking position required.');
 if(!/^\d{1,30}$/.test(String(intent.amountUnits))||BigInt(intent.amountUnits)<=0n)throw new Error('Invalid amount.');
}

export function encodeStakeData({intentHash:hash,amount,card,targetLevel}){
 return Buffer.concat([DISCRIMINATORS.stake,Buffer.from(hash),u64(amount),Buffer.from([card,targetLevel])]);
}
export function encodeUnstakeData(){return Buffer.from(DISCRIMINATORS.unstake);}
export function encodeEscrowData({matchHash:hash,side,amount}){return Buffer.concat([DISCRIMINATORS.deposit_escrow,Buffer.from(hash),Buffer.from([side]),u64(amount)]);}
export function encodeRefundData({matchHash:hash,side}){return Buffer.concat([DISCRIMINATORS.refund_escrow,Buffer.from(hash),Buffer.from([side])]);}
export function encodeSettleData({matchHash:hash,winner}){return Buffer.concat([DISCRIMINATORS.settle,Buffer.from(hash),Buffer.from([winner&0xff])]);}
export function encodeCancelData({matchHash:hash}){return Buffer.concat([DISCRIMINATORS.cancel_match,Buffer.from(hash)]);}
export function encodeInitializeData({settlementAuthority,lockSeconds}){return Buffer.concat([DISCRIMINATORS.initialize,Buffer.from(settlementAuthority),i64(lockSeconds)]);}

export function decodeStakePosition(data){
 const body=skipDisc(data,8+32+32+8+1+1+8+1+1+32);
 return {
  owner:body.subarray(0,32),mint:body.subarray(32,64),amount:readU64(body,64),
  card:body[72],targetLevel:body[73],lockUntil:readI64(body,74),withdrawn:body[82]===1,
  bump:body[83],intentHash:body.subarray(84,116)
 };
}
export function decodeEscrow(data){
 const body=skipDisc(data,8+32+32+32+1+8+1+1);
 return {
  owner:body.subarray(0,32),mint:body.subarray(32,64),matchHash:body.subarray(64,96),
  side:body[96],amount:readU64(body,97),status:body[105],bump:body[106]
 };
}
export function decodeMatch(data){
 const body=skipDisc(data,8+32+8+32+32+1+1+1+1);
 return {
  mint:body.subarray(0,32),amount:readU64(body,32),owner0:body.subarray(40,72),owner1:body.subarray(72,104),
  sides:body[104],settled:body[105]===1,cancelled:body[106]===1,bump:body[107]
 };
}
export function decodeConfig(data){
 const body=skipDisc(data,8+32+32+32+32+8+1+1+1);
 return {
  authority:body.subarray(0,32),settlementAuthority:body.subarray(32,64),mint:body.subarray(64,96),
  vault:body.subarray(96,128),lockSeconds:readI64(body,128),paused:body[136]===1,bump:body[137],vaultBump:body[138]
 };
}

function skipDisc(data,min){
 if(!data||data.length<min)throw new Error('Account data is truncated.');
 return Buffer.from(data).subarray(8);
}
function u64(n){const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;}
function i64(n){const b=Buffer.alloc(8);b.writeBigInt64LE(BigInt(n));return b;}
function readU64(buf,offset){return buf.readBigUInt64LE(offset).toString();}
function readI64(buf,offset){return Number(buf.readBigInt64LE(offset));}

function sha256Sync(s){return createHash('sha256').update(s,'utf8').digest();}
