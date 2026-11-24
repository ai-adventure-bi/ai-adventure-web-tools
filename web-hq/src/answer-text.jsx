import React from 'react';
import Markdown from 'react-markdown';

// No raw-HTML plugin: answers are text/Markdown, never executable page content.
const components={
 h1:({children})=><h4>{children}</h4>,h2:({children})=><h4>{children}</h4>,h3:({children})=><h4>{children}</h4>,
 a:({children})=><span>{children}</span>,img:()=>null
};
export function AnswerText({text}){return <div className="answer-markdown"><Markdown components={components}>{text}</Markdown></div>;}
