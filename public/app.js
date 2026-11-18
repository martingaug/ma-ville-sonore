const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profiles = {
  'will paquin': {city:'Boston',genre:'Indie / folk',type:'brick',color:'#c47b62',accent:'#79b9b2',story:'Un immeuble de briques aux fenêtres cintrées évoque Boston. Un escalier extérieur, une corniche et une salle de guitare distinguent sa silhouette.',source:'https://www.highroadtouring.com/artists/will-paquin/'},
  'lucki': {city:'Chicago',genre:'Rap / trap',type:'brick',color:'#b98fba',accent:'#f4c253',story:'Un immeuble en briques inspiré de Chicago, avec toit plat et studio de rap. La palette mauve est un choix graphique pour sa musique atmosphérique.',source:'https://www.allmusic.com/artist/lucki-mn0003887247'},
  'plk': {city:'Paris → Clamart',genre:'Rap',type:'balcony',color:'#e4b995',accent:'#ca5f50',story:'Des balcons résidentiels évoquent son parcours entre Paris et Clamart. Le studio en pied d’immeuble représente le rap : ce n’est pas une reproduction de son domicile.',source:'https://www.booska-p.com/musique/dossiers-musique/2069-petit-polak-est-devenu-grand/'},
  'internet girl': {city:'Le Cap',genre:'Punk / hyperpop',type:'venue',color:'#e786a6',accent:'#73b7cb',story:'Une salle de concert dans un bâtiment coloré, avec affiches et enseigne électrique. Le lieu et le mélange punk/hyperpop sont documentés ; la façade est une création libre.',source:'https://internetgirl.bandcamp.com/album/those-who-are-against-us-all-the-time'},
  'la fève': {city:'Fontenay-sous-Bois',genre:'Rap / trap',type:'balcony',color:'#e1b552',accent:'#609e73',story:'Un atelier de production au pied d’un immeuble à balcons. Le bâtiment combine son ancrage à Fontenay-sous-Bois et sa pratique du rap et de la production.',source:'https://www.backinthedayz.be/artiste/la-feve'},
  'peach pit': {city:'Vancouver',genre:'Indie pop / rock',type:'gable',color:'#f2b79c',accent:'#77a8a4',story:'Une maison à pignon inspirée de Vancouver abrite un garage de répétition. Sa couleur pêche est un clin d’œil graphique au nom du groupe.',source:'https://www.rcarecords.co.uk/artists/peach-pit'},
  'juls': {city:'Londres ↔ Accra',genre:'Afrobeats / production',type:'brick',color:'#b88360',accent:'#e6b84c',story:'Les briques évoquent Londres ; une terrasse ouverte et une enseigne Londres–Accra racontent son parcours entre les deux villes. Le rez-de-chaussée accueille un studio.',source:'https://www.rinse.fm/shows/juls'}
};
const enriched = new Map(), artistQueue=[], queued=new Set();let working=false;
function queueArtists(names){for(const name of names){if(!queued.has(name)){queued.add(name);artistQueue.push(name);}}runArtistQueue();}
async function runArtistQueue(){if(working)return;working=true;while(artistQueue.length){const name=artistQueue.shift();try{const r=await fetch('/api/artist?name='+encodeURIComponent(name));if(r.ok){enriched.set(name.toLowerCase(),await r.json());render();}}catch{}await new Promise(resolve=>setTimeout(resolve,350));}working=false;}
function photoCard(name){
  const albums=new Map();
  for(const track of data.tracks){
    if(track.artist.toLowerCase()!==name.toLowerCase() || !track.coverUrl)continue;
    const album=track.album||track.title;
    if(!albums.has(album))albums.set(album,track);
  }
  if(!albums.size)return '';
  return '<div class="cover-gallery">'+[...albums.entries()].slice(0,6).map(([album,track])=>
    `<figure class="album-cover"><img class="artist-photo" src="${esc(track.coverUrl)}" alt="Pochette de ${esc(album)}" loading="lazy" width="160" height="160"><figcaption>${esc(album)}</figcaption></figure>`
  ).join('')+'</div>';
}
const palette=['#de9b77','#88bfb6','#e2b56e','#cb98b6','#91b4ce','#d9a292'];
let data={tracks:[]}, period='all', selected='studio', items=[], loading=false;
const svg=$('#city');
const hash=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
function profile(name){const known=profiles[name.toLowerCase()],auto=enriched.get(name.toLowerCase()),seed=hash(name);if(known)return known;const type=auto?.type||'temporary';return {city:auto?.city||'Origine non identifiée',genre:auto?.genre||'Genre en cours de recherche',type,color:`hsl(${seed%360} 38% 68%)`,accent:`hsl(${(seed+145)%360} 35% 42%)`,source:auto?.source,automatic:true,story:auto?`Interprétation automatique : ${auto.genre}. ${auto.city==='Origine non identifiée'?'Aucune origine suffisamment explicite trouvée ; la forme est basée sur le genre.':'Lieu extrait de la biographie : '+auto.city+'. Cette association reste à vérifier.'} La palette et les détails sont propres à cet artiste.`:'Recherche des tags et de la biographie en cours. Un atelier personnalisé est affiché en attendant.'};}function project(x,y,z=0){return [700+(x-y)*.86,160+(x+y)*.46-z];}
function poly(points,fill,extra=''){return `<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;}
function plane(x,y,z,w,d,fill,extra=''){return poly([project(x,y,z),project(x+w,y,z),project(x+w,y+d,z),project(x,y+d,z)],fill,extra);}
function line(a,b,color,width=1){return `<path d="M${a.join(' ')} L${b.join(' ')}" stroke="${color}" stroke-width="${width}" fill="none"/>`;}
function text(x,y,s,size=10,color='#294438'){return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" fill="${color}">${esc(s)}</text>`;}
function box(x,y,z,w,d,h,color){return poly([project(x,y+d,z),project(x+w,y+d,z),project(x+w,y+d,z+h),project(x,y+d,z+h)],color)+poly([project(x+w,y,z),project(x+w,y+d,z),project(x+w,y+d,z+h),project(x+w,y,z+h)],color)+plane(x,y,z+h,w,d,color)+poly([project(x+w,y,z),project(x+w,y+d,z),project(x+w,y+d,z+h),project(x+w,y,z+h)],'#00000019');}
function palm(x,y){const [px,py]=project(x,y);let s=`<ellipse cx="${px+9}" cy="${py+3}" rx="22" ry="7" fill="#33584116"/><path d="M${px} ${py} Q${px+7} ${py-25} ${px+2} ${py-58}" stroke="#aa835b" stroke-width="5" fill="none"/>`;for(let i=0;i<6;i++){let angle=i*Math.PI/3;let dx=Math.cos(angle)*29,dy=Math.sin(angle)*14;s+=`<path d="M${px+2} ${py-58} Q${px+dx*.45} ${py-80+dy*.2} ${px+dx} ${py-53+dy} Q${px+dx*.45} ${py-57+dy*.2} ${px+2} ${py-58}" fill="${i%2?'#478d69':'#6aab74'}"/>`;}return s;}
function facade(x,y,h,content){const q=project(x,y,h);return `<g transform="matrix(.86 .46 0 1 ${q[0]} ${q[1]})">${content}</g>`;}
function windowShape(x,y,w,h,arched=false){return `${arched?`<path d="M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z"`:`<rect x="${x}" y="${y}" width="${w}" height="${h}"`} fill="#345664" stroke="#fff0ce" stroke-width="2.5"/><path d="M${x+w/2} ${y+3}v${h-3}M${x+1} ${y+h*.57}h${w-2}" stroke="#d9dbbc" stroke-width="1.3"/>`;}
function namePlate(name,x,y,sub){const q=project(x,y),w=Math.max(108,Math.min(210,name.length*10+28));return `<g class="nameplate" pointer-events="none"><rect x="${q[0]-w/2}" y="${q[1]}" width="${w}" height="42" rx="8" fill="#fffdf5" stroke="#bdcbb5"/><text x="${q[0]}" y="${q[1]+19}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="800" fill="#213e36">${esc(name)}</text><text x="${q[0]}" y="${q[1]+34}" text-anchor="middle" font-family="Arial" font-size="10" fill="#657768">${esc(sub)}</text></g>`;}
function landmark(item,x,y,kind){const p=profile(item.name);let s=plane(x-20,y-20,2,155,125,'#f6ddb3');const q=project(x+55,y+65);let art='';const steel='#6b675e';
 if(kind==='eiffel'){
 art=`<path d="M-59 0Q-17-65-8-187H8Q17-65 59 0H36Q15-35 0-35Q-15-35-36 0Z" fill="#caa874" stroke="#846c4c" stroke-width="3"/><path d="M0-187V-215M-35-63H35M-20-112H20M-11-160H11" stroke="#665949" stroke-width="5"/><path d="M-34-10L24-89M34-10L-24-89M-22-72L14-136M22-72L-14-136M-13-125L7-172M13-125L-7-172" fill="none" stroke="#806c4f" stroke-width="3"/><path d="M-30-65H30M-19-113H19" stroke="#ead2a6" stroke-width="9"/>`;
 }else if(kind==='clock'){
 art=`<path d="M-29 0V-157H29V0Z" fill="#d8bd85" stroke="#aa8d5d" stroke-width="3"/><path d="M-39-157L-25-181H25L39-157Z" fill="#535f59"/><path d="M-24-181L0-218L24-181Z" fill="#36564e"/><path d="M0-218V-232" stroke="#b89b60" stroke-width="3"/><rect x="-36" y="-156" width="72" height="47" fill="#ebd5a6" stroke="#a88c61" stroke-width="3"/><circle cy="-133" r="19" fill="#fff9df" stroke="#3a4e45" stroke-width="4"/><path d="M0-147V-133L10-127" stroke="#34453e" stroke-width="3"/>`;for(let i=0;i<5;i++)art+=`<path d="M${-21+i*10}-100V-9" stroke="#f7e1af" stroke-width="4"/>`;
 }else if(kind==='empire'){
 art=`<path d="M-49 0V-102H-37V-142H-23V-177H-11V-198H11V-177H23V-142H37V-102H49V0Z" fill="#adb4ab" stroke="#66776f" stroke-width="3"/><path d="M0-198V-231" stroke="#65796f" stroke-width="4"/>`;for(let i=-35;i<=35;i+=10)art+=`<path d="M${i}-95V-10" stroke="#3f646a" stroke-width="4"/>`;for(let i=-15;i<=15;i+=10)art+=`<path d="M${i}-168V-103" stroke="#3f646a" stroke-width="3"/>`;
 }else if(kind==='warehouse'){
 art=`<path d="M-72 0V-87L-25-126V-87L21-126V-87L69-126V0Z" fill="${p.color}" stroke="#58746a" stroke-width="3"/><path d="M-68-85L-28-117V-85M-20-85L18-117V-85M27-85L65-117V-85" fill="#9bd0d1"/><rect x="-58" y="-68" width="116" height="39" fill="#416974"/><path d="M-30-68V-29M0-68V-29M30-68V-29" stroke="#e8d5aa" stroke-width="3"/><rect x="-19" y="-25" width="38" height="25" fill="#30463f"/>`;
 }
 s+=`<g transform="translate(${q[0]} ${q[1]})" class="outline">${art}</g>`;return `<g class="building" data-name="${esc(item.name)}" tabindex="0" role="button" aria-label="${esc(item.name)}, ${item.count} écoutes">${s}</g>`;
}

