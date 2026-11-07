import React from 'react';
import { createRoot } from 'react-dom/client';
import { PronunciationRecorder } from '../src/components/PronunciationRecorder';

createRoot(document.getElementById('root')!).render(
  <PronunciationRecorder targetSentence="And so my fellow Americans ask not what your country can do for you"
    audioText="And so my fellow Americans ask not what your country can do for you" audioLang="en-US" uiLang="en"
    onEvaluated={text => { document.body.dataset.result = text; }} />
);
