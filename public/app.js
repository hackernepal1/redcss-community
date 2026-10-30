const $ = (s) => document.querySelector(s);
$('#year').textContent = new Date().getFullYear();
$('#menuToggle').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
document.querySelectorAll('#mainNav a').forEach(a => a.addEventListener('click', () => $('#mainNav').classList.remove('open')));

const fallbackPosts = [
  {title:'Understanding Social Engineering: How to Protect Your Team from Phishing',category:'Awareness',date:'October 06, 2026',excerpt:'Learn how phishing and social engineering work, how to recognize suspicious messages, and how to protect your accounts.'},
  {title:'How to Analyze Network Traffic Using Wireshark for Cyber Defense',category:'Network Security',date:'October 06, 2026',excerpt:'Explore packet analysis, network troubleshooting, suspicious traffic detection, and encryption checks.'},
  {title:'Introduction to OWASP Top 10: Essential Web Application Security Standards',category:'Web Security',date:'October 06, 2026',excerpt:'Understand common web application risks and the defensive practices that help protect users and systems.'},
  {title:'What is a Brute Force Attack and How to Protect Your Website from It?',category:'Web Security',date:'October 06, 2026',excerpt:'Understand password-guessing attacks and practical defenses such as rate limiting and strong authentication.'},
  {title:'How to Use Nmap for Network Security Auditing: A Beginner’s Guide',category:'Network Security',date:'October 06, 2026',excerpt:'Learn the foundations of host discovery, service identification, and responsible network auditing.'}
];
function renderPosts(posts){
  const grid=$('#articleGrid'); grid.innerHTML='';
  posts.slice(0,6).forEach((p,i)=>{
    const article=document.createElement('article'); article.className='article-card';
    const meta=document.createElement('div'); meta.className='article-meta';
    const cat=document.createElement('span'); cat.textContent=(p.category||'COMMUNITY').toUpperCase();
    const date=document.createElement('span'); date.textContent=p.date||'REDCSS'; meta.append(cat,date);
    const title=document.createElement('h3'); title.textContent=p.title;
    const excerpt=document.createElement('p'); excerpt.textContent=p.excerpt||p.content||'Explore this community learning resource.';
    const link=document.createElement('a'); link.className='read-link'; link.href='https://www.jageshwarkushwaha.com.np'; link.target='_blank'; link.rel='noopener'; link.textContent='EXPLORE ARTICLE '; const arrow=document.createElement('span'); arrow.textContent='↗'; link.append(arrow);
    article.append(meta,title,excerpt,link); grid.append(article);
  });
}
fetch('/api/posts').then(r=>r.ok?r.json():Promise.reject()).then(renderPosts).catch(()=>renderPosts(fallbackPosts));
$('#contactForm').addEventListener('submit', async (event)=>{
  event.preventDefault(); const form=event.currentTarget, status=$('#formStatus'), button=form.querySelector('button');
  button.disabled=true; button.textContent='Sending…'; status.textContent='';
  const data=Object.fromEntries(new FormData(form).entries());
  try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to send message.');status.textContent='✓ '+result.message;form.reset();}
  catch(err){status.textContent='Could not submit right now. Please email stylishcompanygame@gmail.com.';}
  finally{button.disabled=false;button.innerHTML='Send message <span>↗</span>';}
});
