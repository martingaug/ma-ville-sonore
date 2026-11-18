import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=process.env.DATA_DIR||'/app/data';
const normalize=s=>s.normalize('NFKC').toLowerCase().trim();
const records=new Map(), pending=new Map();
let token=null, spotifyRetry=0;
const pinned={'luvbfk':'7CjPQNkFoIlmPCPawTQtcn','maitrecorbeau':'6FqdkyYVCgDgUapvwBF2gv'};
const configured=()=>Boolean(process.env.SPOTIFY_CLIENT_ID&&process.env.SPOTIFY_CLIENT_SECRET);
const id=s=>createHash('sha256').update(normalize(s)).digest('hex');
async function json(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});if(!r.ok){if(r.status===429)spotifyRetry=Date.now()+Math.max(60,Number(r.headers.get('retry-after'))||60)*1000;throw Error('Service indisponible');}return r.json();}
export function inferArchitecture(tags,bio=''){
 const all=tags.join(' ').toLowerCase();
 const genre=/hip.?hop|\brap\b|trap|drill/.test(all)?'Rap / hip-hop':/house|techno|electronic|edm/.test(all)?'House / électro':/jazz|soul|blues/.test(all)?'Jazz / soul':/pop/.test(all)?'Pop':/rock|punk|indie/.test(all)?'Rock / indie':/folk|acoustic/.test(all)?'Folk / acoustique':'Genre non identifié';
 const places=[['New York','brick'],['Brooklyn','brick'],['Chicago','tower'],['Boston','brick'],['London','london'],['Londres','london'],['Paris','paris'],['Vancouver','gable'],['Los Angeles','gable'],['Santa Ana','gable'],['Cape Town','venue'],['Clamart','balcony'],['Fontenay-sous-Bois','balcony']];
 // N'accepter que des formulations d'origine explicites, jamais un nom de ville isolé.
 const evidence=bio.replace(/<[^>]*>/g,' ').split(/[.!?]/).filter(s=>/\b(from|born in|based in|hails from|originaire de|né à|née à|basé à)\b/i.test(s));
 let city='Origine non identifiée',type=null,quote=null;
 for(const sentence of evidence){for(const [place,shape] of places){const safe=place.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(?:from|born in|based in|hails from|originaire de|né à|née à|basé à)\\s+(?:the\\s+)?'+safe+'(?:\\b|,)', 'i').test(sentence)){city=place;type=shape;quote=sentence.trim().slice(0,250);break;}}if(type)break;}
 if(!type)type=genre.startsWith('Rap')?'balcony':genre.startsWith('House')?'warehouse':genre.startsWith('Jazz')?'brick':genre==='Pop'?'venue':/Rock|Folk/.test(genre)?'gable':'temporary';
 return {city,genre,type,evidence:quote};
}
async function spotify(name){
 if(!configured())return {photoStatus:'configuration_required'};
 if(Date.now()<spotifyRetry)return {photoStatus:'rate_limited'};
 if(!token||token.until<Date.now()){
 const auth=Buffer.from(process.env.SPOTIFY_CLIENT_ID+':'+process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
 const t=await json('https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 token={value:t.access_token,until:Date.now()+(t.expires_in-60)*1000};}
 const headers={Authorization:'Bearer '+token.value};let artist;
 if(pinned[normalize(name)])artist=await json('https://api.spotify.com/v1/artists/'+pinned[normalize(name)],{headers});
 else{const found=await json('https://api.spotify.com/v1/search?'+new URLSearchParams({q:'artist:'+name,type:'artist',limit:'10'}),{headers});const exact=(found.artists?.items||[]).filter(a=>normalize(a.name)===normalize(name));if(exact.length!==1)return {photoStatus:exact.length?'ambiguous':'not_found'};artist=exact[0];}
 return {photoStatus:artist.images?.length?'ready':'not_found',imageUrl:artist.images?.[0]?.url,spotifyUrl:artist.external_urls?.spotify};
}
export async function artistProfile(name){
 const key=normalize(name);if(pending.has(key))return pending.get(key);
 const task=(async()=>{let old=records.get(key);if(!old){try{old=JSON.parse(await readFile(root+'/artist-'+id(name)+'.json','utf8'));}catch{}}
 const mode=configured();if(old&&old.expires>Date.now()&&old.spotifyConfigured===mode){records.set(key,old);return publicProfile(old,name);}
 let tags=[],bio='',source=null,error=false;
 try{const u=new URL('https://ws.audioscrobbler.com/2.0/');u.search=new URLSearchParams({method:'artist.getInfo',artist:name,api_key:process.env.LASTFM_API_KEY||'',format:'json',autocorrect:'0'});const a=await json(u);if(a.error||!a.artist)throw Error();tags=(a.artist.tags?.tag||[]).map(t=>t.name);bio=a.artist.bio?.content||'';source=a.artist.url;}catch{error=true;}
 let photo;try{photo=await spotify(name);}catch{photo={photoStatus:'unavailable'};}
 const architecture=inferArchitecture(tags,bio);const result={...architecture,tags,source,...photo,spotifyConfigured:mode,expires:Date.now()+(error?60000:86400000),enrichmentStatus:error?'unavailable':'automatic'};
 if(error&&old){Object.assign(result,{city:old.city,genre:old.genre,type:old.type,tags:old.tags,source:old.source,evidence:old.evidence});}
 records.set(key,result);try{await mkdir(root,{recursive:true});await writeFile(root+'/artist-'+id(name)+'.json',JSON.stringify(result));}catch{}
 return publicProfile(result,name);})();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
function publicProfile(r,name){const {imageUrl,expires,spotifyConfigured,...safe}=r;return {...safe,photoUrl:imageUrl?'/api/artist-photo?name='+encodeURIComponent(name):null};}
export async function artistPhoto(name){await artistProfile(name);const r=records.get(normalize(name));if(!r?.imageUrl)return null;
 const url=new URL(r.imageUrl);if(url.protocol!=='https:'||url.hostname!=='i.scdn.co')return null;
 const file=root+'/photo-'+id(name);try{const meta=JSON.parse(await readFile(file+'.json','utf8'));if(meta.url===url.href&&meta.until>Date.now())return {body:await readFile(file),type:meta.type};}catch{}
 const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(8000)});const type=res.headers.get('content-type')?.split(';')[0];if(!res.ok||!['image/jpeg','image/png','image/webp'].includes(type))return null;
 const reader=res.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5000000){await reader.cancel();return null;}chunks.push(value);}const body=Buffer.concat(chunks);
 try{await writeFile(file,body);await writeFile(file+'.json',JSON.stringify({url:url.href,type,until:Date.now()+86400000}));}catch{}return {body,type};
}
