/* ============================================================================
   feedback-questions.js — the evaluation survey's questions, in ONE place.

   Loaded as a plain <script> by both:
     • feedback.html        — the survey people fill in (asks these questions)
     • developer-tool.html  — 📈 Evaluation tab (labels the results with them)
   so the wording on the form and in the results can never drift apart.

   Answers are saved to Firebase under evaluation/<pushKey> — see
   TECHNICAL_OVERVIEW.md §2.3 for the full shape.

   CHANGING QUESTIONS
   • Rewording a label is safe.
   • Never reuse a key for a DIFFERENT question — older responses keep the old
     key, and they'd silently be counted as answers to the new wording. Add a
     new key instead, and bump `version` so results can be split by version.
   • The ten `sus` statements are the standard System Usability Scale (Brooke,
     1996), with "system" swapped for "game". Keep their order and wording —
     the SUS score (0–100) is only comparable to published benchmarks
     (average ≈ 68) if they stay as they are.
   ============================================================================ */
(function(){
  const AGREE5 = ['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'];

  window.FEEDBACK_SURVEY = {
    version: 1,
    agree5: AGREE5,

    roles: [
      { id:'student',  icon:'🎓', label:'Student' },
      { id:'uc',       icon:'🧑‍🏫', label:'Unit coordinator' },
      { id:'teaching', icon:'🔬', label:'Lecturer / tutor' },
      { id:'other',    icon:'✨', label:'Something else' },
    ],
    // uc + teaching see the "For teaching staff" step and are grouped as
    // "staff" in the results.
    staffRoles: ['uc','teaching'],

    // ---- choice questions (About you) ----
    choices: {
      year:     { label:'Which year are you in?', studentOnly:true, options:[
                  ['y1','1st year'],['y2','2nd year'],['y3','3rd year'],['hons','Honours'],['pg','Postgrad'],['other','Other'] ] },
      units:    { label:'Which units have you used it for?', multi:true, options:[
                  ['MEDS3002','MEDS3002'],['MEDS2003','MEDS2003'],['other','Another unit'],['none','Just exploring'] ] },
      playTime: { label:'Roughly how long have you played, all up?', options:[
                  ['lt5','A quick try (<5 min)'],['5to15','5–15 min'],['15to60','15–60 min'],['1to3h','1–3 hours'],['3hplus','3+ hours'] ] },
      modes:    { label:'What did you try?', multi:true, options:[
                  ['runner','▶️ Runner game'],['race','🆚 Group Race'],['practice','📝 Study & Practice'],['guide','📚 Study guide'],
                  ['lectures','🎓 Lectures'],['review','📅 Review'],['custom','🎯 Custom run'],['tutorial','🎬 Tutorial'] ] },
      device:   { label:'What did you play on?', multi:true, options:[
                  ['phone','📱 Phone'],['tablet','📲 Tablet'],['computer','💻 Laptop / desktop'],['app','📦 The installed app'] ] },
      revise:   { label:'How do you usually revise?', multi:true, studentOnly:true, options:[
                  ['notes','Lecture notes / slides'],['recordings','Lecture recordings'],['flashcards','Flashcards / Anki'],['qbank','Question banks'],
                  ['pastpapers','Past papers'],['videos','YouTube / videos'],['group','Study groups'],['ai','AI tools'] ] },
      favFeature: { label:'Your favourite part?', options:[
                  ['runner','▶️ Runner game'],['race','🆚 Group Race'],['practice','📝 Study & Practice'],['guide','📚 Study guide'],
                  ['review','📅 Review'],['custom','🎯 Custom run'],['customise','🎨 Customising my cell'] ] },
      examUse:  { label:'Would you use it to revise before an exam?', studentOnly:true, options:[
                  ['yes','Definitely'],['maybe','Probably'],['unsure','Not sure'],['no','Probably not'] ] },
    },

    // ---- 1–5 agreement statements, by step ----
    // na:true adds an "N/A" chip (stored as 'na', left out of every average).
    // studentOnly items are hidden from staff, staffOnly from everyone else.
    likert: {
      engagement: [
        { id:'e1', text:'Playing was genuinely fun.' },
        { id:'e2', text:'I kept wanting to play “just one more run”.' },
        { id:'e3', text:'It looks good and feels polished.' },
        { id:'e4', text:'The running part didn’t distract me from the questions.' },
        { id:'e5', text:'The speed and difficulty felt about right.' },
        { id:'e6', text:'Racing friends in Group Race made studying more motivating.', na:true },
        { id:'e7', text:'It’s more engaging than how I usually revise.', studentOnly:true },
      ],
      learning: [
        { id:'l1', text:'The questions matched what’s taught in lectures.' },
        { id:'l2', text:'The questions were pitched at the right level.' },
        { id:'l3', text:'The explanations helped me see why an answer was right or wrong.' },
        { id:'l4', text:'It helped me spot the topics I’m weak on.', studentOnly:true },
        { id:'l5', text:'The study guide and lecture pages were useful for looking things up.', na:true },
        { id:'l6', text:'I think I’ll remember the content better after playing.', studentOnly:true },
      ],
      staff: [
        { id:'t1', text:'The content is accurate and lines up with the unit’s learning outcomes.' },
        { id:'t2', text:'I’d recommend it to my students.' },
        { id:'t3', text:'I can see it fitting into my unit (tutorials, revision weeks, pre-reading…).' },
        { id:'t4', text:'Seeing which questions students struggle with would be useful to me.' },
        { id:'t5', text:'Adding or editing questions through the content tool looks manageable.', na:true },
        { id:'t6', text:'It works well as a supplement to — not a replacement for — existing teaching.' },
      ],
      // System Usability Scale — see the note at the top before touching these.
      sus: [
        { id:'s1',  text:'I think that I would like to use this game frequently.' },
        { id:'s2',  text:'I found the game unnecessarily complex.' },
        { id:'s3',  text:'I thought the game was easy to use.' },
        { id:'s4',  text:'I think that I would need the support of a technical person to be able to use this game.' },
        { id:'s5',  text:'I found the various functions in this game were well integrated.' },
        { id:'s6',  text:'I thought there was too much inconsistency in this game.' },
        { id:'s7',  text:'I would imagine that most people would learn to use this game very quickly.' },
        { id:'s8',  text:'I found the game very cumbersome to use.' },
        { id:'s9',  text:'I felt very confident using the game.' },
        { id:'s10', text:'I needed to learn a lot of things before I could get going with this game.' },
      ],
    },

    // ---- open questions ----
    text: [
      { id:'best',       label:'What did you enjoy most?',                         placeholder:'The bit that made you smile…' },
      { id:'improve',    label:'If you could change one thing, what would it be?', placeholder:'Be as blunt as you like' },
      { id:'bugs',       label:'Anything broken, confusing or annoying?',          placeholder:'What happened, and on what device?' },
      { id:'staffNeeds', label:'What would you need before using this in your unit?', staffOnly:true, placeholder:'Content, features, admin access…' },
      { id:'other',      label:'Anything else you’d like to tell us?',             placeholder:'Optional' },
    ],
  };

  // SUS score 0–100, or null unless all ten are answered 1–5.
  // Odd items: answer − 1. Even items (negatively worded): 5 − answer. Sum × 2.5.
  window.FEEDBACK_SURVEY.susScore = function(ans){
    let sum = 0;
    for(let i=1;i<=10;i++){
      const v = ans && ans['s'+i];
      if(typeof v !== 'number' || v<1 || v>5) return null;
      sum += (i%2) ? v-1 : 5-v;
    }
    return sum * 2.5;
  };
})();
