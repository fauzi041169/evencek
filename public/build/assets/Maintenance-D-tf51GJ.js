import{r as m,j as e,H as c}from"./app-i0Q6KGnk.js";function f({message:d,start_time:s,end_time:n}){m.useEffect(()=>{const a=setTimeout(()=>{window.location.reload()},3e4);return()=>clearTimeout(a)},[]);const r=a=>{if(!a)return null;const t=new Date(a);return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(t)},o=a=>{a.preventDefault();const t=a.currentTarget,i=t.querySelector("i");i&&(i.className="fas fa-spinner fa-spin");const l=t.querySelector("span");l?l.textContent="Memuat...":t.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i> Memuat...',t.disabled=!0,window.location.reload()};return e.jsxs("div",{className:"min-h-screen flex items-center justify-center font-sans relative overflow-hidden",style:{background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",fontFamily:"'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"},children:[e.jsx(c,{title:"Sistem Sedang Dalam Pemeliharaan"}),e.jsx("style",{children:`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .shimmer-bg::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    animation: shimmer 3s infinite;
                    z-index: 0;
                }
                .progress-bar-anim {
                    animation: progress 3s ease-in-out infinite;
                }
            `}),e.jsx("div",{className:"maintenance-container relative bg-white/95 backdrop-blur-md rounded-[20px] p-8 md:p-12 text-center shadow-2xl max-w-[600px] w-[90%] overflow-hidden shimmer-bg z-10",children:e.jsxs("div",{className:"maintenance-content relative z-10",children:[e.jsx("div",{className:"maintenance-icon text-5xl md:text-6xl text-[#667eea] mb-6 animate-pulse",children:e.jsx("i",{className:"fas fa-tools"})}),e.jsx("h1",{className:"text-3xl md:text-[2.5rem] font-bold text-[#2d3748] mb-4 leading-tight",children:"Sistem Sedang Dalam Pemeliharaan"}),e.jsx("p",{className:"text-base md:text-[1.2rem] text-[#4a5568] leading-relaxed mb-8",children:d||"Kami sedang melakukan pemeliharaan sistem untuk meningkatkan layanan kami. Silakan coba lagi dalam beberapa saat."}),e.jsxs("div",{className:"flex flex-col md:flex-row gap-4 justify-center mb-8",children:[s&&e.jsxs("div",{className:"bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 px-6 rounded-[15px] shadow-md",children:[e.jsx("i",{className:"fas fa-clock mr-2"}),e.jsx("strong",{children:"Mulai:"})," ",e.jsx("br",{className:"md:hidden"})," ",r(s)]}),n&&e.jsxs("div",{className:"bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 px-6 rounded-[15px] shadow-md",children:[e.jsx("i",{className:"fas fa-calendar-check mr-2"}),e.jsx("strong",{children:"Estimasi Selesai:"})," ",e.jsx("br",{className:"md:hidden"})," ",r(n)]})]}),e.jsx("div",{className:"bg-[#e2e8f0] rounded-[10px] h-2 my-8 overflow-hidden w-full",children:e.jsx("div",{className:"h-full rounded-[10px] bg-gradient-to-r from-[#667eea] to-[#764ba2] progress-bar-anim"})}),e.jsxs("button",{onClick:o,className:"inline-flex items-center gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-0 py-3 px-[30px] rounded-[25px] text-[1.1rem] font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#667eea]/30",children:[e.jsx("i",{className:"fas fa-sync-alt"}),e.jsx("span",{children:"Coba Lagi"})]}),e.jsxs("div",{className:"mt-8 p-4 bg-[#667eea]/10 rounded-[10px] border-l-4 border-[#667eea] text-left",children:[e.jsxs("h5",{className:"text-[#2d3748] font-bold mb-2 flex items-center gap-2",children:[e.jsx("i",{className:"fas fa-info-circle"})," Butuh Bantuan?"]}),e.jsx("p",{className:"text-[#4a5568] m-0 text-sm md:text-base",children:"Jika Anda memerlukan bantuan mendesak, silakan hubungi tim support kami."})]})]})})]})}export{f as default};
