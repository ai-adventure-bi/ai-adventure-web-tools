export const templates=[{id:'blank',name:'Blank website',note:'Add your own text and buttons.',symbol:'✳',colour:'lavender'},{id:'quiz',name:'Quiz',note:'Questions, choices and a score.',symbol:'?',colour:'mint'},{id:'game',name:'Star game',note:'Tap the stars. Beat your score.',symbol:'✦',colour:'peach'},{id:'portfolio',name:'About me',note:'Add pictures, text and links.',symbol:'↗',colour:'sky'}];
const blank=`import React, { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export default function App() {
  const [cheers, setCheers] = useState(0);
  return (
    <main className="min-h-screen bg-[#f2edff] text-[#302744] flex items-center justify-center p-8">
      <section className="max-w-lg text-center">
        <Sparkles className="mx-auto mb-6" size={40} />
        <p className="text-xs tracking-[0.3em] uppercase mb-4">Made by me</p>
        <h1 className="text-5xl font-bold tracking-tight mb-5">My website</h1>
        <p className="text-lg opacity-70 mb-8">Edit App.jsx to change this page.</p>
        <button onClick={() => setCheers(cheers + 1)} className="bg-[#302744] text-white px-6 py-4 rounded-full text-lg">Clicks: {cheers}</button>
      </section>
    </main>
  );
}`;
const quiz=`import React, { useState } from 'react';
const questions = [
  { question: 'Which planet has rings?', answers: ['Mars', 'Saturn', 'Earth'], correct: 1 },
  { question: 'What do bees make?', answers: ['Honey', 'Jam', 'Chocolate'], correct: 0 },
  { question: 'How many hearts does an octopus have?', answers: ['One', 'Two', 'Three'], correct: 2 }
];
export default function App() {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const finished = step === questions.length;
  return <main className="min-h-screen bg-emerald-50 text-emerald-950 p-8 flex items-center justify-center">
    <section className="w-full max-w-lg">
      <p className="text-sm mb-5">Quiz</p>
      {finished ? <><h1 className="text-5xl font-bold mb-6">You scored {score}/{questions.length}!</h1><button className="rounded-xl bg-emerald-900 text-white p-4" onClick={() => { setStep(0); setScore(0); }}>Play again</button></> : <>
        <p className="mb-3">Question {step + 1} of {questions.length}</p>
        <h1 className="text-4xl font-bold mb-6">{questions[step].question}</h1>
        <div className="grid gap-3">{questions[step].answers.map((answer, i) => <button key={answer} className="text-left bg-white border border-emerald-200 rounded-xl p-5 text-xl" onClick={() => { if (i === questions[step].correct) setScore(score + 1); setStep(step + 1); }}>{answer}</button>)}</div>
      </>}
    </section>
  </main>;
}`;
const game=`import React, { useState } from 'react';
export default function App() {
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ left: 45, top: 45 });
  return <main className="min-h-screen bg-[#fff0db] text-[#603c26] p-6">
    <header className="flex justify-between items-center"><h1 className="text-3xl font-bold">Star catcher ✦</h1><span className="text-xl">Score: {score}</span></header>
    <p className="mt-3">Tap the star and see where it goes!</p>
    <section className="relative h-[60vh] mt-6 border-2 border-dashed border-orange-300 rounded-3xl">
      <button aria-label="Catch the star" className="absolute text-6xl p-2 touch-manipulation" style={{ left: position.left + '%', top: position.top + '%' }} onClick={() => { setScore(score + 1); setPosition({ left: Math.random() * 75, top: Math.random() * 70 }); }}>⭐</button>
    </section>
    <button className="mt-6 underline p-3" onClick={() => setScore(0)}>Start again</button>
  </main>;
}`;
const portfolio=`import React from 'react';
export default function App() {
  const favourites = ['Making things', 'Exploring outside', 'Learning something new'];
  return <main className="min-h-screen bg-sky-50 text-slate-800 p-8">
    <div className="max-w-3xl mx-auto">
    <h1 className="text-6xl font-bold mb-6">About me</h1><p className="text-xl mb-10">Here are some things I like.</p>
    <div className="grid sm:grid-cols-3 gap-4">{favourites.map((thing,i) => <article key={thing} className="bg-white p-6 rounded-2xl border border-sky-100"><span className="text-4xl">{['✳','☀','✦'][i]}</span><h2 className="mt-6 font-bold text-xl">{thing}</h2><p className="mt-3">Add your text here.</p></article>)}</div>
    <p className="mt-12">Add links to classmates here.</p></div>
  </main>;
}`;
export function starter(type){return ({blank,quiz,game,portfolio})[type]||blank;}
