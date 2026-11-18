const images=new Map(),pending=new Map();
export async function coverImage(url){
 if(!url)return null;let u;try{u=new URL(url);}catch{return null;}
 if(u.protocol!=='https:'||!['lastfm.freetls.fastly.net','lastfm-img2.akamaized.net'].includes(u.hostname))return null;
 const old=images.get(url);if(old&&old.until>Date.now())return old;
 if(pending.has(url))return pending.get(url);
 const job=(async()=>{try{const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(8000)});const type=r.headers.get('content-type')?.split(';')[0];if(!r.ok||!['image/jpeg','image/png','image/webp'].includes(type))return null;const chunks=[];let total=0;for await(const chunk of r.body){total+=chunk.length;if(total>5000000)return null;chunks.push(chunk);}const image={body:Buffer.concat(chunks),type,until:Date.now()+86400000};if(images.size>=250)images.delete(images.keys().next().value);images.set(url,image);return image;}catch{return old||null;}})();pending.set(url,job);try{return await job;}finally{pending.delete(url);}
}
