/* ============================================================================
   feedback-questions.js — the evaluation survey's questions, in ONE place.

   Loaded as a plain <script> by both:
     • feedback.html        — the survey people fill in (asks these questions)
     • developer-tool.html  — 📈 Evaluation tab (labels the results with them)
   so the wording on the form and in the results can never drift apart.

   Answers are saved to Firebase under evaluation/<id> — see
   TECHNICAL_OVERVIEW.md §2.3 for the full shape.

   DESIGN (for the report's Method section)
   Most people try the game once, briefly, before filling this in, so the
   survey measures first impressions and *perceived* value rather than
   learning gains. Every agreement statement carries a `construct` — the
   idea it measures — and each construct points at the framework it comes
   from (CONSTRUCTS / REFERENCES below). The dev tool groups results by
   construct and writes the citations into its "Copy methods" text.

   CHANGING QUESTIONS
   • Rewording a label is safe.
   • Never reuse a key for a DIFFERENT question — older responses keep the old
     key, and they'd silently be counted as answers to the new wording. Add a
     new key, mark the old one `retired:true` (hidden from the survey, still
     counted in results/CSV), and bump `version`.
   • The ten `sus` statements are the standard System Usability Scale (Brooke,
     1996), with "system" swapped for "game" and "cumbersome" swapped for
     "awkward" in s8 (an accepted substitution — Bangor et al., 2008). Keep their order and wording —
     the SUS score (0–100) is only comparable to published benchmarks
     (average ≈ 68) if they stay as they are.
   ============================================================================ */
