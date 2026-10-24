'use strict';
const NexusMoney=(()=>{
 const KEYS=Object.freeze(['base','delivery','extra','tax']),MAX=99999999999999n;
 function parse(raw){
  if(typeof raw!=='string')return {status:'invalid',reason:'請使用十進位金額'};
  const s=raw.trim();if(!s)return {status:'missing',reason:'金額尚未確認'};
  const match=/^(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d{1,2}))?$/i.exec(s);
  if(s.length>64||!match)return {status:'invalid',reason:'金額須為非負十進位，最多兩位小數；原值未改寫'};
  const [whole,part='']=match[1].split('.'),coefficient=BigInt((whole||'0')+part),shift=2+Number(match[2]||0)-part.length;
  if(Math.abs(shift)>64)return {status:'invalid',reason:'金額超出支援精度或範圍'};
  let minor;if(shift>=0)minor=coefficient*10n**BigInt(shift);else{const divisor=10n**BigInt(-shift);if(coefficient%divisor!==0n)return {status:'invalid',reason:'金額最多兩位小數；原值未改寫'};minor=coefficient/divisor;}
  if(minor>MAX)return {status:'invalid',reason:'金額超出支援範圍'};
  return {status:'ok',minor:minor.toString()};
 }
 function validMinor(v){return typeof v==='string'&&/^(0|[1-9]\d{0,13})$/.test(v)&&BigInt(v)<=MAX;}
 function decimal(v){if(!validMinor(v))throw Error('無效金額');const n=BigInt(v);return (n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');}
 function quote(q){
  if(!q||typeof q!=='object')return {status:'invalid',reason:'報價資料不符'};
  const amounts={};for(const key of KEYS){const x=parse(q[key]);if(x.status!=='ok')return {...x,key};amounts[key]=x.minor;}
  const total=Object.values(amounts).reduce((sum,x)=>sum+BigInt(x),0n);if(total>MAX)return {status:'invalid',reason:'總價超出支援範圍'};
  return {status:'ok',currency:'TWD',scale:2,amounts,totalMinor:total.toString(),decimal:decimal(total.toString())};
 }
 return Object.freeze({KEYS,parse,validMinor,decimal,quote});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NexusMoney;
