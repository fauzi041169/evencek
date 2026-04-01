import{j as e}from"./chart-CEhV2Zup.js";import{u as b,H as v}from"./react-Dh84CiOy.js";import{W as k}from"./WebLayout-DKXmF5CG.js";import"./vendor-B25ZRT9d.js";import"./useTranslation-BpRfQOLf.js";import"./app-Ils50O4Q.js";import"./sweetalert2-BQxta0Da.js";import"./Alerts-Dt3ekfzy.js";import"./circle-check-big-DJC00RVG.js";import"./createLucideIcon-D7mOLwbC.js";import"./circle-alert-j_9hqDBz.js";import"./x-DAVjNUCl.js";import"./Modal-BeyVcRfr.js";import"./transition-Dr2z2X7b.js";import"./open-closed-BmvOWMFT.js";import"./dialog-h41hFrm9.js";import"./use-tab-direction-CLFGo2VZ.js";import"./FloatingAI-xvj8p7oh.js";import"./user-Cdhw-Hru.js";import"./loader-circle-DCg3amcm.js";function w({title:d,description:i,heroAnim:x,shape:t="waves",children:n}){const{appSettings:h}=b().props,s=x||h?.hero_animation_style||"circles",l=h?.hero_background_1||null,f=r=>r?r.startsWith("http")?r:`/storage/${r}`:null;return e.jsxs("section",{className:"page-hero relative overflow-hidden",children:[e.jsx("style",{children:`
                .page-hero {
                    position: relative;
                    min-height: 450px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    padding-bottom: 80px;
                }

                @media (max-width: 640px) {
                    .page-hero {
                        min-height: 80px;
                        padding-bottom: 2px;
                    }
                }
                
                .hero-gradient-bg {
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%) !important;
                    z-index: 1 !important;
                }

                .hero-dots-pattern {
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.15) 1px, transparent 1px) !important;
                    background-size: 20px 20px !important;
                    z-index: 2 !important;
                    opacity: 0.6 !important;
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

                .hero-circle {
                    position: absolute !important;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1) !important;
                    animation: heroFloat 6s ease-in-out infinite;
                    z-index: 2 !important;
                }

                .hero-circle-1 {
                    width: 300px;
                    height: 300px;
                    top: -100px;
                    left: -100px;
                    background: rgba(255, 255, 255, 0.08) !important;
                    animation-delay: 0s;
                }

                .hero-circle-2 {
                    width: 200px;
                    height: 200px;
                    top: 50%;
                    left: 20%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 255, 255, 0.06) !important;
                    animation-delay: 2s;
                }

                .hero-circle-3 {
                    width: 350px;
                    height: 350px;
                    top: -50px;
                    right: -150px;
                    background: rgba(255, 255, 255, 0.1) !important;
                    animation-delay: 4s;
                }

                @keyframes heroFloat {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }

                .hero-waves-container {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    overflow: hidden;
                    line-height: 0;
                    transform: rotate(180deg);
                    z-index: 3;
                }

                .hero-waves-svg {
                    position: relative;
                    display: block;
                    width: calc(100% + 1.3px);
                    height: 80px;
                }

                @media (min-width: 768px) {
                    .hero-waves-svg {
                        height: 120px;
                    }
                }

                .hero-waves-path {
                    fill: #ffffff;
                }
                
                /* Compatibility with gray backgrounds */
                :global(body.bg-gray-50) .hero-waves-path {
                    fill: #f9fafb;
                }
            `}),e.jsx("div",{className:"hero-gradient-bg"}),l&&e.jsx("div",{className:"absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay z-[1]",style:{backgroundImage:`url('${f(l)}')`}}),s!=="clean"&&!l&&e.jsx("div",{className:"hero-dots-pattern pointer-events-none absolute inset-0 z-0"}),(s==="circles"||s==="blob")&&e.jsxs("div",{className:"hero-circles absolute inset-0 pointer-events-none",children:[e.jsx("div",{className:"hero-circle hero-circle-1"}),e.jsx("div",{className:"hero-circle hero-circle-2"}),e.jsx("div",{className:"hero-circle hero-circle-3"})]}),s==="rain"&&e.jsx("div",{className:"absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none",children:[...Array(30)].map((r,a)=>e.jsx("div",{className:"rain-line",style:{left:`${Math.random()*100}%`,animationDelay:`${Math.random()}s`,animationDuration:`${.5+Math.random()}s`,opacity:.3+Math.random()*.5}},a))}),s==="particles"&&e.jsx("div",{className:"absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none",children:[...Array(30)].map((r,a)=>e.jsx("div",{className:"particle-dot",style:{left:`${Math.random()*100}%`,width:`${2+Math.random()*4}px`,height:`${2+Math.random()*4}px`,animationDelay:`${Math.random()*5}s`,animationDuration:`${5+Math.random()*10}s`,opacity:.2+Math.random()*.6}},a))}),e.jsxs("div",{className:"relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-12 md:py-24 text-center",children:[e.jsx("h1",{className:"text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]",children:d}),i&&e.jsx("p",{className:"text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)] mb-8",children:i}),n]}),t==="waves"&&e.jsx("div",{className:"hero-waves-container",children:e.jsx("svg",{className:"hero-waves-svg","data-name":"Layer 1",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 1200 120",preserveAspectRatio:"none",children:e.jsx("path",{d:"M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z",className:"hero-waves-path"})})}),t==="slant"&&e.jsx("div",{className:"absolute bottom-0 left-0 right-0 h-24 bg-white",style:{clipPath:"polygon(0 100%, 100% 0, 100% 100%)",zIndex:3}}),t==="curve"&&e.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-[60px] bg-white rounded-t-[50%_100%] z-[3]"})]})}function E({plans:d,activePlanIds:i,heroAnim:x,midtransStatus:t}){const{flash:n,errors:h,csrf_token:s}=b().props,l=a=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0,maximumFractionDigits:0}).format(a).replace("IDR","Rp"),r=(()=>{if(s)return s;const a=document.querySelector('meta[name="csrf-token"]');return a?a.getAttribute("content"):""})();return e.jsxs(k,{hasHeaderSpacer:!1,transparentNavbar:!0,fluid:!0,noPadding:!0,children:[e.jsx(v,{children:e.jsx("title",{children:"Paket Berlangganan"})}),e.jsx(w,{title:"Paket Berlangganan",description:"Pilih paket yang sesuai dengan kebutuhan sistem manajemen inventaris Anda",heroAnim:x}),e.jsx("section",{className:"py-0 sm:py-8 px-2 sm:px-6 lg:px-8 bg-gray-50",children:e.jsxs("div",{className:"max-w-7xl mx-auto",children:[(n?.error||n?.success===!1)&&e.jsx("div",{className:"mb-8 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 shadow-sm",children:e.jsxs("div",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-exclamation-triangle text-red-600 mr-3 mt-1"}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-red-800 font-semibold mb-1",children:"Terjadi kesalahan saat membuat token pembayaran"}),e.jsx("p",{className:"text-red-700",children:n.error}),e.jsxs("div",{className:"mt-3 text-sm text-red-800",children:[e.jsx("p",{className:"mb-1",children:"Petunjuk cepat:"}),e.jsxs("ul",{className:"list-disc ml-5",children:[e.jsx("li",{children:"Periksa konfigurasi kunci server dan client pembayaran di file `.env`"}),e.jsx("li",{children:"Pastikan mode lingkungan sesuai: sandbox=`false`, production=`true`"}),e.jsx("li",{children:"Setelah mengubah `.env`, jalankan `php artisan config:clear` dan `php artisan cache:clear`"})]}),t&&e.jsxs("div",{className:"mt-2",children:[e.jsxs("span",{className:"inline-block bg-white border border-red-200 rounded px-2 py-1",children:["Env: ",t.isProduction?"Production":"Sandbox"]}),e.jsxs("span",{className:"inline-block bg-white border border-red-200 rounded px-2 py-1 ml-2",children:["Client key set: ",t.clientKeySet?"Ya":"Tidak"]}),e.jsxs("span",{className:"inline-block bg-white border border-red-200 rounded px-2 py-1 ml-2",children:["Server key set: ",t.serverKeySet?"Ya":"Tidak"]})]})]})]})]})}),e.jsxs("div",{className:"text-center mb-4 sm:mb-8",children:[e.jsx("h2",{className:"text-3xl md:text-4xl font-bold text-gray-900 mb-4",children:"Pilih Paket Terbaik Untuk Anda"}),e.jsx("p",{className:"text-lg text-gray-600 max-w-2xl mx-auto",children:"Semua paket dilengkapi dengan fitur lengkap untuk manajemen kegiatan, berita, dan sistem manajemen acara dengan dukungan profesional 24/7"}),e.jsx("div",{className:"mt-4 h-1 w-24 bg-primary rounded mx-auto"})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-10",children:d.map((a,y)=>{const p=a.slug==="pro",j=a.slug==="basic";let g="from-orange-500 to-orange-600",m="bg-orange-600 hover:bg-orange-700";j?(g="from-blue-500 to-secondary",m="bg-secondary hover:bg-blue-700"):p&&(g="from-purple-500 to-purple-600",m="bg-primary hover:bg-purple-700");const u=a.features&&typeof a.features=="object"?a.features.manual_activities_limit:null,N=i&&i.includes(a.id);return e.jsxs("div",{className:`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${p?"border-4 border-purple-500 relative":""}`,"data-aos":"fade-up","data-aos-delay":(y+1)*100,children:[p&&e.jsx("div",{className:"absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold",children:"Paling Populer"}),e.jsxs("div",{className:`bg-gradient-to-br ${g} p-4 sm:p-6 text-center`,children:[e.jsx("h3",{className:"text-2xl font-bold text-white mb-2",children:a.name}),e.jsxs("div",{className:"mt-4",children:[e.jsx("span",{className:"text-4xl font-bold text-white",children:a.formatted_price||l(a.price)}),e.jsx("span",{className:"text-white opacity-90",children:"/bulan"})]}),a.trial_days>0&&e.jsx("div",{className:"mt-2",children:e.jsxs("span",{className:"text-sm text-white opacity-90",children:["Trial ",a.trial_days," hari gratis"]})})]}),e.jsxs("div",{className:"p-3 sm:p-8",children:[e.jsxs("ul",{className:"space-y-4 mb-6 sm:mb-8",children:[e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.max_activities?`Manajemen kegiatan hingga ${new Intl.NumberFormat().format(a.max_activities)} aktivitas`:"Manajemen kegiatan unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.max_users?`Hingga ${new Intl.NumberFormat().format(a.max_users)} pengguna aktif`:"Pengguna unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.max_news?`Manajemen berita hingga ${new Intl.NumberFormat().format(a.max_news)} artikel`:"Manajemen berita unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.max_participants_per_activity?`Maksimal ${new Intl.NumberFormat().format(a.max_participants_per_activity)} peserta per acara`:"Peserta per acara unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:u!=null?`Jumlah aktivitas manual berbayar hingga ${new Intl.NumberFormat().format(parseInt(u))}`:"Jumlah aktivitas manual berbayar unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.max_committees_per_activity?`Maksimal ${new Intl.NumberFormat().format(a.max_committees_per_activity)} panitia per acara`:"Panitia per acara unlimited"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.has_analytics?"Dashboard acara lengkap":"Laporan dasar kegiatan"})]}),e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:a.has_priority_support?"Dukungan prioritas (respons 4 jam)":"Dukungan email (respons 24 jam)"})]}),a.has_api_access&&e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:"API access & integrasi custom"})]}),a.has_white_label&&e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:"Kustomisasi & white-label"})]}),a.features&&Array.isArray(a.features)&&a.features.map((o,c)=>c==="manual_activities_limit"||o===null?null:e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:o})]},c)),a.features&&!Array.isArray(a.features)&&Object.entries(a.features).map(([o,c],_)=>o==="manual_activities_limit"?null:e.jsxs("li",{className:"flex items-start",children:[e.jsx("i",{className:"fas fa-check-circle text-green-500 mr-3 mt-1"}),e.jsx("span",{className:"text-gray-700",children:c})]},o))]}),b().props.auth?.user?N?e.jsx("a",{href:route("subscriptions.manage"),className:"block w-full bg-gray-600 hover:bg-gray-700 text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200",children:"Paket Aktif"}):e.jsxs("form",{action:route("subscriptions.subscribe",a.slug),method:"POST",children:[e.jsx("input",{type:"hidden",name:"_token",value:r}),e.jsx("button",{type:"submit",className:`block w-full ${m} text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200`,children:j?"Mulai Sekarang":"Upgrade Sekarang"})]}):e.jsx("a",{href:route("auth.register"),className:`block w-full ${m} text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200`,children:"Mulai Sekarang"})]})]},a.id)})})]})}),e.jsx("section",{className:"py-2 sm:py-8 px-4 sm:px-6 lg:px-8 bg-white",children:e.jsxs("div",{className:"max-w-7xl mx-auto",children:[e.jsxs("div",{className:"text-center mb-4 sm:mb-8",children:[e.jsx("h2",{className:"text-3xl md:text-4xl font-bold text-gray-900 mb-4",children:"Keuntungan Berlangganan"}),e.jsx("p",{className:"text-lg text-gray-600 max-w-2xl mx-auto",children:"Nikmati berbagai keuntungan eksklusif dengan menjadi pelanggan kami"}),e.jsx("div",{className:"mt-4 h-1 w-24 bg-primary rounded mx-auto"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8",children:[e.jsxs("div",{className:"bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up",children:[e.jsx("div",{className:"bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-cloud text-secondary text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Akses Cloud 24/7"}),e.jsx("p",{className:"text-gray-600",children:"Akses data inventaris Anda kapan saja, di mana saja dengan sistem cloud yang handal dan terpercaya."})]}),e.jsxs("div",{className:"bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up","data-aos-delay":"100",children:[e.jsx("div",{className:"bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-sync-alt text-green-600 text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Update Otomatis"}),e.jsx("p",{className:"text-gray-600",children:"Dapatkan fitur terbaru dan peningkatan sistem secara otomatis tanpa biaya tambahan."})]}),e.jsxs("div",{className:"bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up","data-aos-delay":"200",children:[e.jsx("div",{className:"bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-shield-alt text-primary text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Keamanan Terjamin"}),e.jsx("p",{className:"text-gray-600",children:"Data Anda dilindungi dengan enkripsi tingkat enterprise dan backup berkala yang aman."})]}),e.jsxs("div",{className:"bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up","data-aos-delay":"300",children:[e.jsx("div",{className:"bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-headset text-yellow-600 text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Dukungan Profesional"}),e.jsx("p",{className:"text-gray-600",children:"Tim support berpengalaman siap membantu Anda dengan respons cepat dan solusi tepat sasaran."})]}),e.jsxs("div",{className:"bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up","data-aos-delay":"400",children:[e.jsx("div",{className:"bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-chart-line text-primary text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Analitik & Laporan"}),e.jsx("p",{className:"text-gray-600",children:"Pantau performa kegiatan dan inventaris dengan dashboard analitik yang komprehensif."})]}),e.jsxs("div",{className:"bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300","data-aos":"fade-up","data-aos-delay":"500",children:[e.jsx("div",{className:"bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mb-4",children:e.jsx("i",{className:"fas fa-mobile-alt text-red-600 text-2xl"})}),e.jsx("h3",{className:"text-xl font-bold text-gray-900 mb-3",children:"Mobile Friendly"}),e.jsx("p",{className:"text-gray-600",children:"Akses sistem dengan nyaman melalui perangkat mobile Anda dengan tampilan yang responsif."})]})]})]})})]})}export{E as default};