function building(item,x,y){const info=profile(item.name);const place=info.city;const monument=/Paris/.test(place)?"eiffel":/London|Londres/.test(place)?"clock":/New York|Brooklyn/.test(place)?"empire":/House|électro/.test(info.genre)?"warehouse":null;if(monument)return landmark(item,x,y,monument);const p=profile(item.name),key=item.name.toLowerCase();let type=p.type;if(type==="temporary")type=["gable","venue","balcony","brick","tower"][hash(item.name)%5];
 if(key==='lucki')type='tower';if(key==='plk')type='paris';if(key==='juls')type='london';
 const floors=2+Math.min(3,Math.floor(Math.sqrt(item.count))),w=110,d=68,h=type==='venue'?88:type==='gable'?90:type==='temporary'?82:45+floors*23;
 let s=plane(x-12,y-12,1,144,108,'#f6dfb5')+plane(x+16,y,2,w+30,d+24,'#324a3520');
 s+=box(x,y,3,w,d,h,p.color);let front='';
 for(let f=0;f<Math.floor((h-38)/26);f++)for(let c=0;c<4;c++)front+=windowShape(9+c*25,12+f*26,15,20,type==='brick'||type==='paris');
 front+=`<rect x="0" y="${h-32}" width="110" height="32" fill="${p.accent}"/>`;
 for(let c=0;c<3;c++)front+=windowShape(12+c*33,h-27,22,26,true);
 let sign=/rap/i.test(p.genre)?'RECORDING STUDIO':/pop|punk/i.test(p.genre)?'LIVE MUSIC':/folk|indie/i.test(p.genre)?'GUITAR ROOM':p.source?'SOUND STUDIO':'PORTRAIT À CRÉER';
 front+=`<rect x="2" y="${h-40}" width="106" height="13" fill="#25483f"/><text x="55" y="${h-31}" font-family="Arial" font-size="7" text-anchor="middle" fill="#fff0c5">${sign}</text>`;
 if(type==='brick'||type==='london'){
   for(let z=7;z<h-40;z+=8){front+=`<path d="M0 ${z}H110" stroke="#674435" stroke-opacity=".3"/>`;for(let c=0;c<8;c++)front+=`<path d="M${c*16+(z%16?8:0)} ${z}v8" stroke="#674435" stroke-opacity=".25"/>`;}
   front+=`<path d="M0 0H110M-4 5H114M0 10H110" stroke="#f4d9af" stroke-width="4"/>`;
 }
 if(type==='paris'){
   for(let z=35;z<h-40;z+=27){front+=`<rect x="-3" y="${z}" width="116" height="4" fill="#fff0cf"/><path d="M-2 ${z-9}H112" stroke="#344c4b" stroke-width="1.5"/>`;for(let c=0;c<18;c++)front+=`<path d="M${c*6.5} ${z-9}v9" stroke="#344c4b"/>`;}
   front+=`<path d="M0 2H110M0 6H110" stroke="#fff2d2" stroke-width="3"/>`;
 }
 if(type==='balcony'){
   for(let f=0;f<3;f++){front+=`<rect x="3" y="${15+f*26}" width="104" height="6" fill="#f8e7c7"/><path d="M3 ${8+f*26}H107" stroke="#437160"/>`;for(let c=0;c<10;c++)front+=`<path d="M${8+c*10} ${8+f*26}v7" stroke="#437160"/>`;}
 }
 if(type==='venue')front=`<rect x="5" y="8" width="100" height="28" fill="#fff0cc"/><text x="55" y="27" font-family="Arial" font-weight="900" font-size="16" text-anchor="middle" fill="#bf456b">LIVE</text><path d="M5 48Q30 15 55 48T105 48V88H5Z" fill="#86bfbd"/><rect x="36" y="48" width="40" height="40" fill="#3e5861"/><path d="M56 50V88" stroke="#f6c567" stroke-width="3"/><rect x="8" y="56" width="17" height="24" fill="#eab75b"/><rect x="84" y="56" width="17" height="24" fill="#c26484"/>`;
 if(type==='temporary')front=`<path d="M0 20H110" stroke="#fff0cc" stroke-width="7"/><rect x="8" y="28" width="94" height="12" fill="#698d7c"/><path d="M8 40H102L94 51H0Z" fill="#fff1ce"/>${windowShape(12,52,27,27,true)}${windowShape(47,52,18,30,true)}${windowShape(74,52,27,27,true)}<text x="55" y="15" font-family="Arial" font-size="9" text-anchor="middle" fill="#315143">ATELIER</text>`;
 s+=facade(x,y+d+1,h+3,front);
 for(let r=0;r<Math.floor((h-25)/25);r++)for(let c=0;c<2;c++){const yy=y+12+c*28,z=h-12-r*25;s+=poly([project(x+w+1,yy,z),project(x+w+1,yy+14,z),project(x+w+1,yy+14,z-17),project(x+w+1,yy,z-17)],'#345664');}
 s+=plane(x-4,y-4,h+4,w+8,d+8,'#f9e4bf','class="outline"');
 if(type==='paris'){
   s+=poly([project(x-5,y-5,h+5),project(x+12,y+10,h+35),project(x+w-12,y+10,h+35),project(x+w+5,y-5,h+5)],'#637b83');
   s+=poly([project(x-5,y+d+5,h+5),project(x+12,y+d-10,h+35),project(x+w-12,y+d-10,h+35),project(x+w+5,y+d+5,h+5)],'#465d6c');
   s+=plane(x+12,y+10,h+35,w-24,d-20,'#637b83');
   for(let c=0;c<3;c++){s+=box(x+13+c*31,y+d-9,h+6,19,10,20,'#f4d8b2');s+=facade(x+13+c*31,y+d+2,h+25,windowShape(3,2,12,15,true));}
   s+=box(x+7,y+8,h+28,8,8,20,'#b47c59');s+=box(x+91,y+8,h+28,8,8,20,'#b47c59');
 }else if(type==='tower'){
   s+=box(x+17,y+10,h+5,76,48,24,'#a97e9d')+box(x+30,y+16,h+29,49,34,22,'#b28aa7');s+=line(project(x+55,y+33,h+51),project(x+55,y+33,h+90),'#4e6267',3);
   for(let c=0;c<7;c++)s+=line(project(x+7+c*15,y+d+2,h-8),project(x+7+c*15,y+d+2,42),'#f7d8ac',2);
 }else if(type==='gable'||type==='london'){
   s+=poly([project(x-5,y-5,h+6),project(x+w/2,y-5,h+45),project(x+w/2,y+d+5,h+45),project(x-5,y+d+5,h+6)],'#6c8b84');
   s+=poly([project(x+w/2,y-5,h+45),project(x+w+5,y-5,h+6),project(x+w+5,y+d+5,h+6),project(x+w/2,y+d+5,h+45)],'#3e655f');
   s+=poly([project(x-5,y+d+6,h+6),project(x+w/2,y+d+6,h+45),project(x+w+5,y+d+6,h+6)],p.color);
   s+=box(x+12,y+10,h+22,9,12,31,'#a46752');
   if(type==='london')for(let z=42;z<h-20;z+=30){s+=box(x+32,y+d,z,40,12,24,'#f1d6ae');s+=facade(x+32,y+d+13,z+24,windowShape(5,3,30,18));}
 }else if(type==='venue'){
   s+=box(x+15,y+13,h+5,80,35,12,'#83b8b1');let q=project(x+55,y+55,h+26);s+=text(q[0],q[1],item.name.toUpperCase(),12,'#9f365a');
 }else if(type==='brick'){
   s+=box(x+18,y+14,h+5,32,29,9,'#8bafa4');
   s+=line(project(x+95,y+d+4,38),project(x+95,y+d+4,h-10),'#3b5758',3);
   for(let z=40;z<h-10;z+=24){s+=line(project(x+77,y+d+8,z),project(x+108,y+d+8,z),'#3b5758',3);s+=line(project(x+78,y+d+8,z),project(x+106,y+d+8,z+24),'#3b5758',2);}
 }else if(type==='temporary'){
   s+=box(x+20,y+14,h+5,70,42,5,p.accent);
 }
 if(item.now){let q=project(x+w/2,y+d,h+65);s+=`<circle class="playing-ring" cx="${q[0]}" cy="${q[1]}" r="9" fill="#ed764c"/>`;}
 return `<g class="building ${selected===item.name?'selected':''}" data-name="${esc(item.name)}" role="button" tabindex="0" aria-label="${esc(item.name)}, ${item.count} écoutes"><title>${esc(item.name)} · ${esc(p.city)} · ${esc(p.genre)}</title>${s}</g>`;
}
function liveTrack(){return !data.stale&&!data.message&&data.updatedAt&&Date.now()-data.updatedAt<190000?data.tracks.find(t=>t.nowPlaying):null;}
function stadium(x,y){const live=liveTrack();let s=plane(x-17,y-17,2,182,142,'#e8d8b7');s+=box(x-10,y-10,2,170,125,12,'#b0bcb0');s+=plane(x+4,y+6,15,143,94,live?'#83ae8d':'#a8b6a1');
for(let i=0;i<3;i++){s+=box(x-8+i*6,y,15+i*6,8,100-i*8,5,'#e0ae82');s+=box(x+143-i*6,y,15+i*6,8,100-i*8,5,'#e0ae82');s+=box(x+8,y+97-i*6,15+i*6,130,6,5,'#e0ae82');}
s+=box(x+30,y+7,16,80,38,13,'#354d56');s+=box(x+25,y+4,29,6,9,48,'#354d56')+box(x+109,y+4,29,6,9,48,'#354d56');s+=box(x+25,y+4,77,90,10,6,'#354d56');
let q=project(x+70,y+48,58);s+=text(q[0],q[1],live?'LIVE':'SCÈNE AU REPOS',10,'#f7d786');
if(live){const a=project(x+42,y+20,74),b=project(x+99,y+20,74);s+=`<g class="concert-lights">${poly([a,project(x+20,y+85,16),project(x+90,y+85,16)],'#f9ce5d55')}${poly([b,project(x+60,y+80,16),project(x+130,y+80,16)],'#d979b855')}</g>`;
const singer=project(x+70,y+35,30);s+=`<g class="concert-singer"><circle cx="${singer[0]}" cy="${singer[1]-15}" r="4" fill="#243d3e"/><path d="M${singer[0]} ${singer[1]-10}v13m0-9l10-5m-10 12l-5 7m5-7l5 7" stroke="#243d3e" stroke-width="3" fill="none"/></g>`;
for(let i=0;i<24;i++){const c=project(x+27+(i%6)*18,y+57+Math.floor(i/6)*10,21);s+=`<circle class="concert-fan" style="animation-delay:${(i%5)*.13}s" cx="${c[0]}" cy="${c[1]}" r="3" fill="${['#d77752','#516b82','#ddb252'][i%3]}"/>`;}}
return `<g class="building" data-name="stadium" role="button" tabindex="0" aria-label="Stade, ${live?esc(live.artist):'aucun concert en cours'}">${s}</g>`;}
function stadiumDetail(){const t=liveTrack();return `<span class="badge">LE STADE DE LA VILLE</span><h2>${t?'Sur scène : '+esc(t.artist):'La scène attend.'}</h2>${t?photoCard(t.artist,{color:'#d9bd8d'})+'<p><b>'+esc(t.title)+'</b><br>'+esc(t.album)+'</p>':'<p>Aucune lecture en cours confirmée par Last.fm. La scène se rallumera à la prochaine actualisation.</p>'}<p>Concert visuel animé, sans diffusion audio. L’artiste change selon le morceau signalé en cours par Last.fm.</p><p>Actualisation automatique toutes les 3 minutes : ce n’est pas une synchronisation à la seconde.</p>`;}

