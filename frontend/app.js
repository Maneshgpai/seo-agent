"use strict";(()=>{var v={RECAPTCHA_SITE_KEY:typeof window<"u"&&window.__ENV__?.RECAPTCHA_SITE_KEY||"",ENABLE_RECAPTCHA:(typeof window<"u"&&window.__ENV__?.ENABLE_RECAPTCHA)===!0,API_ENDPOINT:"/api/analyze",API_STREAM_ENDPOINT:"/api/analyze/stream",USE_STREAMING:!0},I=document.getElementById("seo-form"),B=document.getElementById("url"),O=document.getElementById("submit-btn"),F=O.querySelector(".btn-text"),q=O.querySelector(".btn-loader"),x=document.getElementById("thinking-panel"),S=document.getElementById("thinking-content"),b=document.getElementById("results-section"),U=document.getElementById("results-summary"),L=document.getElementById("overall-score"),H=document.querySelectorAll(".toggle-btn"),D=document.getElementById("mode"),V=document.querySelector(".site-options"),C=document.getElementById("download-pdf"),Y=document.getElementById("download-json"),J=document.getElementById("download-text"),W=document.getElementById("new-analysis"),k=document.getElementById("minimize-thinking"),y=document.getElementById("url-error"),m=null,g=null,T="",c=[];function G(){I.addEventListener("submit",X),H.forEach(e=>{e.addEventListener("click",()=>K(e))}),C.addEventListener("click",()=>P("pdf")),Y.addEventListener("click",()=>P("json")),J.addEventListener("click",()=>P("text")),W.addEventListener("click",oe),k.addEventListener("click",ce),B&&B.addEventListener("input",$),document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",t=>{t.preventDefault();let n=e.getAttribute("href");if(!n)return;let s=document.querySelector(n);if(s){let r=s.getBoundingClientRect().top+window.pageYOffset,i=parseInt(getComputedStyle(document.documentElement).scrollPaddingTop||"0")||16,o=r-i;window.scrollTo({top:o,behavior:"smooth"})}})})}function K(e){H.forEach(n=>n.classList.remove("active")),e.classList.add("active");let t=e.dataset.mode;D.value=t,V.style.display=t==="site"?"block":"none"}async function X(e){e.preventDefault();let t=new FormData(I),n=t.get("url"),r=(document.querySelector(".toggle-btn.active")?.getAttribute("data-mode")||t.get("mode")||"single").trim().toLowerCase()==="site"?"site":"single",i=parseInt(String(t.get("maxPages")),10),o=Math.min(Math.max(Number.isNaN(i)?50:i,1),500),l=me(n);if(!l.isValid){ge(l.error??"Please enter a valid website URL");return}$();let a=l.normalizedUrl??n,p="";if(v.ENABLE_RECAPTCHA)try{p=await Q()}catch{R("reCAPTCHA verification failed. Please try again.");return}await Z({url:a,mode:r,maxPages:r==="site"?o:void 0},p)}function Q(){return new Promise((e,t)=>{if(!v.RECAPTCHA_SITE_KEY){t(new Error("reCAPTCHA site key not configured"));return}if(typeof grecaptcha>"u"){t(new Error("reCAPTCHA not loaded"));return}grecaptcha.ready(()=>{grecaptcha.execute(v.RECAPTCHA_SITE_KEY,{action:"analyze"}).then(e).catch(t)})})}async function Z(e,t){N(!0),le(),z(),ee(e);try{if(v.USE_STREAMING){let n=await se(e);m=n.report,g=n.siteReport,_(n.report,n.siteReport)}else{let n=await ie(e,t);m=n.report,g=n.siteReport,_(n.report,n.siteReport)}}catch(n){let s=n.message||"Analysis failed. Please try again.";te("error","Analysis failed",s,"error"),R(s)}finally{N(!1)}}function ee(e){c=[{id:"validate",title:"Validating URL",status:"pending"},{id:"crawl",title:e.mode==="site"?"Crawling website":"Loading page",status:"pending"},{id:"basic",title:"Running basic SEO checks",status:"pending"},{id:"intermediate",title:"Running intermediate checks",status:"pending"},{id:"advanced",title:"Running advanced checks",status:"pending"},{id:"pagespeed",title:"Fetching PageSpeed Insights",status:"pending"},{id:"report",title:"Generating report",status:"pending"}],A()}function te(e,t,n,s){let r=c.findIndex(i=>i.id===e);r>=0?c[r]={id:e,title:t,detail:n,status:s}:c.push({id:e,title:t,detail:n,status:s}),A()}function A(){S.innerHTML=c.map(t=>`
    <div class="thinking-step" data-step-id="${t.id}">
      <div class="step-icon ${t.status}">${ne(t.status)}</div>
      <div class="step-content">
        <div class="step-title">${t.title}</div>
        ${t.detail?`<div class="step-detail">${t.detail}</div>`:""}
      </div>
    </div>
  `).join("");let e=x.querySelector(".thinking-title");if(e){let t=c.find(s=>s.status==="running"),n=[...c].reverse().find(s=>s.status!=="pending");e.textContent=t?.title??n?.title??c[0]?.title??"AI Agent Thinking"}S.scrollTop=S.scrollHeight}function ne(e){switch(e){case"pending":return"\u25CB";case"running":return"\u25D0";case"done":return"\u2713";case"error":return"\u2717";case"warning":return"\u26A0";case"skipped":return"\u2212";default:return"\u25CB"}}function w(e,t,n){let s=c.find(r=>r.id===e);s&&(s.status=t,n!==void 0&&(s.detail=n),A())}async function se(e){return new Promise((t,n)=>{let s=!1,r=e.mode==="site"?"site":"single",i=new URLSearchParams;i.set("url",e.url),i.set("depth","all"),i.set("mode",r),r==="site"&&e.maxPages!=null&&i.set("maxPages",String(e.maxPages));let o=new EventSource(`${v.API_STREAM_ENDPOINT}?${i.toString()}`);o.addEventListener("step",l=>{let a=JSON.parse(l.data);w(a.id,a.status,a.detail||a.title)}),o.addEventListener("complete",l=>{let a=JSON.parse(l.data);T=a.textReport||"",s=!0,o.close(),t({report:a.report??null,siteReport:a.siteReport??null})}),o.addEventListener("error",l=>{if(o.close(),!s)if(l instanceof MessageEvent&&typeof l.data=="string"&&l.data)try{let a=JSON.parse(l.data);n(new Error(a.message||"Analysis failed"))}catch{n(new Error("Connection to server lost"))}else n(new Error("Connection to server lost"))}),setTimeout(()=>{o.readyState!==EventSource.CLOSED&&(o.close(),n(new Error("Analysis timed out. Please try again.")))},18e4)})}async function ie(e,t){(async()=>{w("validate","running"),await pe(300),w("validate","done"),w("crawl","running")})();let s={url:e.url,depth:"all",recaptchaToken:t,mode:e.mode||"single"};e.mode==="site"&&e.maxPages!=null&&(s.maxPages=e.maxPages);let r=await fetch(v.API_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)}),i=await r.json();if(!r.ok||!i.success)throw new Error(i.error||"Analysis failed");return c.forEach(o=>{o.status="done"}),A(),T=i.textReport||"",{report:i.report??null,siteReport:i.siteReport??null}}function _(e,t){let n=t!=null&&t.pageAnalyses?.length>0,s=n?t.scores.averagePageScore:e?.scores.overall??0,r=L.querySelector(".score-value");if(r.textContent=String(s),L.style.background=re(s),L.style.color="#fff",n){let o=t.pageAnalyses.reduce((d,u)=>d+u.issues.length,0),l=t.pageAnalyses.reduce((d,u)=>d+u.criticalCount,0),a=t.pageAnalyses.reduce((d,u)=>d+u.warningCount,0),p=t.pageAnalyses.reduce((d,u)=>d+u.issues.filter(h=>h.status==="pass").length,0);U.innerHTML=`
      <div class="summary-card">
        <div class="value">${t.pageAnalyses.length}</div>
        <div class="label">Pages Analyzed</div>
      </div>
      <div class="summary-card passed">
        <div class="value">${p}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="value">${l}</div>
        <div class="label">Critical</div>
      </div>
      <div class="summary-card warnings">
        <div class="value">${a}</div>
        <div class="label">Warnings</div>
      </div>
    `}else e&&(U.innerHTML=`
      <div class="summary-card">
        <div class="value">${e.summary.totalChecks}</div>
        <div class="label">Total Checks</div>
      </div>
      <div class="summary-card passed">
        <div class="value">${e.summary.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="value">${e.summary.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card warnings">
        <div class="value">${e.summary.warnings}</div>
        <div class="label">Warnings</div>
      </div>
    `);let i=b.querySelector(".results-header h3");i&&(i.textContent=n?`Analysis Complete \u2014 Site (${t.pageAnalyses.length} pages)`:"Analysis Complete"),b.style.display="block",b.scrollIntoView({behavior:"smooth",block:"start"})}function re(e){return e>=90?"linear-gradient(135deg, #10b981 0%, #059669 100%)":e>=70?"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)":e>=50?"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)":"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}async function P(e){let t=m!=null,n=g!=null&&g.baseUrl!=null&&Array.isArray(g.pageAnalyses);if(!t&&!n)return;if(e==="pdf"){try{C.disabled=!0;let d=await fetch("/api/report/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n?{siteReport:g}:{report:m})});if(!d.ok){let M=await d.json().catch(()=>({}));throw new Error(M.message||M.error||"PDF download failed")}let u=await d.blob(),h=URL.createObjectURL(u),E=document.createElement("a");E.href=h,E.download=n?`seo-site-report-${f()}.pdf`:`seo-report-${f()}.pdf`,document.body.appendChild(E),E.click(),document.body.removeChild(E),URL.revokeObjectURL(h)}catch(p){R(p.message)}finally{C.disabled=!1}return}let s,r,i;e==="json"?(s=JSON.stringify(n?g:m,null,2),r=n?`seo-site-report-${f()}.json`:`seo-report-${f()}.json`,i="application/json"):(s=T||(m?ae(m):""),r=n?`seo-site-report-${f()}.txt`:`seo-report-${f()}.txt`,i="text/plain");let o=new Blob([s],{type:i}),l=URL.createObjectURL(o),a=document.createElement("a");a.href=l,a.download=r,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(l)}function ae(e){let t=["\u2550".repeat(70),"                        SEO ANALYSIS REPORT","\u2550".repeat(70),"",`URL: ${e.url}`,`Analyzed: ${new Date(e.analyzedAt).toLocaleString()}`,"","\u2500".repeat(70),"                           SCORES","\u2500".repeat(70),"",`  Overall:      ${e.scores.overall}/100`,`  Basic:        ${e.scores.basic}/100`,`  Intermediate: ${e.scores.intermediate}/100`,`  Advanced:     ${e.scores.advanced}/100`,"","\u2500".repeat(70),"                          SUMMARY","\u2500".repeat(70),"",`  Total Checks: ${e.summary.totalChecks}`,`  Passed:       ${e.summary.passed}`,`  Failed:       ${e.summary.failed}`,`  Warnings:     ${e.summary.warnings}`,""];if(e.pageSpeed){t.push("\u2500".repeat(70),"                     CORE WEB VITALS","\u2500".repeat(70),"");let n=e.pageSpeed.coreWebVitals;for(let[r,i]of Object.entries(n))if(i){let o=i.rating==="good"?"\u2713":i.rating==="needs-improvement"?"\u26A0":"\u2717";t.push(`  ${r.toUpperCase()}: ${o} ${i.displayValue}`)}t.push("","\u2500".repeat(70),"                    LIGHTHOUSE SCORES","\u2500".repeat(70),"");let s=e.pageSpeed.lighthouseScores;for(let[r,i]of Object.entries(s))i!==null&&t.push(`  ${r}: ${i}/100`);t.push("")}return t.push("\u2550".repeat(70),"                  End of SEO Analysis Report","\u2550".repeat(70)),t.join(`
`)}function f(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function oe(){I.reset(),$(),z(),de(),m=null,g=null,T="",c=[],H.forEach(e=>{e.classList.toggle("active",e.dataset.mode==="single")}),D.value="single",V.style.display="none",document.getElementById("analyze")?.scrollIntoView({behavior:"smooth"})}function N(e){O.disabled=e,F.style.display=e?"none":"inline",q.style.display=e?"flex":"none"}function le(){x.style.display="block"}function de(){x.style.display="none"}function ce(){let e=S,t=e.style.display==="none";e.style.display=t?"block":"none";let n=k.querySelector(".thinking-chevron");n&&(n.textContent=t?"\u25BC":"\u25B2"),k.setAttribute("aria-expanded",String(t))}function z(){b.style.display="none"}function R(e){let t=document.createElement("div");t.className="toast-error",t.innerHTML=`
    <span class="toast-icon">\u2717</span>
    <span class="toast-message">${e}</span>
  `,t.style.cssText=`
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #ef4444;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOut 0.3s ease",setTimeout(()=>t.remove(),300)},5e3)}function ue(e){let t=e.trim();return!t||/^https?:\/\//i.test(t)?t:`https://${t}`}function me(e){let t=(e??"").trim();if(!t)return{isValid:!1,error:"Please enter a website URL"};try{let n=new URL(t);return n.protocol!=="http:"&&n.protocol!=="https:"?{isValid:!1,error:"URL must use http:// or https:// protocol"}:n.hostname?{isValid:!0,normalizedUrl:t}:{isValid:!1,error:"Please enter a valid URL starting with http:// or https://"}}catch{let n=ue(t);try{let s=new URL(n);return s.protocol!=="http:"&&s.protocol!=="https:"?{isValid:!1,error:"URL must use http:// or https:// protocol"}:{isValid:!0,normalizedUrl:n}}catch{return{isValid:!1,error:"Please enter a valid URL starting with http:// or https://"}}}}function ge(e){y?(y.textContent=e,y.style.display="block"):R(e)}function $(){y&&(y.textContent="",y.style.display="none")}function pe(e){return new Promise(t=>setTimeout(t,e))}var j=document.createElement("style");j.textContent=`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;document.head.appendChild(j);document.addEventListener("DOMContentLoaded",G);})();
//# sourceMappingURL=app.js.map