(function(){
  window.FEEDBACK_SURVEY = {
    version: 2,

    // 5-point response scales. `short` is what fits on a phone button.
    scales: {
      agree:   { long:['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], short:['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'], positive:'Agree' },
      compare: { long:['Much worse','Worse','About the same','Better','Much better'],        short:['Much worse','Worse','Same','Better','Much better'],                   positive:'Better' },
    },

    roles: [
      { id:'student',  icon:'🎓', label:'Student' },
      { id:'uc',       icon:'🧑‍🏫', label:'Unit coordinator' },
      { id:'teaching', icon:'🔬', label:'Lecturer / tutor' },
      { id:'other',    icon:'✨', label:'Something else' },
    ],
    // uc + teaching see the "For teaching staff" step and are grouped as
    // "staff" in the results.
    staffRoles: ['uc','teaching'],

    // `when` on a question: 'kahoot' = only if they've used Kahoot,
    // 'noKahoot' = only if they haven't (both read from usedTools).
    // studentOnly / staffOnly hide a question by role.

    // ---- choice questions ----
    choices: {
      year:     { step:'about', label:'Which year are you in?', studentOnly:true, options:[
                  ['y1','1st year'],['y2','2nd year'],['y3','3rd year'],['hons','Honours'],['pg','Postgrad'],['other','Other'] ] },
      units:    { step:'about', label:'Which unit did you play?', multi:true, options:[
                  ['MEDS3002','MEDS3002'],['MEDS2003','MEDS2003'],['other','Another unit'],['none','Just exploring'] ] },
      sessionTime: { step:'about', label:'How long did you play this time?', options:[
                  ['lt5','Under 5 min'],['5to10','5–10 min'],['10to20','10–20 min'],['20plus','20+ min'] ] },
      playedBefore: { step:'about', label:'Had you played it before today?', options:[
                  ['first','No, first time'],['once','Once or twice'],['often','Yes, a few times'] ] },
      modes:    { step:'about', label:'What did you try?', multi:true, options:[
                  ['runner','▶️ Runner game'],['race','🆚 Group Race'],['practice','📝 Study & Practice'],['guide','📚 Study guide'],
                  ['lectures','🎓 Lectures'],['review','📅 Review'],['custom','🎯 Custom run'],['tutorial','🎬 Tutorial'] ] },
      device:   { step:'about', label:'What did you play on?', multi:true, options:[
                  ['phone','📱 Phone'],['tablet','📲 Tablet'],['computer','💻 Laptop / desktop'],['app','📦 The installed app'] ] },
      usedTools:{ step:'about', label:'Which of these have you used for study before?', multi:true, options:[
                  ['kahoot','Kahoot!'],['quizizz','Quizizz / Wayground'],['quizlet','Quizlet'],['anki','Anki / flashcards'],
                  ['qbank','Question banks'],['lms','Canvas / lecture quizzes'],['none','None of these'] ] },
      revise:   { step:'about', label:'How do you mostly revise?', multi:true, studentOnly:true, options:[
                  ['notes','Re-reading notes / slides'],['recordings','Lecture recordings'],['flashcards','Flashcards'],['qbank','Practice questions'],
                  ['pastpapers','Past papers'],['videos','YouTube / videos'],['group','Study groups'],['ai','AI tools'] ] },

      beliefGBL:{ step:'science', label:'Overall, do you think learning through a quiz game like this actually helps people learn?', options:[
                  ['yes','Yes, definitely'],['somewhat','Somewhat'],['unsure','Not sure'],['no','Not really'] ] },

      preferKahoot: { step:'compare', when:'kahoot', label:'For revising a unit, which would you rather use?', options:[
                  ['rmr','Run Morris Run!'],['kahoot','Kahoot!'],['both','Both, for different things'],['neither','Neither'] ] },
      preferUsual:  { step:'compare', when:'noKahoot', label:'For revising a unit, which would you rather use?', options:[
                  ['rmr','Run Morris Run!'],['usual','My usual methods'],['both','A mix of both'] ] },
      staffUse: { step:'staff', staffOnly:true, label:'How would you most likely use it in teaching?', options:[
                  ['instead','Instead of Kahoot-style quizzes'],['alongside','Alongside them'],['outside','Outside class, for revision'],['no','Probably wouldn’t'] ] },

      favFeature: { step:'big', label:'Your favourite part?', options:[
                  ['runner','▶️ Runner game'],['race','🆚 Group Race'],['practice','📝 Study & Practice'],['guide','📚 Study guide'],
                  ['review','📅 Review'],['custom','🎯 Custom run'],['customise','🎨 Customising my cell'] ] },
      examUse:  { step:'big', label:'Would you use it to revise before an exam?', studentOnly:true, options:[
                  ['yes','Definitely'],['maybe','Probably'],['unsure','Not sure'],['no','Probably not'] ] },

      // v1, replaced by sessionTime + playedBefore (people mostly play briefly)
      playTime: { retired:true, label:'(v1) Roughly how long have you played, all up?', options:[
                  ['lt5','A quick try (<5 min)'],['5to15','5–15 min'],['15to60','15–60 min'],['1to3h','1–3 hours'],['3hplus','3+ hours'] ] },
    },

    // ---- 1–5 statements, one group per step ----
    // na:true adds an "N/A" chip (stored as 'na', left out of every average).
    likert: {
      engagement: { step:'fun', title:'Enjoyment & first impressions', scale:'agree', items: [
        { id:'e1', construct:'engagement', text:'Playing was genuinely fun.' },
        { id:'e2', construct:'engagement', text:'I kept wanting to play “just one more run”.' },
        { id:'q1', construct:'ease',       text:'Within a couple of minutes I understood how to play.' },
        { id:'e3', construct:'aesthetics', text:'It looks good and feels polished.' },
        { id:'e5', construct:'challenge',  text:'The speed and difficulty felt about right.' },
        { id:'e8', construct:'flow',       text:'I lost track of time while playing.' },
        { id:'e6', construct:'relatedness',text:'Playing against friends in Group Race made it more motivating.', na:true },
        { id:'e7', construct:'engagement', text:'(v1) It’s more engaging than how I usually revise.', retired:true },
      ]},
      learning: { step:'learn', title:'Perceived learning & usefulness', scale:'agree', items: [
        { id:'l1', construct:'alignment',  text:'The questions matched what’s taught in lectures.' },
        { id:'l2', construct:'challenge',  text:'The questions were pitched at the right level.' },
        { id:'l3', construct:'feedback',   text:'The explanations helped me see why an answer was right or wrong.' },
        { id:'l7', construct:'usefulness', text:'Even in a short session, it showed me topics I’m unsure about.' },
        { id:'l5', construct:'usefulness', text:'The study guide and lecture pages were useful for looking things up.', na:true },
        { id:'u1', construct:'usefulness', text:'I can see this being useful for exam revision.' },
        { id:'l8', construct:'usefulness', text:'Playing regularly would help me remember the content better.' },
        { id:'u2', construct:'intention',  text:'After this short try, I’d want to play again in my own time.' },
        { id:'l4', construct:'usefulness', text:'(v1) It helped me spot the topics I’m weak on.', retired:true },
        { id:'l6', construct:'usefulness', text:'(v1) I think I’ll remember the content better after playing.', retired:true },
      ]},
      science: { step:'science', title:'Learning-science principles', scale:'agree', items: [
        { id:'r1', construct:'retrieval',  text:'Having to recall answers, rather than re-read them, made me think harder about the content.' },
        { id:'r2', construct:'feedback',   text:'Getting instant right/wrong feedback helped me fix misunderstandings on the spot.' },
        { id:'r3', construct:'active',     text:'It felt more active than reading notes or watching a lecture.' },
        { id:'r4', construct:'competence', text:'Clearing stages gave me a sense of progress and achievement.' },
        { id:'r5', construct:'autonomy',   text:'I liked being able to choose my own course, topics and mode.' },
        { id:'e4', construct:'load',       text:'The running part didn’t distract me from the questions.' },
        { id:'r6', construct:'spacing',    text:'Coming back later to questions I got wrong (Review mode) would help them stick.', na:true },
      ]},
      kahoot: { step:'compare', when:'kahoot', title:'Compared with Kahoot!', stem:'Compared with Kahoot!, how does Run Morris Run! do on…', scale:'compare', items: [
        { id:'k1', construct:'cmpKahoot', text:'Fun' },
        { id:'k2', construct:'cmpKahoot', text:'How much I actually learn' },
        { id:'k3', construct:'cmpKahoot', text:'Revising on my own, outside class' },
        { id:'k4', construct:'cmpKahoot', text:'How well the questions match my unit' },
        { id:'k5', construct:'cmpKahoot', text:'Explanations when I get something wrong' },
        { id:'k6', construct:'cmpKahoot', text:'Wanting to use it again' },
      ]},
      usual: { step:'compare', when:'noKahoot', title:'Compared with usual revision', stem:'Compared with how you usually revise, how does Run Morris Run! do on…', scale:'compare', items: [
        { id:'c1', construct:'cmpUsual', text:'Fun' },
        { id:'c2', construct:'cmpUsual', text:'How much I actually learn' },
        { id:'c3', construct:'cmpUsual', text:'Keeping me focused' },
        { id:'c4', construct:'cmpUsual', text:'Showing me what I don’t know yet' },
        { id:'c5', construct:'cmpUsual', text:'Wanting to keep going' },
      ]},
      staff: { step:'staff', staffOnly:true, title:'Teaching staff', scale:'agree', items: [
        { id:'t1', construct:'alignment',  text:'The content is accurate and lines up with the unit’s learning outcomes.' },
        { id:'t2', construct:'intention',  text:'I’d recommend it to my students.' },
        { id:'t3', construct:'staffFit',   text:'I can see it fitting into my unit (tutorials, revision weeks, pre-reading…).' },
        { id:'t4', construct:'staffFit',   text:'Seeing which questions students struggle with would be useful to me.' },
        { id:'t5', construct:'ease',       text:'Adding or editing questions through the content tool looks manageable.', na:true },
        { id:'t6', construct:'staffFit',   text:'It works well as a supplement to — not a replacement for — existing teaching.' },
        { id:'t7', construct:'active',     text:'It would get students actively practising rather than passively listening.' },
      ]},
      // System Usability Scale — see the note at the top before touching these.
      sus: { step:'sus', title:'Usability (SUS)', scale:'agree', items: [
        { id:'s1',  construct:'sus', text:'I think that I would like to use this game frequently.' },
        { id:'s2',  construct:'sus', text:'I found the game unnecessarily complex.' },
        { id:'s3',  construct:'sus', text:'I thought the game was easy to use.' },
        { id:'s4',  construct:'sus', text:'I think that I would need the support of a technical person to be able to use this game.' },
        { id:'s5',  construct:'sus', text:'I found the various functions in this game were well integrated.' },
        { id:'s6',  construct:'sus', text:'I thought there was too much inconsistency in this game.' },
        { id:'s7',  construct:'sus', text:'I would imagine that most people would learn to use this game very quickly.' },
        { id:'s8',  construct:'sus', text:'I found the game very awkward to use.' }, // "awkward" replaces "cumbersome" (unclear to many respondents) -- the accepted substitution, Bangor et al., 2008
        { id:'s9',  construct:'sus', text:'I felt very confident using the game.' },
        { id:'s10', construct:'sus', text:'I needed to learn a lot of things before I could get going with this game.' },
      ]},
    },

    // ---- open questions ----
    text: [
      { id:'beliefWhy',    step:'science', label:'Why do you think that?', placeholder:'Optional, but even one line really helps' },
      { id:'kahootBetter', step:'compare', when:'kahoot', label:'What does Kahoot! do better that we should borrow?', placeholder:'Optional' },
      { id:'best',       step:'big', label:'What did you enjoy most?',                         placeholder:'The bit that made you smile…' },
      { id:'improve',    step:'big', label:'If you could change one thing, what would it be?', placeholder:'Be as blunt as you like' },
      { id:'bugs',       step:'big', label:'Anything broken, confusing or annoying?',          placeholder:'What happened, and on what device?' },
      { id:'staffNeeds', step:'big', label:'What would you need before using this in your unit?', staffOnly:true, placeholder:'Content, features, admin access…' },
      { id:'other',      step:'big', label:'Anything else you’d like to tell us?',             placeholder:'Optional' },
    ],

    // ---- what each statement measures, and where the idea comes from ----
    CONSTRUCTS: {
      engagement:  { label:'Enjoyment & engagement', ref:'Petri et al., 2016' },
      aesthetics:  { label:'Aesthetics', ref:'Petri et al., 2016' },
      challenge:   { label:'Challenge', ref:'Petri et al., 2016' },
      flow:        { label:'Flow / immersion', ref:'Csikszentmihalyi, 1990' },
      ease:        { label:'Perceived ease of use', ref:'Davis, 1989' },
      usefulness:  { label:'Perceived usefulness', ref:'Davis, 1989' },
      intention:   { label:'Intention to use', ref:'Davis, 1989' },
      alignment:   { label:'Alignment with the curriculum', ref:'Biggs, 1996' },
      retrieval:   { label:'Retrieval practice', ref:'Roediger & Karpicke, 2006' },
      feedback:    { label:'Immediate feedback', ref:'Hattie & Timperley, 2007' },
      active:      { label:'Active learning', ref:'Freeman et al., 2014' },
      competence:  { label:'Competence (motivation)', ref:'Ryan & Deci, 2000' },
      autonomy:    { label:'Autonomy (motivation)', ref:'Ryan & Deci, 2000' },
      relatedness: { label:'Relatedness (motivation)', ref:'Ryan & Deci, 2000' },
      load:        { label:'Cognitive load', ref:'Sweller, 1988' },
      spacing:     { label:'Spaced repetition', ref:'Cepeda et al., 2006' },
      staffFit:    { label:'Fit with teaching practice', ref:'' },
      cmpKahoot:   { label:'Comparison with Kahoot!', ref:'Wang & Tahir, 2020' },
      cmpUsual:    { label:'Comparison with usual revision', ref:'Dunlosky et al., 2013' },
      sus:         { label:'System Usability Scale', ref:'Brooke, 1996' },
    },
    REFERENCES: [
      'Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. International Journal of Human–Computer Interaction, 24(6), 574–594.',
      'Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. Journal of Usability Studies, 4(3), 114–123.',
      'Biggs, J. (1996). Enhancing teaching through constructive alignment. Higher Education, 32(3), 347–364.',
      'Brooke, J. (1996). SUS: A “quick and dirty” usability scale. In P. W. Jordan et al. (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis.',
      'Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354–380.',
      'Csikszentmihalyi, M. (1990). Flow: The psychology of optimal experience. Harper & Row.',
      'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340.',
      'Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students’ learning with effective learning techniques. Psychological Science in the Public Interest, 14(1), 4–58.',
      'Freeman, S., Eddy, S. L., McDonough, M., Smith, M. K., Okoroafor, N., Jordt, H., & Wenderoth, M. P. (2014). Active learning increases student performance in science, engineering, and mathematics. PNAS, 111(23), 8410–8415.',
      'Hattie, J., & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.',
      'Petri, G., Gresse von Wangenheim, C., & Borgatto, A. F. (2016). MEEGA+: An evolution of a model for the evaluation of educational games (Technical Report INCoD/GQS.03.2016.E). Federal University of Santa Catarina.',
      'Reichheld, F. F. (2003). The one number you need to grow. Harvard Business Review, 81(12), 46–54.',
      'Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.',
      'Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. American Psychologist, 55(1), 68–78.',
      'Sauro, J. (2011). A practical guide to the System Usability Scale. Measuring Usability LLC.',
      'Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285.',
      'Wang, A. I., & Tahir, R. (2020). The effect of using Kahoot! for learning – A literature review. Computers & Education, 149, 103818.',
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
