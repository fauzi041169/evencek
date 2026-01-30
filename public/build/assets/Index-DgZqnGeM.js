import{u as B,r as d,j as e,H as C,L as u,a as w}from"./app-DlhcFPz8.js";import{W as _}from"./WebLayout-BSiGCO3_.js";import{f as $,i as I}from"./id-ByvqaVzQ.js";import"./useTranslation-Cmi5DbFV.js";import"./Alerts-BAW9rAdW.js";import"./circle-check-big-DWTwruHZ.js";import"./createLucideIcon-CnHGoBTl.js";import"./circle-alert-BtY9HCth.js";import"./x-FUZQ1ujn.js";import"./Modal-B6sYc4R6.js";import"./transition-C871oQkU.js";import"./open-closed-EryfF2Ee.js";import"./dialog-rfujmw61.js";import"./use-tab-direction-CSKwpV52.js";const N=({end:c,duration:g=2e3})=>{const[o,m]=d.useState(0),l=d.useRef(null);return d.useEffect(()=>{const i=new IntersectionObserver(h=>{if(h[0].isIntersecting){const p=parseInt(c,10);let s=null;const x=n=>{s||(s=n);const f=Math.min((n-s)/g,1);m(Math.floor(f*p)),f<1&&requestAnimationFrame(x)};requestAnimationFrame(x),i.disconnect()}},{threshold:.5});return l.current&&i.observe(l.current),()=>i.disconnect()},[c,g]),e.jsx("span",{ref:l,children:o})},k=({children:c,className:g="",direction:o="up"})=>{const m=d.useRef(null),[l,i]=d.useState(!1);d.useEffect(()=>{const p=new IntersectionObserver(([s])=>{s.isIntersecting&&(i(!0),p.disconnect())},{threshold:.1});return m.current&&p.observe(m.current),()=>p.disconnect()},[]);let h="reveal";return o==="left"&&(h="reveal-left"),o==="right"&&(h="reveal-right"),o==="pop"&&(h="reveal-pop"),e.jsx("div",{ref:m,className:`${h} ${l?"show":""} ${g}`,children:c})};function X({featuredNews:c,allNews:g,totalNews:o,categories:m,latestNews:l}){const i=l||g,{url:h,props:p}=B(),{appSettings:s}=p,x=s?.hero_animation_style||"circles",n=(t,a)=>{if(!t)return`rgba(124, 58, 237, ${a})`;let r;return/^#([A-Fa-f0-9]{3}){1,2}$/.test(t)?(r=t.substring(1).split(""),r.length==3&&(r=[r[0],r[0],r[1],r[1],r[2],r[2]]),r="0x"+r.join(""),"rgba("+[r>>16&255,r>>8&255,r&255].join(",")+","+a+")"):t},[f,M]=d.useState(new URLSearchParams(window.location.search).get("query")||""),[v,j]=d.useState(!1);d.useEffect(()=>{const t=localStorage.getItem("editMode")==="true";j(t);const a=()=>{const r=localStorage.getItem("editMode")==="true";j(r)};return window.addEventListener("editModeChanged",a),()=>window.removeEventListener("editModeChanged",a)},[]);const S=t=>{t.preventDefault(),w.get(route("news.search"),{query:f},{preserveState:!0})},b=t=>t?$(new Date(t),"d MMMM yyyy",{locale:I}):"-",y=t=>{if(!t)return"/assets/images/hero/defoult.webp";if(t.startsWith("http"))return t;let a=t.startsWith("/")?t.substring(1):t;return a.startsWith("storage/storage/")&&(a=a.substring(8)),a.startsWith("storage/")||a.startsWith("assets/")?"/"+a:`/storage/${a}`};return e.jsxs(_,{hasHeaderSpacer:!1,children:[e.jsx(C,{title:"Berita & Artikel"}),e.jsx("style",{children:`
                .reveal{opacity:0;transform:translateY(16px) scale(.98);transition:opacity .6s ease,transform .6s ease}
                .reveal.show{opacity:1;transform:translateY(0) scale(1)}
                .reveal-left{opacity:0;transform:translateX(-16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-left.show{opacity:1;transform:translateX(0)}
                .reveal-right{opacity:0;transform:translateX(16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-right.show{opacity:1;transform:translateX(0)}
                .reveal-pop{opacity:0;transform:translateY(18px) scale(.96);transition:opacity .6s ease,transform .6s ease}
                .reveal-pop.show{opacity:1;transform:translateY(0) scale(1)}
                .hero-gradient-overlay {
                    position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6));
                }
                .hero-gradient-overlay-top {
                    position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
                }
                
                /* Animations */
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 10s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                
                /* Rain Animation */
                .rain-line {
                    position: absolute;
                    width: 1px;
                    height: 100px;
                    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3));
                    animation: rain 1s linear infinite;
                }
                @keyframes rain {
                    0% { transform: translateY(-100px); }
                    100% { transform: translateY(100vh); }
                }
                
                /* Particles Animation */
                .particle-dot {
                    position: absolute;
                    background: white;
                    border-radius: 50%;
                    animation: particle 10s linear infinite;
                }
                @keyframes particle {
                    0% { transform: translateY(100vh) scale(0); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(-10vh) scale(1); opacity: 0; }
                }

                .hero-grow {
                    position: relative;
                    background-color: #1a1b3a; /* Deep Blue */
                    overflow: hidden;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }
                .curve-top-right {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 45%;
                    height: 180px;
                    background-color: white;
                    border-bottom-left-radius: 100%;
                    z-index: 1;
                }
                .yellow-shape-wrapper {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 45%;
                    height: 85%;
                    z-index: 10;
                }
                .yellow-shape {
                    width: 100%;
                    height: 100%;
                    background-color: #FFB800;
                    border-top-left-radius: 100px;
                    position: relative;
                }
                .image-container {
                    position: absolute;
                    top: 25px;
                    left: 25px;
                    right: 0;
                    bottom: 0;
                    background-color: #e5e7eb;
                    border-top-left-radius: 80px;
                    overflow: hidden;
                }
                @media (max-width: 1024px) {
                    .curve-top-right { display: none; }
                    .yellow-shape-wrapper {
                        position: relative;
                        width: 100%;
                        height: 400px;
                        margin-top: 2rem;
                        border-radius: 40px;
                        overflow: hidden;
                    }
                    .yellow-shape { border-radius: 40px; }
                    .image-container {
                        top: 15px; left: 15px; right: 15px; bottom: 15px;
                        width: auto; height: auto; border-radius: 30px;
                    }
                }
            `}),e.jsxs("div",{className:"relative",style:{fontFamily:"'Inter','Poppins','Montserrat',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'"},children:[e.jsxs("div",{className:"relative bg-slate-900 overflow-hidden min-h-[500px] flex items-center",children:[e.jsxs("div",{className:"absolute inset-0",children:[e.jsx("div",{className:"absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 z-10"}),e.jsx("img",{src:s?.hero_background_1?y(s.hero_background_1):"/assets/images/begron/bg-pattern.png",alt:"Background Pattern",className:"w-full h-full object-cover opacity-60 mix-blend-overlay",onError:t=>t.target.style.display="none"}),(x==="circles"||x==="blob"||!x)&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob z-10 pointer-events-none",style:{backgroundColor:n(s?.colors?.primary,.2)}}),e.jsx("div",{className:"absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000 z-10 pointer-events-none",style:{backgroundColor:n(s?.colors?.secondary,.2)}})]}),x==="rain"&&e.jsx("div",{className:"absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none",children:[...Array(30)].map((t,a)=>e.jsx("div",{className:"rain-line",style:{left:`${Math.random()*100}%`,animationDelay:`${Math.random()}s`,animationDuration:`${.5+Math.random()}s`,opacity:.3+Math.random()*.5}},a))}),x==="particles"&&e.jsx("div",{className:"absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none",children:[...Array(30)].map((t,a)=>e.jsx("div",{className:"particle-dot",style:{left:`${Math.random()*100}%`,width:`${2+Math.random()*4}px`,height:`${2+Math.random()*4}px`,animationDelay:`${Math.random()*5}s`,animationDuration:`${5+Math.random()*10}s`,opacity:.2+Math.random()*.6}},a))})]}),e.jsx("div",{className:"relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 py-12",children:e.jsxs("div",{className:"text-center max-w-3xl mx-auto",children:[e.jsx("h1",{className:"text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 drop-shadow-sm",children:"Berita & Artikel"}),e.jsx("p",{className:"text-xl text-slate-300 mb-10 leading-relaxed",children:"Informasi terbaru seputar kegiatan dan event terkini untuk Anda."}),e.jsxs("div",{className:"max-w-2xl mx-auto relative group",children:[e.jsx("div",{className:"absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity blur-md"}),e.jsxs("form",{onSubmit:S,className:"relative bg-white/10 backdrop-blur-md rounded-xl shadow-2xl flex items-center overflow-hidden border border-white/20 focus-within:border-white/40 transition-colors",children:[e.jsx("div",{className:"pl-6 text-indigo-300",children:e.jsx("i",{className:"fas fa-search text-lg"})}),e.jsx("input",{type:"text",className:"w-full px-4 py-4 outline-none text-white bg-transparent placeholder-slate-400 font-medium",placeholder:"Cari berita atau artikel...",value:f,onChange:t=>M(t.target.value)}),e.jsxs("button",{type:"submit",className:"px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all duration-300 flex items-center gap-2",children:[e.jsx("span",{children:"Cari"}),e.jsx("i",{className:"fas fa-arrow-right"})]})]})]})]})})]}),e.jsx("section",{className:"py-10 bg-white relative z-10 -mt-8 mx-4 sm:mx-8 rounded-3xl shadow-xl border border-gray-100 max-w-5xl lg:mx-auto",children:e.jsxs("div",{className:"flex flex-wrap justify-center items-center gap-8 sm:gap-16",children:[e.jsxs(k,{direction:"up",className:"flex items-center gap-4",children:[e.jsx("div",{className:"inline-flex items-center justify-center w-14 h-14 rounded-2xl text-secondary ring-1",style:{backgroundColor:n(s?.colors?.secondary,.05),"--tw-ring-color":n(s?.colors?.secondary,.1)},children:e.jsx("i",{className:"far fa-newspaper text-2xl"})}),e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-black text-gray-900",children:e.jsx(N,{end:o||0})}),e.jsx("div",{className:"text-sm font-semibold text-gray-500",children:"Total Berita"})]})]}),e.jsx("div",{className:"hidden sm:block w-px h-12 bg-gray-200"}),e.jsxs(k,{direction:"up",className:"flex items-center gap-4",delay:100,children:[e.jsx("div",{className:"inline-flex items-center justify-center w-14 h-14 rounded-2xl text-primary ring-1",style:{backgroundColor:n(s?.colors?.primary,.1),"--tw-ring-color":n(s?.colors?.primary,.2)},children:e.jsx("i",{className:"fas fa-tags text-2xl"})}),e.jsxs("div",{children:[e.jsx("div",{className:"text-3xl font-black text-gray-900",children:e.jsx(N,{end:m?m.length:0})}),e.jsx("div",{className:"text-sm font-semibold text-gray-500",children:"Kategori"})]})]})]})}),e.jsx("div",{className:"py-12 min-h-screen bg-gray-50",children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:[!l&&c&&c.length>0&&e.jsxs("div",{className:"mb-12",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-800 mb-6 border-l-4 border-secondary pl-3",children:"Berita Utama"}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8",children:c.map((t,a)=>e.jsxs("div",{className:`group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ${a===0?"col-span-2 md:col-span-2 md:row-span-2":""}`,children:[e.jsxs("div",{className:`relative ${a===0?"aspect-video md:h-96":"aspect-video md:h-48"}`,children:[e.jsx("img",{src:y(t.image),alt:t.title,className:"w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"}),e.jsx("div",{className:"absolute top-0 right-0 bg-secondary text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-bl-lg",children:t.category?.name||"Umum"}),e.jsxs("div",{className:"absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent hidden",children:[e.jsx("h3",{className:`font-bold text-white mb-1 ${a===0?"text-xl":"text-lg"} line-clamp-2`,children:t.title}),e.jsxs("div",{className:"text-white/80 text-xs flex items-center",children:[e.jsx("i",{className:"far fa-calendar-alt mr-2"}),b(t.published_at||t.created_at)]})]})]}),e.jsxs("div",{className:"p-6 hidden md:block",children:[e.jsxs("div",{className:"flex items-center text-sm text-gray-500 mb-2",children:[e.jsx("i",{className:"far fa-calendar-alt mr-2"}),b(t.published_at||t.created_at)]}),e.jsx(u,{href:route("news.show",t.slug),className:"block",children:e.jsx("h3",{className:`font-bold text-gray-900 mb-2 group-hover:text-secondary transition-colors ${a===0?"text-2xl":"text-lg"}`,children:t.title})}),e.jsx("p",{className:"text-gray-600 line-clamp-2 mb-4",children:t.excerpt||(t.content||"").replace(/<[^>]+>/g,"").substring(0,100)+"..."}),e.jsxs(u,{href:route("news.show",t.slug),className:"inline-flex items-center text-secondary font-semibold hover:text-primary",children:["Baca Selengkapnya",e.jsx("i",{className:"fas fa-arrow-right ml-2 text-xs"})]})]})]},t.id))})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between items-center mb-6",children:[e.jsx("h2",{className:"text-2xl font-bold text-gray-800 border-l-4 border-primary pl-3",children:l?"Hasil Pencarian":"Semua Berita"}),o&&e.jsxs("span",{className:"text-gray-500 text-sm",children:[o," Berita"]})]}),i.data.length>0?e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",children:i.data.map(t=>e.jsxs("div",{className:`bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full relative ${v?"border-2 border-warning ring-2 ring-warning ring-offset-2":""}`,children:[v&&e.jsxs("div",{className:"absolute top-2 right-2 sm:top-4 sm:right-4 z-30 flex space-x-1 sm:space-x-2",children:[e.jsx(u,{href:route("news.edit",t.slug||t.id),className:"w-8 h-8 flex items-center justify-center bg-warning text-white rounded-lg shadow-lg hover:bg-warning/90 hover:scale-110 transition-all duration-200",title:"Edit Berita",children:e.jsx("i",{className:"fas fa-edit text-xs sm:text-sm"})}),e.jsx("button",{onClick:a=>{a.preventDefault(),Swal.fire({title:"Apakah Anda yakin?",text:"Ingin menghapus berita ini?",icon:"warning",showCancelButton:!0,confirmButtonColor:"#d33",cancelButtonColor:"#3085d6",confirmButtonText:"Ya, Hapus!",cancelButtonText:"Batal"}).then(r=>{r.isConfirmed&&w.delete(route("news.destroy",t.id),{preserveScroll:!0})})},className:"w-8 h-8 flex items-center justify-center bg-danger text-white rounded-lg shadow-lg hover:bg-danger/90 hover:scale-110 transition-all duration-200",title:"Hapus Berita",children:e.jsx("i",{className:"fas fa-trash text-xs sm:text-sm"})})]}),e.jsxs("div",{className:"relative aspect-video md:h-48",children:[e.jsx("img",{src:y(t.image),alt:t.title,className:"w-full h-full object-cover"}),e.jsx("div",{className:"absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 hidden md:block",children:e.jsx("span",{className:"text-white text-xs bg-primary px-2 py-1 rounded inline-block",children:t.category?.name||"Umum"})}),e.jsx("div",{className:"absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[8px] text-white font-medium md:hidden",children:t.category?.name||"Berita"})]}),e.jsxs("div",{className:"p-5 flex-1 hidden md:flex flex-col",children:[e.jsxs("div",{className:"text-xs text-gray-500 mb-2 flex items-center",children:[e.jsx("i",{className:"far fa-clock mr-1"}),b(t.published_at||t.created_at)]}),e.jsx(u,{href:route("news.show",t.slug),className:"block mb-2",children:e.jsx("h3",{className:"text-lg font-bold text-gray-900 line-clamp-2 hover:text-primary transition-colors",children:t.title})}),e.jsx("p",{className:"text-gray-600 text-sm line-clamp-3 mb-4 flex-1",children:t.excerpt||(t.content||"").replace(/<[^>]+>/g,"").substring(0,80)+"..."}),e.jsx("div",{className:"pt-4 border-t border-gray-100 mt-auto",children:e.jsxs(u,{href:route("news.show",t.slug),className:"text-primary text-sm font-semibold hover:text-secondary flex items-center justify-between",children:["Baca Artikel",e.jsx("i",{className:"fas fa-chevron-right text-xs"})]})})]})]},t.id))}):e.jsxs("div",{className:"text-center py-12 bg-white rounded-xl shadow-sm",children:[e.jsx("i",{className:"far fa-newspaper text-5xl text-gray-300 mb-4"}),e.jsx("h3",{className:"text-xl font-medium text-gray-900",children:"Tidak ada berita ditemukan"}),e.jsx("p",{className:"text-gray-500 mt-2",children:"Coba kata kunci lain atau kembali nanti."})]}),i.links&&i.links.length>3&&e.jsx("div",{className:"mt-8 flex justify-center",children:e.jsx("div",{className:"flex flex-wrap gap-1",children:i.links.map((t,a)=>t.url?e.jsx(u,{href:t.url,className:`px-4 py-2 text-sm rounded-md transition-colors ${t.active?"bg-secondary text-white":"bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`,dangerouslySetInnerHTML:{__html:t.label},preserveState:!0},a):e.jsx("span",{className:"px-4 py-2 text-sm rounded-md transition-colors bg-white text-gray-400 border border-gray-200 cursor-not-allowed",dangerouslySetInnerHTML:{__html:t.label}},a))})})]})]})})]})]})}export{X as default};