function studio(x,y){let s=plane(x-15,y-15,1,156,125,'#f0cc8f');s+=box(x,y,1,125,90,65,'#f4d6aa');s+=plane(x-6,y-6,68,137,102,'#f9e3bd','class="outline"');s+=box(x+12,y+8,69,100,47,14,'#ee8d65');s+=facade(x,y+91,66,`<rect x="5" y="18" width="55" height="43" fill="#62abb6"/><rect x="65" y="18" width="55" height="43" fill="#b95166"/><rect x="11" y="45" width="44" height="13" fill="#2e535d"/><rect x="71" y="45" width="44" height="13" fill="#543748"/><path d="M33 27V44M94 27V44" stroke="#f6e7bf" stroke-width="3"/><circle cx="33" cy="26" r="4" fill="#263e43"/><circle cx="94" cy="26" r="4" fill="#263e43"/><text x="32" y="14" text-anchor="middle" font-family="Arial" font-size="9" font-weight="800" fill="#246078">LUVBFK</text><text x="93" y="14" text-anchor="middle" font-family="Arial" font-size="7" font-weight="800" fill="#943d53">maitrecorbeau</text>`);s+=palm(x+145,y+55);let q=project(x+65,y+60,90);s+=text(q[0],q[1],'LMRT STUDIO',14,'#365747');return `<g class="building ${selected==='studio'?'selected':''}" data-name="studio" role="button" tabindex="0" aria-label="Studio LUVBFK et maitrecorbeau">${s}</g>`;}

