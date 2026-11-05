import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import "./_group.css";
import { Footer, Header, Notice } from "./_shared/Chrome";
import { Link } from "./_shared/Link";

type Answer={recipient:string;occasion:string;feeling:string;budget:string};
const questions=[
  {key:"recipient" as const,title:"Who are you thinking of?",hint:"Start with the person, not the price tag.",options:["A dear friend","Someone who hosts","A new-home owner","A little something for me"]},
  {key:"occasion" as const,title:"What brings you here?",hint:"Big milestone or an ordinary day worth marking.",options:["A new beginning","A thank-you","A celebration","No occasion at all"]},
  {key:"feeling" as const,title:"What should the gift feel like?",hint:"Choose the note you want it to carry.",options:["Warm and welcoming","Quietly beautiful","A little unexpected","Thoughtful and useful"]},
  {key:"budget" as const,title:"What feels comfortable?",hint:"A gentle guide for this sample edit.",options:["Under ₹1,500","₹1,500–₹2,500","₹2,500–₹3,500","Show me a mix"]},
];
const products=[
 {name:"Lotus Pond Candle Set",maker:"Tathaastu",price:"₹2,400",image:"t-lotuspond.webp",id:"lotus"},
 {name:"Crimson Lotus Urli",maker:"Tathaastu",price:"₹1,800",image:"t-crimson.webp",id:"crimson"},
 {name:"Marigold Urli",maker:"Tathaastu",price:"₹1,200",image:"t-marigold.webp",id:"marigold"},
 {name:"Large Teapot Bouquet",maker:"Sample catalogue",price:"₹3,200",image:"t-teapot.webp",id:"teapot"},
];
function chooseResults(a:Answer) {
 const budget=a.budget;
 let list=products;
 if(budget==="Under ₹1,500") list=[products[2],products[1],products[0],products[3]];
 if(budget==="₹1,500–₹2,500") list=[products[0],products[1],products[2],products[3]];
 if(budget==="₹2,500–₹3,500") list=[products[3],products[0],products[1],products[2]];
 return list.slice(0,3);
}
export function GiftFinder() {
 const [step,setStep]=useState(0),[answers,setAnswers]=useState<Answer>({recipient:"",occasion:"",feeling:"",budget:""}),[results,setResults]=useState(false);
 const current=questions[step];
 const selected=answers[current?.key];
 const choose=(option:string)=>{setAnswers(a=>({...a,[current.key]:option}));};
 const next=()=>{if(step<3)setStep(s=>s+1);else setResults(true);};
 const back=()=>{if(results){setResults(false);setStep(3);}else if(step>0)setStep(s=>s-1);};
 const skip=()=>{if(step<3)setStep(s=>s+1);else setResults(true);};
 const restart=()=>{setAnswers({recipient:"",occasion:"",feeling:"",budget:""});setStep(0);setResults(false);};
 const picks=chooseResults(answers);
 return <main className="baksa bk-finder">
  <Notice/><Header/>
  <div className="bk-finder-wrap">
   <div className="bk-finder-intro"><span className="bk-eyebrow">A little help choosing</span><h1>Find a gift with feeling.</h1><p>Four small questions to bring a few thoughtful sample ideas into focus. Your answers stay here in this design preview.</p></div>
   <section className="bk-finder-card" aria-label="Local gift finder">
    <aside className="bk-finder-side">
     <div><span className="bk-eyebrow" style={{color:"#e5c37e"}}>A Baksa Tales guide</span><h2>Thoughtful, not complicated.</h2><p>Tell us a little about the moment. We’ll show a small edit from the sample catalogue.</p></div>
     <div><div className="bk-finder-progress" aria-label={results?"Results":`Question ${step+1} of 4`}>{questions.map((q,i)=><i key={q.key} className={results||i<=step?"on":""}/>)}</div><p style={{margin:0}}>{results?"Your sample edit":`Question ${step+1} of 4`}</p></div>
    </aside>
    <div className="bk-finder-content">
     {!results ? <>
      <span className="bk-eyebrow">Question {step+1} / 4</span><h2>{current.title}</h2><p>{current.hint}</p>
      <div className="bk-options">{current.options.map(option=><button key={option} className={`bk-option ${selected===option?"chosen":""}`} aria-pressed={selected===option} onClick={()=>choose(option)}>{option}{selected===option&&<Check size={17}/>}</button>)}</div>
      <div className="bk-finder-controls"><button className="bk-skip" onClick={skip}>Skip this question</button><div style={{display:"flex",gap:8}}>{step>0&&<button className="bk-btn secondary" onClick={back}><ArrowLeft size={15}/> Back</button>}<button className="bk-btn" onClick={next}>{step===3?"See sample ideas":"Continue"} <ArrowRight size={15}/></button></div></div>
     </>:<>
      <span className="bk-eyebrow">A considered little edit</span><h2>For this kind of moment.</h2><p>These are local suggestions from four sample products, loosely ordered by the budget you chose. Not live AI or a personalized recommendation engine.</p>
      <div className="bk-results">{picks.map(p=><Link key={p.id} className="bk-resultcard" href="/__mockup/preview/baksa/Product"><img src={`/__mockup/images/baksa/${p.image}`} alt=""/><div><strong>{p.name}</strong><small>{p.maker}</small><b>{p.price}</b></div></Link>)}</div>
      <div className="bk-finder-controls"><button className="bk-skip" onClick={restart}><RotateCcw size={14} style={{verticalAlign:"middle",marginRight:5}}/> Start again</button><div style={{display:"flex",gap:8}}><button className="bk-btn secondary" onClick={back}><ArrowLeft size={15}/> Back</button><Link className="bk-btn" href="/__mockup/preview/baksa/Home#shop">Browse the edit <ArrowRight size={15}/></Link></div></div>
     </>}
    </div>
   </section>
   <p className="bk-preview-note" style={{maxWidth:760,margin:"18px auto 0"}}>Preview-only note: results come from a simple local sample rule set. No personal data is sent or stored, and no order can be placed here.</p>
  </div>
  <Footer/>
 </main>;
}
