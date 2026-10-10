/* Sonneblom site visits (owner 2026-10-10): one anonymous ping per page view. Skips the owner's devices (anyone who opened the City). */
(function(){try{
if(localStorage.getItem("hq-pass")||localStorage.getItem("sd-me")||navigator.webdriver)return;
var v=localStorage.getItem("sd-v");if(!v){v=Math.random().toString(36).slice(2,12);localStorage.setItem("sd-v",v);}
var q=new URLSearchParams(location.search);
var s=q.get("utm_source")||q.get("src")||q.get("ref")||(q.get("fbclid")?"facebook":"")||(q.get("igshid")?"instagram":"")||"";
var d=JSON.stringify({p:location.pathname,r:document.referrer,s:s,v:v,w:innerWidth});
if(navigator.sendBeacon)navigator.sendBeacon("https://chat.sonneblomdigitaal.co.za/avatar/hit",d);
else fetch("https://chat.sonneblomdigitaal.co.za/avatar/hit",{method:"POST",body:d,keepalive:true,mode:"no-cors"});
}catch(e){}})();