function groupTracks(){const map=new Map();const min=period==='24'?Date.now()-86400000:0;for(const t of data.tracks){if(!t.artist||(!t.nowPlaying&&(!t.playedAt||t.playedAt<min)))continue;if(!map.has(t.artist))map.set(t.artist,{name:t.artist,count:0,tracks:[],now:false});const a=map.get(t.artist);a.tracks.push(t);if(!t.nowPlaying)a.count++;a.now ||= t.nowPlaying;}return [...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));}
function render(){items=groupTracks();updateGlobePlaces();paintGlobe();renderAddresses();renderDetail();watchCovers();}
function renderAddresses(){let q=$('#search').value.toLowerCase();$('#addresses').innerHTML=[{name:'stadium',label:'♫ Le stade'},{name:'studio',label:'✳ Notre studio'},...items.filter(a=>!['luvbfk','maitrecorbeau'].includes(a.name.toLowerCase())).map(a=>({name:a.name,label:`${a.now?'● ':''}${a.name} · ${a.count}`}))].filter(a=>a.label.toLowerCase().includes(q)).map(a=>`<button class="${selected===a.name?'selected':''}" data-artist="${esc(a.name)}">${esc(a.label)}</button>`).join('')||'<p>Aucun artiste trouvé dans cette période.</p>';$('#addresses').querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.artist,true));}
function choose(name,recenter=false){selected=name;if(recenter)focusGlobe(name);else paintGlobe();renderAddresses();renderDetail();watchCovers();if(innerWidth<1000)document.querySelector("#detail").scrollIntoView({block:"nearest"});}
function watchCovers(){
  document.querySelectorAll(".album-cover img").forEach(img=>{
    const hideUnavailable=()=>{img.closest("figure").hidden=true;};
    img.addEventListener("error",hideUnavailable,{once:true});
    if(img.complete&&!img.naturalWidth)hideUnavailable();
  });
}
function renderDetail(){const el=$('#detail');if(selected==='stadium'){el.innerHTML=stadiumDetail();return;}if(selected==='studio'){const total=items.filter(a=>['luvbfk','maitrecorbeau'].includes(a.name.toLowerCase())).reduce((n,a)=>n+a.count,0);el.innerHTML=`<span class="badge">ADRESSE PERMANENTE</span><h2>Notre studio.</h2>${photoCard("LUVBFK",{color:"#79b6bd"})}${photoCard("maitrecorbeau",{color:"#bd6767"})}<p>Deux artistes, une régie commune. Le point de départ de ma ville musicale.</p><a class="studio-link" href="https://open.spotify.com/artist/7CjPQNkFoIlmPCPawTQtcn" target="_blank" rel="noopener">LUVBFK ↗<small> · Artiste que je produis</small></a><a class="studio-link" href="https://open.spotify.com/artist/6FqdkyYVCgDgUapvwBF2gv" target="_blank" rel="noopener">maitrecorbeau ↗<small> · Artiste que je produis</small></a><p>${total} écoute(s) dans la période affichée. Le studio reste présent même sans écoute.</p><p>Bleu grisé pour LUVBFK, rouge de scène pour maitrecorbeau : une palette inspirée de tes captures Spotify.</p>`;return;}
const item=items.find(a=>a.name===selected);if(!item){selected='studio';renderDetail();return;}const p=profile(item.name);const landmarkNote=/Paris|London|Londres|New York|Brooklyn/.test(p.city)?"Monument symbolique de la ville : interprétation scénographique, sans lien personnel supposé avec cet édifice. ":"";el.innerHTML=`${photoCard(item.name,p)}<span class="badge">${p.automatic?'PORTRAIT AUTOMATIQUE · À VÉRIFIER':p.source?'RÉFÉRENCES DOCUMENTÉES':'BÂTIMENT PROVISOIRE'}</span><h2>${esc(item.name)}</h2><span class="badge">${esc(p.city)}</span><span class="badge">${esc(p.genre)}</span><p><b>${item.count} écoute(s)</b>${item.now?' · En cours de lecture':''}</p><div class="eyebrow">POURQUOI CE BÂTIMENT ?</div><p>${esc(landmarkNote||p.story)}</p>${p.source?`<a class="source" href="${p.source}" target="_blank" rel="noopener">Voir la source biographique ↗</a>`:''}<div class="eyebrow">DERNIERS PASSAGES</div><ul class="tracks">${item.tracks.slice(0,6).map(t=>`<li>${esc(t.title)}<small>${t.nowPlaying?'● En cours':new Date(t.playedAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></li>`).join('')}</ul>`;}
async function load(){if(loading)return;loading=true;$('#refresh').disabled=true;try{const r=await fetch('/api/recent-tracks');if(!r.ok)throw Error();const next=await r.json();if(!Array.isArray(next.tracks))throw Error();data=next;queueArtists([...new Set(next.tracks.map(t=>t.artist)),"LUVBFK","maitrecorbeau"]);$('#status').textContent=next.message?(next.stale?'Dernières données conservées · ':'')+next.message:next.tracks.length?'Ton quartier est à jour. Les réponses Last.fm sont conservées 3 minutes.':'Aucune écoute pour le moment. Le studio est déjà ouvert.';$('#updated').textContent=next.updatedAt?'Dernière réception : '+new Date(next.updatedAt).toLocaleTimeString('fr-FR'):'En attente de premières écoutes';render();}catch{$('#status').textContent='Connexion au serveur indisponible. Le quartier déjà chargé reste visible.';render();}finally{loading=false;$('#refresh').disabled=false;}}
// Coordinates are latitude and longitude. Coastlines are intentionally simplified.
const continents = [
 [[71,-156],[69,-132],[73,-104],[69,-87],[60,-68],[48,-53],[44,-66],[30,-81],[25,-80],[29,-95],[20,-96],[9,-79],[10,-86],[21,-106],[31,-116],[48,-125],[58,-137],[60,-151]],
 [[12,-77],[10,-61],[4,-51],[-7,-35],[-23,-43],[-35,-54],[-55,-68],[-49,-75],[-25,-70],[-8,-80],[4,-79]],
 [[60,-50],[64,-62],[77,-73],[83,-35],[78,-19],[65,-41]],
 [[36,-10],[44,-9],[49,-5],[52,4],[59,5],[71,29],[67,55],[75,90],[72,130],[67,167],[58,165],[51,140],[43,132],[35,121],[22,113],[9,104],[2,103],[17,96],[22,88],[8,77],[22,68],[26,56],[13,45],[29,34],[39,29],[42,19],[36,15],[44,10],[43,5]],
 [[36,-6],[37,10],[31,32],[11,44],[10,51],[-12,41],[-34,26],[-35,18],[-21,12],[-4,8],[5,0],[6,-10],[15,-17],[27,-13]],
 [[-12,130],[-16,140],[-10,143],[-23,153],[-37,150],[-39,141],[-32,115],[-22,114]],
 [[50,-6],[51,1],[56,-2],[59,-5],[55,-7]], [[52,-11],[55,-8],[54,-6],[51,-8]],
 [[31,130],[35,136],[43,142],[41,145],[34,139]], [[-13,49],[-19,50],[-26,45],[-22,43]],
 [[-40,173],[-46,166],[-44,172],[-35,178]], [[-6,106],[-9,117],[-8,126],[-4,116],[1,107]],
 [[-71,-180],[-68,-120],[-73,-65],[-66,-15],[-70,45],[-66,100],[-71,160],[-71,180],[-89,180],[-89,-180]]
];
const locations = [
 [/fontenay|clamart|paris/i,48.86,2.35],[/london|londres/i,51.51,-.13],
 [/new york|brooklyn/i,40.71,-74],[/boston/i,42.36,-71.06],[/chicago/i,41.88,-87.63],
 [/vancouver/i,49.28,-123.12],[/los angeles|santa ana/i,34.05,-118.24],
 [/cape town|le cap/i,-33.92,18.42],[/accra/i,5.6,-.19],
 [/france/i,46.6,2.2],[/united states|états-unis|\busa\b/i,39,-98],
 [/united kingdom|royaume-uni/i,54,-3],[/canada/i,55,-105],
 [/south africa|afrique du sud/i,-29,25],[/ghana/i,7,-1]
];
const radians=Math.PI/180;
let globeLat=29, globeLon=-16, globeZoom=1, globePlaces=[];
function globeVector(lat,lon){
 const p=lat*radians,l=(lon-globeLon)*radians,c=globeLat*radians;
 const x=Math.cos(p)*Math.sin(l), y=Math.sin(p), z=Math.cos(p)*Math.cos(l);
 return [x,y*Math.cos(c)-z*Math.sin(c),y*Math.sin(c)+z*Math.cos(c)];
}
function drawCoast(outline,radius){
 const samples=[];
 outline.forEach(([lat,lon],i)=>{
   const [nextLat,nextLon]=outline[(i+1)%outline.length];
   const gap=nextLon-lon;
   const steps=Math.max(1,Math.ceil(Math.max(Math.abs(nextLat-lat),Math.abs(gap))/4));
   for(let j=0;j<steps;j++)samples.push(globeVector(lat+(nextLat-lat)*j/steps,lon+gap*j/steps));
 });
 const points=[];
 samples.forEach((p,i)=>{
   const q=samples[(i+1)%samples.length];
   if(p[2]>=0)points.push(p);
   if((p[2]>=0)!==(q[2]>=0)){
     const t=p[2]/(p[2]-q[2]);
     const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;
     points.push([x,y,0]);
   }
 });
 if(points.length<3)return '';
 return poly(points.map(([x,y])=>[500+x*radius,345-y*radius]),'url(#land)','stroke="#e7d5a4" stroke-width="1.3"');
}
const islandZones = [
 {lat:-12,lon:-146,rows:4,cols:5},
 {lat:-13,lon:64,rows:4,cols:5},
 {lat:32,lon:-167,rows:3,cols:5},
 {lat:-22,lon:-30,rows:4,cols:3}
];
const musicIsland=[15,-34];
function islandCoordinates(index,total){
 const zone=islandZones[index%islandZones.length];
 const slot=Math.floor(index/islandZones.length);
 const capacity=zone.rows*zone.cols;
 const overflow=Math.max(1,Math.ceil(Math.ceil(total/islandZones.length)/capacity));
 const columns=zone.cols*overflow;
 const row=Math.floor(slot/columns);
 const column=slot%columns;
 return [zone.lat-row*11,zone.lon+column*11/overflow];
}
function updateGlobePlaces(){
 const query=$('#search').value.toLowerCase();
 const groups=new Map();
 const unknown=[];
 for(const item of items){
   if(['luvbfk','maitrecorbeau'].includes(item.name.toLowerCase()))continue;
   const location=locations.find(([pattern])=>pattern.test(profile(item.name).city));
   if(!location){unknown.push(item);continue;}
   if(!item.name.toLowerCase().includes(query))continue;
   const coordinates=location.slice(1);
   const key=coordinates.join(',');
   if(!groups.has(key))groups.set(key,{coordinates,items:[]});
   groups.get(key).items.push(item);
 }
 globePlaces=[...groups.values()].flatMap(group=>group.items.map((item,index)=>({
   item,name:item.name,coordinates:group.coordinates,index,count:group.items.length
 })));
 unknown.sort((a,b)=>a.name.localeCompare(b.name));
 unknown.forEach((item,index)=>{
   if(item.name.toLowerCase().includes(query)){
     globePlaces.push({item,name:item.name,coordinates:islandCoordinates(index,unknown.length),islet:true});
   }
 });
 globePlaces.push({name:'studio',label:'Notre studio',coordinates:[17,-41]},
                  {name:'stadium',label:'Le stade',coordinates:[13,-27]});
}
function paintGlobe(){
 const radius=247*globeZoom;
 svg.setAttribute('viewBox','0 0 1000 690');
 const pieces=['<defs><radialGradient id="sea" cx="32%" cy="24%" r="78%"><stop stop-color="#abe4dc"/><stop offset=".67" stop-color="#53adbd"/><stop offset="1" stop-color="#267b95"/></radialGradient><linearGradient id="land" x2=".3" y2="1"><stop stop-color="#d1dfa0"/><stop offset="1" stop-color="#81ad78"/></linearGradient><clipPath id="sphere"><circle cx="500" cy="345" r="'+radius+'"/></clipPath></defs>',
 '<circle cx="500" cy="345" r="'+(radius+9)+'" fill="#d2e7dd"/><circle cx="500" cy="345" r="'+radius+'" fill="url(#sea)"/>'];
 pieces.push('<g clip-path="url(#sphere)">',...continents.map(continent=>drawCoast(continent,radius)));
 const islands=[{coordinates:musicIsland,width:43,height:23},...globePlaces.filter(p=>p.islet).map(p=>({...p,width:9,height:7}))];
 for(const {coordinates,width,height,islet} of islands){
   const [x,y,z]=globeVector(...coordinates);
   if(z>.16)pieces.push('<ellipse cx="'+(500+x*radius)+'" cy="'+(345-y*radius)+'" rx="'+(width*globeZoom)+'" ry="'+(height*globeZoom*z)+'" fill="'+(islet?'#f0dbad':'#dbca8e')+'"/>');
 }
 pieces.push('</g>');
 const visible=globePlaces.map(place=>{
   const [lat,lon]=place.coordinates;
   const angle=(place.index||0)*2.39996;
   const spread=place.count>1?Math.sqrt(place.index||0)*Math.max(3,8/globeZoom):0;
   return {...place,point:globeVector(lat+Math.cos(angle)*spread,lon+Math.sin(angle)*spread)};
 }).filter(p=>p.point[2]>.18).sort((a,b)=>a.point[2]-b.point[2]);
 const labelPositions=[];
 for(const place of visible){
   const [px,py,depth]=place.point,x=500+px*radius,y=345-py*radius;
   if(x<24||x>976||y<37||y>665)continue;
   const active=selected===place.name;
   const size=Math.min(place.item?.name ? .52 : .37,.26+.16*depth+.025*globeZoom);
   const art=place.item?building(place.item,0,0):place.name==='studio'?studio(0,0):stadium(0,0);
   const label=place.name==='stadium'?(liveTrack()?.artist||place.label):place.label||place.name;
   const showLabel=active||!labelPositions.some(([lx,ly])=>Math.abs(x-lx)<102&&Math.abs(y-ly)<24);
   if(showLabel)labelPositions.push([x,y]);
   pieces.push('<g class="globe-pin'+(active?' selected':'')+'" data-pin="'+esc(place.name)+'" role="button" tabindex="0" aria-label="'+esc(label+(place.islet?" · origine à localiser":""))+'"><ellipse cx="'+x+'" cy="'+y+'" rx="15" ry="7" fill="'+(active?'#ffe099':'#206b7044')+'"/><g transform="translate('+x+' '+y+') scale('+size+') translate(-700 -220)">'+art+'</g><circle cx="'+x+'" cy="'+(y-12)+'" r="21" fill="transparent"/>'+(showLabel?'<text class="globe-label" x="'+x+'" y="'+(y+17)+'" text-anchor="middle">'+esc(label)+'</text>':'')+'</g>');
 }
 svg.innerHTML=pieces.join('');
}
function focusGlobe(name){
 const place=globePlaces.find(pin=>pin.name===name);
 if(place){[globeLat,globeLon]=place.coordinates;if(place.islet)globeZoom=Math.max(1.25,globeZoom);paintGlobe();}
}
let globeDrag=null, dragged=false;
svg.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 globeDrag={x:event.clientX,y:event.clientY,lat:globeLat,lon:globeLon};dragged=false;
});
svg.addEventListener('pointermove',event=>{
 if(!globeDrag)return;
 const dx=event.clientX-globeDrag.x,dy=event.clientY-globeDrag.y;
 if(!dragged&&Math.hypot(dx,dy)<5)return;
 if(!dragged)svg.setPointerCapture(event.pointerId);
 dragged=true;
 const sensitivity=100/Math.max(svg.clientWidth,260)/globeZoom;
 globeLon=globeDrag.lon-dx*sensitivity*2;
 globeLat=Math.max(-85,Math.min(85,globeDrag.lat+dy*sensitivity*2));
 paintGlobe();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>{globeDrag=null;});
svg.addEventListener('click',event=>{
 const pin=event.target.closest('[data-pin]');
 if(pin&&!dragged)choose(pin.dataset.pin);
 dragged=false;
});
svg.addEventListener('keydown',event=>{
 const pin=event.target.closest('[data-pin]');
 if(pin&&['Enter',' '].includes(event.key)){event.preventDefault();choose(pin.dataset.pin);return;}
 const moves={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,12],ArrowDown:[0,-12]};
 if(!moves[event.key])return;
 event.preventDefault();const [lon,lat]=moves[event.key];
 globeLon+=lon;globeLat=Math.max(-85,Math.min(85,globeLat+lat));paintGlobe();
});
function zoomGlobe(factor){globeZoom=Math.max(1,Math.min(3.8,globeZoom*factor));paintGlobe();}

$('#zoomin').onclick=()=>zoomGlobe(1.25);
$('#zoomout').onclick=()=>zoomGlobe(.8);
$('#reset').onclick=()=>{globeLat=29;globeLon=-16;globeZoom=1;paintGlobe();};
$('#search').oninput=render;
$('#refresh').onclick=load;
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{
 period=b.dataset.period;
 document.querySelectorAll('[data-period]').forEach(x=>x.classList.toggle('active',x===b));
 render();
});
render();load();setInterval(load,180000);