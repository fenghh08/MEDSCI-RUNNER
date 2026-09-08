/* ============================================================================
   game-data.js — all game CONTENT for Runner Game (cancer-runner-group.html)
   and the Contributor tool (contributor.html) live in this one file.

   Nothing in here is executable game logic — it's just numbers, labels and
   study-guide content. The game and the contributor tool both load this file
   as a plain <script> (NOT type="module", so it still works when you just
   double-click the .html file — no local server needed) and read everything
   off `window.RUNNER_DATA`.

   HOW TO ADD CONTENT
   -------------------
   • Easiest: open contributor.html, fill in the form, it writes the object
     literal for you in the exact shape below — paste it in.
   • By hand: follow the shape of an existing entry and keep the same keys.

   SHAPE OVERVIEW
   ---------------
   COURSES        — real university courses (e.g. MEDS3002), each broken into
                     Classes/lectures (individual lectures, e.g. "L14"). This
                     is ALSO the top level of THEMES below now -- a course
                     code like 'MEDS3002' is both a playable top-level group
                     AND (via `course`/`class` on an item/question) a lecture
                     citation, which is why an item's own course usually
                     matches its top-level THEMES key but doesn't have to.
                     A class/lecture can optionally carry `outcomes` (an
                     array of learning-outcome strings) and `intro` (a short
                     content blurb) — set these to make that lecture playable
                     in the "Learning Path" mode (see LEARNING_PATH_CONFIG).
   THEMES         — Course (e.g. "MEDS3002") → Topic → study-guide Item.
                     Topics are specific to their course now -- each one
                     carries its own `label`/`icon`/`color` inline instead of
                     pointing at a shared taxonomy. Each item can point at a
                     COURSES entry via `course` + `class`, and carries its own
                     `questions` array — the MCQs players get asked about
                     that item (each with its own `difficulty`, one of
                     'easy'/'medium'/'hard', optional, and its own `level`,
                     one of 'identify'/'understand'/'apply'/'case', optional
                     — cognitive level used by the "Learning Path" mode;
                     untagged questions count as 'identify'). A question only
                     needs its own `course`/`class` (or, rarely, a literal
                     `relatedCourse` string) if it genuinely differs from its
                     item's — most just inherit the item's.
   STAGES         — Course → ordered list of Runner-mode stages.
   RUNNABLE_THEMES— which course ids have a STAGES entry (playable in Runner
                     mode vs. Study & Practice-only).
   GAME_CONFIG    — every tunable gameplay number.
   LIFE_CONFIG    — per-course label/icon for the "life" resource.
   LEARNING_PATH_CONFIG — cognitive levels/quotas for the lecture-scoped
                     "Learning Path" mode (identify → understand → apply →
                     case study).
   COMPLETE_SCENARIO — text shown after the last stage.
   ============================================================================ */
(function(){

/* ======================================================================
   COURSES — real university courses, broken into Classes (individual
   lectures). Items and questions reference these via `course` (the course
   code, e.g. 'MEDS3002') + `class` (the class key, e.g. 'L14') instead of
   writing the whole label out by hand every time. The display string
   ("MEDS3002 · L14 · Cancer Hallmarks") is generated automatically — see
   courseDisplayString() in cancer-runner-group.html.
   ====================================================================== */
              const COURSES = {
    'MEDS3002': {
      'code': 'MEDS3002',
      'label': 'Cancer / Medical Science',
      'classes': {
        'L1': {
          'label': 'Transcriptional regulation of gene expression, genome organisation',
        },
        'L2': {
          'label': 'Epigenetic markers',
        },
        'L3': {
          'label': 'RNA splicing',
        },
        'L4': {
          'label': 'Gene Editing Tech',
        },
        'L5': {
          'label': 'Growth factor receptors and intracellular signalling pathway',
        },
        'L6': {
          'label': 'Cell division and checkpoints',
        },
        'L7': {
          'label': 'Cell differentiation',
        },
        'L8': {
          'label': 'Cellular senescence',
        },
        'L9': {
          'label': 'Immune cell differentiation and haematopoiesis',
        },
        'L10': {
          'label': 'Innate vs adaptive immune response',
        },
        'L11': {
          'label': 'Immune surveillance and cancer',
        },
        'L12': {
          'label': 'Immune cell profiling and biomarkers',
        },
        'L13': {
          'label': 'Cancer diagnostic',
        },
        'L14': {
          'label': 'Cancer Hallmarks',
          'outcomes': [
            'Identify the BCR-ABL fusion (Philadelphia chromosome) as a molecular hallmark of chronic myeloid leukemia.',
            'Explain how loss of TP53 tumor-suppressor function contributes to genomic instability and treatment resistance.',
          ],
          'intro': 'This lecture covers two classic cancer hallmarks seen in leukemia: an activating fusion event (BCR-ABL) that drives unregulated proliferation, and a loss-of-function event (TP53) that lets damaged cells survive and divide instead of being stopped or destroyed.',
        },
        'L15': {
          'label': 'Combination therapies in Cancer',
        },
        'L16': {
          'label': 'Metabolism of Cancer Cells',
        },
        'L17': {
          'label': 'TME and metabolism',
        },
        'L18': {
          'label': 'Cancer stem cells',
        },
        'L19': {
          'label': 'Angio & lymphangiogenesis',
        },
        'L20': {
          'label': 'Tumour Vasculature',
        },
        'L21': {
          'label': 'Anti-angiogenic drugs',
        },
        'L22': {
          'label': 'PK PD challenges cancer',
        },
        'L23': {
          'label': 'New RNA therapeutics',
        },
        'L24': {
          'label': 'Intro to immunotherapies',
        },
        'L25': {
          'label': 'Future directions of cancer therapy',
        },
        'L26': {
          'label': 'Transplant rejection',
        },
        'L27': {
          'label': 'Transplant acceptance',
        },
        'L28': {
          'label': 'Intro to HSCT',
        },
        'L29': {
          'label': 'Complications of HSCT',
        },
        'L30': {
          'label': 'Immunosuppressive therapy and diagnostics',
        },
        'L31': {
          'label': 'iPSC Personalised Medicine',
        },
        'L32': {
          'label': 'Overview of adoptive T cell therapies',
        },
        'L33': {
          'label': 'Complications of CAR-T cell immunotherapy',
        },
        'L34': {
          'label': 'Drug Discovery',
        },
        'L35': {
          'label': 'Clinical trials',
        },
        'L36': {
          'label': 'Cell and animal drug development',
        },
        'L37': {
          'label': 'NAMs',
        },
      },
    },
    'MEDS2003': {
      'code': 'MEDS2003',
      'label': 'Biochemistry',
      'classes': {
        'L1': {
          'label': 'Intro to Metabolism',
        },
        'L2': {
          'label': 'Glycolysis vs FA Oxidation',
        },
        'L3': {
          'label': 'Glycolysis, FA Oxidation, Krebs Cycle',
        },
        'L4': {
          'label': 'Electron Transport Chain and Ox Phos',
        },
        'L5': {
          'label': 'Early Starvation, Glycogenolysis',
        },
        'L6': {
          'label': 'Gluconeogenesis, Proteolysis and Ketone Body Synthesis',
        },
        'L7': {
          'label': 'Regulation, Enzymes, RLS',
        },
        'L8': {
          'label': 'Gluconeogenesis In Depth',
        },
        'L9': {
          'label': 'Glycemic Responses, Glycogenesis',
        },
        'L10': {
          'label': 'Lipogenesis, Pentose P Pathway',
        },
        'L11': {
          'label': 'Lipoprotein and Cholesterol Metabolism',
        },
        'L12': {
          'label': 'Nitrogen Metabolism',
        },
        'L13': {
          'label': 'Integration of Metabolism',
        },
        'L14': {
          'label': 'Revision Session 1 – L1–L4',
        },
        'L15': {
          'label': 'ELMA Design with Examples',
        },
        'L16': {
          'label': 'Revision Session 2',
        },
        'L17': {
          'label': 'Revision Session 3',
        },
        'L18': {
          'label': 'Molecular Biology Intro',
        },
        'L19': {
          'label': 'Nucleic Acid Structure',
        },
        'L20': {
          'label': 'Prokaryotic Replication',
        },
        'L21': {
          'label': 'Eukaryotic Replication',
        },
        'L22': {
          'label': 'DNA Synthesis in the Lab',
        },
        'L23': {
          'label': 'The Eukaryotic Genome',
        },
        'L24': {
          'label': 'Prokaryotic Transcription',
        },
        'L25': {
          'label': 'Eukaryotic Transcription',
        },
        'L26': {
          'label': 'Post-transcriptional Processing',
        },
        'L27-28': {
          'label': 'Prokaryotic and Eukaryotic Translation',
        },
        'L29': {
          'label': 'Translational Regulation',
        },
        'L30': {
          'label': 'CS – Molecular Techniques I',
        },
        'L31': {
          'label': 'CS – Molecular Techniques II',
        },
        'L32': {
          'label': 'CS – Molecular Techniques III',
        },
        'L33': {
          'label': 'L18–L23 Revision Questions',
        },
        'L34': {
          'label': 'Molecular Techniques Revision',
        },
        'L35': {
          'label': 'Revision Lecture – Giselle',
        },
        'L36': {
          'label': 'Theory of Practical Revision Lecture',
        },
      },
    },
    'MEDS3003': {
      'code': 'MEDS3003',
      'label': 'Advanced Therapeutics',
      'classes': {
        'L7-8': { 'label': 'Nanoparticle Drug Delivery Systems' },
      },
    },
  };

/* ======================================================================
   GAME_CONFIG — every tunable number lives here in one place.
   ====================================================================== */
  const GAME_CONFIG = {
    baseSpeed: 600,            // px/s at Stage I
    speedRampPerStage: 40,     // added per stage index (0-based) — one-time bump on stage change
    speedRampPerSecond: 10,    // added continuously for every second survived — this is what makes it feel gradual
    maxSpeed: 1000,             // speed never exceeds this
    startingGlucose: 100,
    glucosePickupValue: 5,     // gained per life pickup collected
    wrongAnswerPenalty: 40,    // life lost per wrong MCQ answer
    postAnswerPauseMs: 2000,   // brief freeze after clicking Continue, before the run resumes -- gives a beat to
                               // get oriented instead of getting dropped straight back next to whatever piled up
    obstacleSpawnBaseMs: 500,  // topic-block spawn interval = base + random(0..rand) -- widened per playtester
                               // feedback that questions/obstacles were coming at the player too frequently
    obstacleSpawnRandMs: 700,
    glucoseSpawnBaseMs: 550,   // life-pickup spawn interval = base + random(0..rand)
    glucoseSpawnRandMs: 300,
    initialObstacleDelayMs: 1200, // delay before the very first topic block spawns
    initialGlucoseDelayMs: 500,   // delay before the very first life pickup spawns
    bombDamage: 40,               // life lost when a bomb is hit (instant, no question)
    bombIcon: '💣',                // swap for 'icons/bomb.png' (or any path/URL -- see the ICONS comment
                                   // in medsci-runner.html) to use your own image instead of the emoji
    bombSpawnBaseMs: 800,        // bomb spawn interval — base + random(0..rand) -- widened alongside obstacleSpawn* above
    bombSpawnRandMs: 1600,
    scoreCorrectWeight: 50,    // Group Race ranking score = correct*this - incorrect*this + life*this + stageIndex*stageWeight
    scoreIncorrectWeight: 35,
    scoreLifeWeight: 1,
    stageWeight: 300,          // added per stage reached (stageIndex is 0-based, so Stage I contributes 0)
    streakBonusEvery: 3,       // award a bonus every Nth correct answer IN A ROW (resets to 0 on any wrong answer)
    streakBonusAmount: 10,     // life gained when a streak bonus triggers
    streakBonusAppliesToLife: true, // set false to stop the streak bonus from also topping up life -- the life-award code below stays intact either way, this just gates it
    streakBonusScoreAmount: 150, // flat score points awarded when a streak bonus triggers (on top of the usual correct/incorrect/life/stage weights)
  };

/* ======================================================================
   LIFE — the "health" resource is themed per Runner-playable course. Change
   the label/icon here any time — every place it's shown (HUD, pickups,
   penalties, the bomb warning) reads from this automatically.
   ====================================================================== */
  const LIFE_CONFIG = {
    'MEDS3002': { label:'Glucose', icon:'🩸' },
    'MEDS2003': { label:'ATP',     icon:'⚡' },
  };

/* ======================================================================
   LEARNING_PATH_CONFIG — tunables for the lecture-scoped "Learning Path"
   mode. That mode picks a single lecture (a COURSES[course].classes[class]
   entry) and runs its questions through these cognitive levels in order,
   gated by perLevelQuota correct answers each. A lecture only shows up in
   the Learning Path picker once it has an `outcomes` array (see COURSES
   above) AND at least one question tagged with a matching `level` (see the
   THEMES/questions comment below) — levels with zero matching questions for
   that lecture are skipped rather than shown empty.
   ====================================================================== */
  const LEARNING_PATH_CONFIG = {
    levels: ['identify', 'understand', 'apply', 'case'],
    perLevelQuota: 3, // correct answers needed within a level before advancing to the next
    levelLabels: { identify:'Identify', understand:'Understand', apply:'Apply', case:'Case Study' },
    levelBlurbs: {
      understand: "You've identified the basics — now let's understand the mechanism behind them.",
      apply:      "Time to apply that understanding to a scenario.",
      case:       "Bring it all together with a case study.",
    },
  };

/* ======================================================================
   THEMES — Course -> Topic -> Item. Each item can carry "hashtags" (which
   cancer type / sub-area it belongs to, e.g. ['Leukemia']), course + class
   fields pointing into COURSES above (e.g. course:'MEDS3002', class:'L14'),
   and its own "questions" array — the MCQs players get asked when they hit
   this item's topic in Runner mode or match it in Study & Practice. A
   question only needs its own course/class if it genuinely differs from
   its item's (e.g. a question spanning several classes at once) — most
   questions just inherit the item's.
   ====================================================================== */
              const THEMES = {
    'MEDS3002': {
      'label': 'MEDS3002',
      'icon': '🎗️',
      'blurb': 'Cancer / Medical Science',
      'topics': {
        'genetics': {
          'label': 'Genetics',
          'icon': '🧬',
          'color': '#c58bff',
          'items': {
            'bcrabl': {
              'label': 'BCR-ABL fusion / Philadelphia chromosome',
              'images': [],
              'description': 'A reciprocal translocation t(9;22) fuses BCR and ABL1, creating an always-on tyrosine kinase. Diagnostic hallmark of CML.',
              'mechanism': 'The fusion protein has constitutive (unregulated) tyrosine kinase activity, driving continuous proliferation signals independent of normal growth control.',
              'funFacts': ['The first mutation ever linked directly to a specific human cancer (1960).', 'Named the "Philadelphia chromosome" after the city where it was discovered.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
              'questions': [
                {
                  'id': 'g1',
                  'prompt': 'Which translocation is the hallmark of chronic myeloid leukemia (CML)?',
                  'options': ['t(9;22) — Philadelphia chromosome', 't(15;17)', 't(8;14)', 't(12;21)'],
                  'correctIndex': 0,
                  'explanation': 't(9;22)(q34;q11) creates the BCR-ABL1 fusion gene, the Philadelphia chromosome, diagnostic for CML.',
                  'hashtags': ['Leukemia'],
                  'level': 'identify',
                },
                {
                  'id': 'g2',
                  'prompt': 'What type of protein does the BCR-ABL fusion gene produce?',
                  'options': ['A constitutively active tyrosine kinase', 'A tumor suppressor', 'A cell-surface receptor with no kinase activity', 'A DNA repair enzyme'],
                  'correctIndex': 0,
                  'explanation': 'BCR-ABL encodes a fusion protein with unregulated tyrosine kinase activity, driving proliferation.',
                  'hashtags': ['Leukemia'],
                  'level': 'understand',
                },
                {
                  'id': 'g9',
                  'prompt': 'The Philadelphia chromosome is a shortened, abnormal version of which chromosome?',
                  'options': ['Chromosome 22', 'Chromosome 21', 'Chromosome 9', 'Chromosome 17'],
                  'correctIndex': 0,
                  'explanation': 'The reciprocal translocation shortens chromosome 22, producing the visibly abnormal "Philadelphia chromosome."',
                  'hashtags': ['Leukemia'],
                  'level': 'identify',
                },
              ],
            },
            'tp53': {
              'label': 'TP53 mutation',
              'images': [],
              'description': 'Loss-of-function mutation in the classic tumor-suppressor gene, associated with high-risk, treatment-resistant disease.',
              'mechanism': 'TP53 normally halts the cell cycle or triggers apoptosis in damaged cells; losing it lets genetically unstable cells survive and divide.',
              'funFacts': ['TP53 is sometimes called the "guardian of the genome."'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
              'questions': [
                {
                  'id': 'g8',
                  'prompt': 'TP53 mutations in leukemia are generally associated with which feature?',
                  'options': ['Poor prognosis and treatment resistance', 'Excellent response to standard chemotherapy', 'No clinical significance', 'Exclusive to pediatric ALL'],
                  'correctIndex': 0,
                  'explanation': 'TP53-mutated leukemias tend to be high-risk, often resistant to standard chemotherapy regimens.',
                  'hashtags': ['Leukemia'],
                  'level': 'apply',
                },
              ],
            },
            'somaticVsGermlineMutations': {
              'label': 'Somatic vs germline mutations in cancer',
              'images': [],
              'description': 'Around 90% of cancers arise from somatic mutations (acquired in a single cell lineage during life) rather than germline mutations (present in every cell, inherited, and often associated with earlier cancer onset).',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'ge-somgerm-1',
                  'prompt': 'Approximately 90% of tumours arise from somatic mutations rather than germline mutations. Which statement most accurately reflects the clinical implication of this distinction?',
                  'options': ['Germline mutations affect every cell in the body and are often associated with earlier cancer onset and diagnosis', 'Somatic mutations arise only in haematopoietic stem cells and are therefore limited to blood cancers', 'Germline mutations account for the majority of cancer cases and primarily affect oncogenes rather than tumour suppressors', 'Somatic mutations are inherited from parents and therefore require family-based genetic screening programs'],
                  'correctIndex': 0,
                  'explanation': 'Germline mutations are present in every cell of the body from birth and are often associated with earlier cancer onset — the key clinical distinction from acquired somatic mutations.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'heytest_g7kw': {
              'label': 'Hey test',
              'images': [
                {
                  'caption': 'Biorender image',
                  'filename': 'heytest-1.png',
                  'url': 'images/heytest-1.png',
                },
              ],
              'description': 'A drug',
              'mechanism': 'It works',
              'funFacts': ['Cool stuff'],
              'refs': [
                {
                  'label': 'Link test',
                  'url': 'https://app.notion.com/p/Medsci-run-3cba21c5759780ed844ad229e9acfb49',
                },
              ],
              'hashtags': ['Senescence'],
              'relatedCourse': 'MEDS3002 L3 RNA splicing\nMEDS3002 L8 Cellular senescence',
              'questions': [],
            },
            'craig_itu2': {
              'label': 'Craig',
              'images': [
                {
                  'caption': 'Craig',
                  'filename': 'craig-2.png',
                  'url': 'images/craig-2.png',
                },
              ],
              'description': 'this is Craig',
              'mechanism': 'jdawd',
              'funFacts': ['awda'],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
              'class': 'L3',
            },
          },
        },
        'immunology': {
          'label': 'Immunology',
          'icon': '🛡️',
          'color': '#3ec6e0',
          'items': {
            'pdl1checkpoint': {
              'label': 'PD-1 / PD-L1 checkpoint',
              'images': [],
              'description': 'PD-L1 on tumor cells binds PD-1 on T cells, delivering a "stand down" signal that suppresses the immune attack.',
              'mechanism': 'Some leukemic blasts upregulate PD-L1 specifically in response to ongoing T-cell attack ("adaptive immune resistance"), dynamically shielding themselves.',
              'funFacts': ['Blocking this interaction is the basis of checkpoint-inhibitor drugs.', 'The PD-1/PD-L1 pathway discovery contributed to the 2018 Nobel Prize in Medicine.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L11',
              'questions': [
                {
                  'id': 'i1',
                  'prompt': 'PD-L1 on tumor cells binds which receptor on T cells to suppress the immune response?',
                  'options': ['PD-1', 'CTLA-4', 'CD28', 'TCR'],
                  'correctIndex': 0,
                  'explanation': 'PD-L1 binding PD-1 delivers an inhibitory signal that dampens T-cell activity, allowing immune escape.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i2',
                  'prompt': 'Blocking the PD-1/PD-L1 interaction with checkpoint inhibitors is intended to do what?',
                  'options': ['Restore/reactivate T-cell anti-tumor activity', 'Directly kill blasts via chemotherapy', 'Reduce glucose metabolism in blasts', 'Repair DNA damage in blasts'],
                  'correctIndex': 0,
                  'explanation': 'Checkpoint inhibitors remove the inhibitory brake, allowing T cells to recognize and attack tumor cells.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i9',
                  'prompt': 'Some leukemic blasts upregulate PD-L1 specifically in response to what?',
                  'options': ['Ongoing immune/T-cell attack (adaptive resistance)', 'Glucose deprivation', 'Chemotherapy-induced DNA repair', 'Random mutation with no trigger'],
                  'correctIndex': 0,
                  'explanation': 'This "adaptive immune resistance" lets tumor cells dynamically shield themselves from an active immune response.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'im-pdl1-extra',
                  'prompt': 'A melanoma patient begins pembrolizumab therapy. Two weeks later, biopsy shows apparent tumour swelling before subsequent regression. What best explains this initial swelling?',
                  'options': ['A large influx of reactivated T cells entering the tumour causes transient inflammation and expansion', 'Blockade of PD-L1 on dendritic cells prevents antigen presentation, temporarily worsening immune evasion', 'Pembrolizumab activates regulatory T cells that transiently promote tumour vasculature growth', 'Pembrolizumab directly stimulates tumour cell proliferation before apoptosis occurs'],
                  'correctIndex': 0,
                  'explanation': 'This "pseudoprogression" is explained by a large influx of reactivated, checkpoint-released T cells causing transient inflammation and apparent tumour expansion before the tumour actually regresses.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'cart': {
              'label': 'CAR-T cell therapy',
              'images': [
                {
                  'url': 'images/car_t_cell.png',
                  'caption': 'CAR-T cell therapy',
                },
              ],
              'description': 'A patient\'s own T cells are genetically engineered to express a chimeric antigen receptor (commonly anti-CD19) targeting leukemic cells.',
              'mechanism': 'The engineered receptor lets T cells recognize the tumor antigen directly, independent of normal MHC-restricted antigen presentation.',
              'funFacts': ['A major side effect is cytokine release syndrome from massive T-cell activation.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L32',
              'questions': [
                {
                  'id': 'i3',
                  'prompt': 'CAR-T cell therapy works by doing what to a patient\'s own T cells?',
                  'options': ['Genetically engineering them to target a tumor antigen', 'Removing their T-cell receptors entirely', 'Converting them into NK cells', 'Suppressing them to prevent graft-versus-host disease'],
                  'correctIndex': 0,
                  'explanation': 'CAR-T cells are engineered with a chimeric antigen receptor (e.g. anti-CD19) to recognize leukemic cells.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i4',
                  'prompt': 'A well-known serious side effect of CAR-T cell therapy is:',
                  'options': ['Cytokine release syndrome', 'Hair loss', 'Peripheral neuropathy', 'Hypothyroidism'],
                  'correctIndex': 0,
                  'explanation': 'Massive T-cell activation can trigger a systemic inflammatory response called cytokine release syndrome.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i10',
                  'prompt': 'CAR-T therapy in leukemia most commonly targets which surface antigen?',
                  'options': ['CD19', 'CD117', 'HER2', 'EGFR'],
                  'correctIndex': 0,
                  'explanation': 'CD19 is expressed on B-lineage leukemic cells, making it a common CAR-T target in B-ALL.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
              ],
            },
            'gvl': {
              'label': 'Graft-versus-leukemia effect',
              'images': [],
              'description': 'After allogeneic stem cell transplant, donor immune cells (T cells and NK cells) can recognize and eliminate residual leukemic cells.',
              'mechanism': 'Donor lymphocytes react against minor antigen differences between donor and recipient, incidentally also attacking leukemic cells.',
              'funFacts': ['NK cells can kill abnormal cells without needing prior antigen sensitization, unlike T cells.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L9',
              'questions': [
                {
                  'id': 'i5',
                  'prompt': 'In allogeneic stem cell transplant, the "graft-versus-leukemia" effect refers to:',
                  'options': ['Donor immune cells attacking residual leukemic cells', 'The leukemia attacking the donor graft', 'Rejection of the transplanted marrow', 'A drug interaction during conditioning'],
                  'correctIndex': 0,
                  'explanation': 'Donor T cells and NK cells can recognize and eliminate residual leukemic cells after transplant.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i6',
                  'prompt': 'Which cell type kills abnormal cells without needing prior antigen sensitization?',
                  'options': ['NK (natural killer) cells', 'B cells', 'Eosinophils', 'Basophils'],
                  'correctIndex': 0,
                  'explanation': 'NK cells kill abnormal or infected cells without needing prior antigen exposure, unlike T cells.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
              ],
            },
            'mrd': {
              'label': 'Minimal residual disease (MRD)',
              'images': [],
              'description': 'Small numbers of leukemic cells remaining after treatment, below the detection threshold of standard microscopy.',
              'mechanism': 'Detected using sensitive techniques like multi-parameter flow cytometry or PCR, which can find one leukemic cell among tens of thousands of normal cells.',
              'funFacts': ['MRD status after treatment is one of the strongest predictors of relapse risk.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L12',
              'questions': [
                {
                  'id': 'i7',
                  'prompt': '"Minimal residual disease" (MRD) refers to:',
                  'options': ['Small numbers of leukemic cells below standard microscopy detection', 'Complete absence of any cancer cells', 'A benign, non-cancerous cell population', 'Residual scar tissue after chemotherapy'],
                  'correctIndex': 0,
                  'explanation': 'MRD is detected using sensitive techniques like flow cytometry or PCR, below the threshold of conventional morphology.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
                {
                  'id': 'i8',
                  'prompt': 'Which technique is commonly used to detect minimal residual disease?',
                  'options': ['Flow cytometry or PCR', 'Chest X-ray', 'Standard blood smear only', 'Skin biopsy'],
                  'correctIndex': 0,
                  'explanation': 'These sensitive molecular/cellular techniques can detect very low levels of residual leukemic cells.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L9-L12 Immunology of Cancer',
                },
              ],
            },
            'tCellCostimulationCheckpoints': {
              'label': 'T cell costimulation & checkpoint receptors',
              'images': [],
              'description': 'Full T cell activation requires both TCR engagement and costimulatory signalling through CD28 binding B7 (CD80/86) on antigen-presenting cells, and CD4+ helper T cells are needed to fully activate and sustain CD8+ cytotoxic responses.',
              'mechanism': 'CTLA-4 competes with CD28 for the same B7 ligands but binds with higher affinity, so when B7 availability on APCs is low, CTLA-4 preferentially engages it — tipping the balance toward inhibition. CD8+ T cells depend on CD4+ T cell help for full, sustained activation.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'im-tcc-1',
                  'prompt': 'Both CD4+ and CD8+ T cells are required for optimal anti-tumour immunity. A tumour vaccine strategy that activates only CD8+ T cells would be suboptimal primarily because:',
                  'options': ['CD8+ T cells cannot recognise antigens presented on MHC class I without concurrent TCR signalling from CD4+ cells', 'CD8+ T cells require CD4+ T cell help for full activation and cannot independently sustain cytotoxic responses', 'CD4+ T cells are the sole source of perforin and granzyme necessary for direct tumour cell lysis', 'Without CD4+ activation, MHC class I molecules are downregulated on antigen-presenting cells'],
                  'correctIndex': 1,
                  'explanation': 'CD8+ T cells require CD4+ T cell help (via cytokines and licensing of dendritic cells) for full activation and to sustain an effective, durable cytotoxic response.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'im-tcc-2',
                  'prompt': 'CTLA-4 and CD28 compete for binding to B7 ligands (CD80/CD86) on antigen-presenting cells. Why does low B7 expression on APCs in the tumour microenvironment favour immune suppression?',
                  'options': ['Low B7 forces T cells to rely on cytokine-mediated activation, which requires CD4+ help', 'CD28 is downregulated in tumours, so CTLA-4 becomes the sole signalling molecule regardless of B7 levels', 'Low B7 prevents TCR engagement, so antigen recognition does not occur in the lymph node', 'CTLA-4 has higher affinity for B7 than CD28, so limited B7 preferentially engages the inhibitory receptor'],
                  'correctIndex': 3,
                  'explanation': 'CTLA-4 binds B7 with higher affinity than CD28, so when B7 is scarce it preferentially engages the inhibitory CTLA-4 receptor, tipping the balance toward immune suppression.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'cancerImmunoediting': {
              'label': 'Cancer immunoediting & the cancer-immunity cycle',
              'images': [],
              'description': 'Cancer immunoediting describes three phases — Elimination, Equilibrium, and Escape — as tumours and the immune system co-evolve; escape occurs once the tumour microenvironment develops enough immunosuppressive mechanisms to overcome immune control, often by disrupting individual steps of the cancer-immunity cycle such as T cell priming.',
              'mechanism': 'Tumour-derived TGF-β is one key mechanism that suppresses T cell priming and activation in the lymph node, undermining an early step of the cancer-immunity cycle and helping tumours transition from equilibrium to escape.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'im-ie-1',
                  'prompt': 'During cancer immunoediting, a tumour transitions from the Equilibrium phase to the Escape phase. Which event most accurately characterises this transition?',
                  'options': ['The immune system eliminates all immunogenic tumour clones, leaving only non-immunogenic variants', 'Tumour-specific T cell numbers increase beyond the threshold needed for effective killing', 'The tumour microenvironment develops sufficient immunosuppressive mechanisms to overcome immune control', 'Germline mutations in tumour suppressor genes are acquired during chronic antigen stimulation'],
                  'correctIndex': 2,
                  'explanation': 'The Equilibrium-to-Escape transition occurs once the tumour microenvironment accumulates enough immunosuppressive mechanisms to overcome ongoing immune control.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'im-ie-2',
                  'prompt': 'In the Cancer-Immunity Cycle, step 3 involves T cell priming and activation in the lymph node. Which tumour-derived mechanism most directly undermines this step?',
                  'options': ['Tumour cells upregulating MHC class II to divert CD4+ T cell responses', 'Tumour cells secreting TGF-β to suppress immune cell activation', 'Tumour cells downregulating VEGF to prevent vascular remodelling', 'Tumour cells shedding excess antigen to saturate circulating antibodies'],
                  'correctIndex': 1,
                  'explanation': 'Tumour-derived TGF-β is a well-established immunosuppressive factor that directly undermines T cell priming and activation.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'tilImmunoprofiling': {
              'label': 'Profiling tumour-infiltrating lymphocytes',
              'images': [],
              'description': 'Tumour-infiltrating lymphocytes (TILs) can be profiled by combining lineage markers (CD4/CD8) with functional checkpoint markers (e.g. PD-1) to distinguish exhausted from recently activated effector T cells; flow cytometry offers fast, high-throughput lineage quantification, while a "cold" tumour is defined by sparse TIL infiltration on profiling.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'im-til-1',
                  'prompt': 'A researcher wants to distinguish whether tumour-infiltrating lymphocytes are exhausted effector T cells versus recently activated effector T cells. Which combination of biomarker categories would best resolve this question?',
                  'options': ['Immunohistochemistry for tissue localisation combined with flow cytometry scatter parameters alone', 'CD markers for lineage identification combined with functional checkpoint molecule expression (e.g. PD-1)', 'Cytokine secretion panels combined with TCR repertoire diversity profiling', 'Genomic sequencing of somatic mutations combined with ELISA for circulating tumour markers'],
                  'correctIndex': 1,
                  'explanation': 'Combining lineage CD markers with functional checkpoint molecule expression (e.g. PD-1, TIM-3, LAG-3) is the standard approach to distinguish exhausted from recently activated effector T cells.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'im-til-2',
                  'prompt': 'Flow cytometry is selected over single-cell RNA sequencing for a clinical study requiring rapid, high-throughput quantification of CD4+ and CD8+ T cell subsets in peripheral blood. Which principle best justifies this choice?',
                  'options': ['Flow cytometry provides spatial information about where T cells are located within tissue architecture', 'Flow cytometry quantifies cells based on fluorescently labelled antibodies, offering speed and high cell numbers without sequencing costs', 'Flow cytometry simultaneously measures gene expression profiles per individual cell, identifying rare transcriptional states', 'Flow cytometry detects secreted cytokines downstream of T cell activation without requiring cell surface staining'],
                  'correctIndex': 1,
                  'explanation': 'Flow cytometry quantifies cells via fluorescently labelled antibodies, offering fast, high-throughput results at far lower cost than sequencing — the key reason it’s preferred for rapid clinical subset quantification.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'im-til-3',
                  'prompt': 'A "cold" tumour is characterised by low immune infiltration and poor response to checkpoint inhibitors. Which immunoprofiling finding would best classify a tumour as "cold"?',
                  'options': ['Elevated PD-L1 expression on tumour cells combined with high CD4+ T cell infiltration in the stroma', 'Sparse tumour-infiltrating lymphocytes on immunohistochemistry and low TIL scores on profiling', 'High M1 macrophage infiltration with strong IFN-γ signalling detected by cytokine panels', 'High density of CD8+ cytotoxic T cells throughout the tumour parenchyma detected by flow cytometry'],
                  'correctIndex': 1,
                  'explanation': 'A "cold" tumour is defined by sparse TILs on immunohistochemistry and low TIL scores on profiling — the opposite of an inflamed, immune-infiltrated "hot" tumour.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'mhcClassIAndNkCells': {
              'label': 'MHC class I loss & NK cell surveillance',
              'images': [],
              'description': 'Tumours can evade CD8+ T cell recognition by downregulating MHC class I, but this "missing self" state instead makes them more susceptible to NK cell-mediated killing.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'im-mhc-1',
                  'prompt': 'A patient’s tumour biopsies show that cancer cells have completely downregulated surface MHC class I expression. Which consequence is most likely to follow from this change?',
                  'options': ['Dendritic cells will fail to capture and transport tumour antigens to lymph nodes', 'CD8+ T cells will increase their cytotoxic activity against the tumour', 'CD4+ T cells will be unable to provide costimulatory help to B cells', 'The tumour becomes invisible to CD8+ T cells but potentially susceptible to NK cell killing'],
                  'correctIndex': 3,
                  'explanation': 'Losing MHC class I makes a tumour invisible to CD8+ T cell recognition, but this "missing self" state is exactly what triggers NK cell-mediated killing.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
          },
        },
        'pharmacology': {
          'label': 'Pharmacology',
          'icon': '💊',
          'color': '#ff4d6d',
          'items': {
            'imatinib': {
              'label': 'Imatinib',
              'images': [],
              'description': 'A small-molecule tyrosine kinase inhibitor that blocks the ATP-binding pocket of BCR-ABL.',
              'mechanism': 'By occupying the ATP site, imatinib prevents BCR-ABL from phosphorylating its downstream targets, switching off the proliferative signal.',
              'funFacts': ['Brand name Gleevec — turned CML from often-fatal into a manageable chronic condition for most patients.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L22',
              'questions': [
                {
                  'id': 'p1',
                  'prompt': 'Imatinib works by inhibiting which target?',
                  'options': ['The BCR-ABL tyrosine kinase', 'DNA topoisomerase', 'Estrogen receptor', 'PARP enzyme'],
                  'correctIndex': 0,
                  'explanation': 'Imatinib binds the ATP pocket of BCR-ABL, blocking its constitutive kinase activity.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
                {
                  'id': 'p2',
                  'prompt': 'Imatinib revolutionized treatment of which leukemia?',
                  'options': ['Chronic myeloid leukemia (CML)', 'Hairy cell leukemia', 'Acute promyelocytic leukemia', 'Burkitt leukemia'],
                  'correctIndex': 0,
                  'explanation': 'Imatinib turned CML from an often-fatal disease into a manageable chronic condition for most patients.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
              ],
            },
            'cytarabine': {
              'label': 'Cytarabine',
              'images': [],
              'description': 'A nucleoside analog chemotherapy drug that mimics cytosine and disrupts DNA synthesis.',
              'mechanism': 'Incorporated into DNA in place of cytosine, it stalls the replication machinery in actively dividing cells.',
              'funFacts': ['Backbone of the classic "7+3" AML induction regimen, paired with an anthracycline like daunorubicin.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
              'questions': [
                {
                  'id': 'p3',
                  'prompt': 'Cytarabine acts as a chemotherapeutic by:',
                  'options': ['Mimicking cytosine and disrupting DNA synthesis', 'Blocking hormone receptors', 'Inhibiting angiogenesis', 'Blocking immune checkpoints'],
                  'correctIndex': 0,
                  'explanation': 'Cytarabine is a nucleoside analog incorporated into DNA, halting replication in dividing cells.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
                {
                  'id': 'p4',
                  'prompt': 'The classic "7+3" AML induction regimen combines cytarabine with which drug class?',
                  'options': ['An anthracycline (e.g. daunorubicin)', 'Tamoxifen', 'Imatinib', 'Rituximab'],
                  'correctIndex': 0,
                  'explanation': '"7+3" refers to 7 days of cytarabine plus 3 days of an anthracycline like daunorubicin.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
                {
                  'id': 'p8',
                  'prompt': 'A key limitation of cytarabine and similar chemo agents is that they:',
                  'options': ['Also damage normal rapidly-dividing cells', 'Only work on non-dividing cells', 'Are completely selective for leukemic cells', 'Have no effect on DNA'],
                  'correctIndex': 0,
                  'explanation': 'Because these drugs broadly target DNA synthesis, healthy proliferating tissues (marrow, gut lining) are also affected.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
              ],
            },
            'midostaurin': {
              'label': 'Midostaurin',
              'images': [],
              'description': 'A FLT3 inhibitor added to induction chemotherapy specifically for FLT3-mutated AML.',
              'mechanism': 'Blocks the constitutively active FLT3 kinase domain, reducing the proliferative drive from the mutant receptor.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
              'questions': [
                {
                  'id': 'p5',
                  'prompt': 'Midostaurin is used in AML specifically for patients with which mutation?',
                  'options': ['FLT3 mutation', 'BCR-ABL fusion', 'TP53 mutation', 'CEBPA mutation'],
                  'correctIndex': 0,
                  'explanation': 'Midostaurin is a FLT3 inhibitor added to induction therapy in FLT3-mutated AML.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
              ],
            },
            'atra': {
              'label': 'All-trans retinoic acid (ATRA)',
              'images': [],
              'description': 'A differentiation-inducing drug used as targeted therapy for acute promyelocytic leukemia (APL).',
              'mechanism': 'ATRA overcomes the differentiation block caused by the PML-RARA fusion protein, pushing abnormal promyelocytes to mature into normal granulocytes.',
              'funFacts': ['One of the first examples of "differentiation therapy" rather than cell-killing chemotherapy.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
              'questions': [
                {
                  'id': 'p6',
                  'prompt': 'All-trans retinoic acid (ATRA) is the targeted therapy for which AML subtype?',
                  'options': ['Acute promyelocytic leukemia (APL)', 'Chronic lymphocytic leukemia', 'Philadelphia-positive ALL', 'Hairy cell leukemia'],
                  'correctIndex': 0,
                  'explanation': 'ATRA induces differentiation of the abnormal promyelocytes typical of APL (associated with PML-RARA fusion).',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
              ],
            },
            'venetoclax': {
              'label': 'Venetoclax',
              'images': [],
              'description': 'A BCL-2 inhibitor that promotes apoptosis in leukemic cells reliant on BCL-2 for survival.',
              'mechanism': 'Blocks BCL-2, an anti-apoptotic protein, tipping the balance back toward programmed cell death in leukemic blasts.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
              'questions': [
                {
                  'id': 'p7',
                  'prompt': 'Venetoclax works by inhibiting which anti-apoptotic protein?',
                  'options': ['BCL-2', 'BCR-ABL', 'PD-L1', 'VEGF'],
                  'correctIndex': 0,
                  'explanation': 'Venetoclax blocks BCL-2, promoting apoptosis in leukemic cells that rely on it for survival.',
                  'hashtags': ['Leukemia'],
                  'relatedCourse': 'MEDS3002 L15/L21/L22 Cancer Pharmacology',
                },
              ],
            },
            'methotrexate_2lva': {
              'label': 'Methotrexate',
              'images': [],
              'description': 'NONE',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'q-pharmacology-tht8',
                  'prompt': 'Methotrexate is classified as a:',
                  'options': ['NSAID', 'Biological DMARD', 'Targeted DMARD', 'Conventional DMARD'],
                  'correctIndex': 3,
                  'explanation': 'Methotrexate is a conventional synthetic DMARD and remains first-line therapy for RA.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-64o8',
                  'prompt': 'Which drug is typically first-line for RA?',
                  'options': ['Methotrexate', 'Tofacitinib', 'Infliximab', 'Rituximab'],
                  'correctIndex': 0,
                  'explanation': 'Methotrexate is the anchor first-line conventional DMARD for RA.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-opbo',
                  'prompt': 'Folic acid is co-prescribed with methotrexate mainly to:',
                  'options': ['Increase methotrexate absorption', 'Reduce gastrointestinal and haematological toxicity', 'Enhance disease-modifying effect', 'Prevent injection site reactions'],
                  'correctIndex': 1,
                  'explanation': 'Folic acid supplementation reduces methotrexate\'s antifolate-related side effects (GI upset, mucositis, cytopenias) without reducing efficacy.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
              ],
            },
            'tnfinhibitors_76wd': {
              'label': 'TNF inhibitors',
              'images': [],
              'description': '(add a description)',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'q-pharmacology-5seq',
                  'prompt': 'Which is TRUE about TNF inhibitors?',
                  'options': ['They are not used in RA', 'All have identical pharmacokinetics', 'They target different pathways', 'They share a common target but differ structurally'],
                  'correctIndex': 3,
                  'explanation': 'TNF inhibitors (e.g. infliximab, adalimumab, etanercept) all neutralise TNF-alpha but differ in structure and pharmacokinetics.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-cvg8',
                  'prompt': 'Before starting a TNF inhibitor, patients should be screened for:',
                  'options': ['Iron deficiency', 'Latent tuberculosis', 'Vitamin D levels', 'Blood type'],
                  'correctIndex': 1,
                  'explanation': 'TNF inhibitors can reactivate latent TB, so screening (and treatment if positive) is required before starting therapy.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-4dv7',
                  'prompt': 'Etanercept differs structurally from infliximab and adalimumab in that it is:',
                  'options': ['A small-molecule inhibitor', 'A soluble TNF receptor fusion protein', 'A JAK inhibitor', 'An IL-6 receptor antagonist'],
                  'correctIndex': 1,
                  'explanation': 'Etanercept is a fusion protein combining a TNF receptor with an antibody Fc region, unlike the monoclonal antibodies infliximab and adalimumab.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
              ],
            },
            'biologicaldmards_pbuv': {
              'label': 'Biological DMARDs',
              'images': [],
              'description': '(add a description)',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
            },
            'jakinhibitors_jybp': {
              'label': 'JAK inhibitors',
              'images': [],
              'description': '(add a description)',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
            },
            'tocilizumab_mukf': {
              'label': 'Tocilizumab',
              'images': [],
              'description': '(add a description)',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
            },
            'immunosuppressivetherapy_alwf': {
              'label': 'Immunosuppressive therapy',
              'images': [],
              'description': '(add a description)',
              'funFacts': [],
              'refs': [],
              'hashtags': [],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'q-pharmacology-igpl',
                  'prompt': 'Which statement about immunosuppressive therapy is correct?',
                  'options': ['Always short-term', 'Only used in infections', 'Can be temporary or lifelong', 'Does not affect immunity'],
                  'correctIndex': 2,
                  'explanation': 'Immunosuppressive therapy duration varies: short-term for acute flares, or lifelong for chronic autoimmune disease.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-fwq0',
                  'prompt': 'Dose reduction strategies in stable RA aim to:',
                  'options': ['Maintain control with less drug', 'Stop all therapy immediately', 'Prevent diagnosis', 'Increase toxicity'],
                  'correctIndex': 0,
                  'explanation': 'In sustained remission, tapering aims to maintain disease control while minimising drug exposure and toxicity.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
                {
                  'id': 'q-pharmacology-012d',
                  'prompt': 'Abruptly stopping immunosuppressive therapy in RA, rather than tapering, risks:',
                  'options': ['Improved long-term outcomes', 'Disease flare due to loss of control', 'No clinical consequence', 'Permanent cure'],
                  'correctIndex': 1,
                  'explanation': 'Sudden discontinuation rather than gradual tapering increases the risk of disease flare, since underlying inflammatory activity is no longer suppressed.',
                  'hashtags': ['RA', 'Pharmacology'],
                },
              ],
            },
          },
        },
        'oncology': {
          'label': 'Oncology',
          'icon': '🎗️',
          'color': '#ffab4d',
          'items': {
            'blastcrisis': {
              'label': 'Blast crisis',
              'images': [],
              'description': 'The terminal, aggressive phase of CML, where the disease transforms into something behaving like acute leukemia.',
              'mechanism': 'A rising percentage of immature blasts in blood/marrow signals progression from chronic phase through an accelerated phase into blast crisis.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
              'questions': [
                {
                  'id': 'o1',
                  'prompt': '"Blast crisis" in CML refers to:',
                  'options': ['Transformation into an acute, aggressive leukemia-like phase', 'A sudden drop in white blood cell count', 'A benign remission phase', 'An allergic drug reaction'],
                  'correctIndex': 0,
                  'explanation': 'Blast crisis is the terminal, aggressive phase of CML with a surge of immature blasts, behaving like acute leukemia.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'o7',
                  'prompt': 'Which lab finding is most characteristic of progression toward blast crisis in CML?',
                  'options': ['Rising percentage of blasts in blood or marrow', 'Falling white cell count to normal', 'Disappearance of the Philadelphia chromosome', 'Normalization of platelet count'],
                  'correctIndex': 0,
                  'explanation': 'An increasing blast percentage signals progression from chronic phase toward blast crisis.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'tls': {
              'label': 'Tumor lysis syndrome',
              'images': [],
              'description': 'A metabolic emergency where rapid destruction of cancer cells releases intracellular contents faster than the body can clear them.',
              'mechanism': 'Releases potassium, phosphate, and uric acid, risking arrhythmias and urate-related kidney injury — most common after starting treatment on a high tumor burden.',
              'funFacts': ['Allopurinol is commonly given beforehand to reduce uric acid production and lower the risk.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
              'questions': [
                {
                  'id': 'o2',
                  'prompt': 'Tumor lysis syndrome occurs when:',
                  'options': ['Rapid destruction of cancer cells releases contents faster than the body can clear them', 'Cancer cells stop dividing entirely', 'The immune system rejects a transplant', 'A patient develops a new mutation'],
                  'correctIndex': 0,
                  'explanation': 'This releases potassium, phosphate, and uric acid, risking kidney injury and arrhythmias — common after starting chemo on a high tumor burden.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'o3',
                  'prompt': 'Which drug is commonly given to help prevent tumor lysis syndrome complications?',
                  'options': ['Allopurinol', 'Imatinib', 'Cytarabine', 'ATRA'],
                  'correctIndex': 0,
                  'explanation': 'Allopurinol lowers uric acid production, reducing the risk of urate nephropathy during tumor lysis.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'bmbiopsy': {
              'label': 'Bone marrow biopsy/aspirate',
              'images': [],
              'description': 'The key diagnostic and monitoring procedure in leukemia, directly sampling marrow cellularity and blast percentage.',
              'mechanism': 'A needle sample from the marrow (usually the pelvis) allows direct microscopic, flow cytometric, and genetic assessment of the leukemic clone.',
              'funFacts': ['Auer rods — needle-like cytoplasmic inclusions — are a classic AML finding seen on these samples.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
              'questions': [
                {
                  'id': 'o4',
                  'prompt': 'A bone marrow biopsy/aspirate is primarily used in leukemia to:',
                  'options': ['Directly assess blast percentage and marrow cellularity', 'Screen for skin cancer', 'Measure lung function', 'Assess kidney filtration rate'],
                  'correctIndex': 0,
                  'explanation': 'Marrow sampling is central to diagnosing leukemia and tracking response to treatment.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'o8',
                  'prompt': 'Auer rods, seen on blood/marrow smear, are most characteristic of which leukemia type?',
                  'options': ['Acute myeloid leukemia (AML)', 'Chronic lymphocytic leukemia', 'Hairy cell leukemia', 'ALL'],
                  'correctIndex': 0,
                  'explanation': 'Auer rods are needle-like cytoplasmic inclusions (crystallized granules) seen in myeloblasts, characteristic of AML.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'remission': {
              'label': 'Complete remission',
              'images': [],
              'description': 'Defined by blast count falling below a set threshold (commonly <5%) with normal blood counts restored.',
              'mechanism': 'Remission criteria are based on marrow blast percentage and peripheral count recovery — not the same as undetectable MRD.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
              'questions': [
                {
                  'id': 'o5',
                  'prompt': '"Complete remission" in leukemia is generally defined as:',
                  'options': ['Blast count below a defined threshold with normal counts restored', 'Total absence of any detectable leukemic DNA', 'Patient reporting no symptoms only', 'Discontinuation of all treatment'],
                  'correctIndex': 0,
                  'explanation': 'Complete remission criteria focus on marrow blast percentage and peripheral blood count recovery, not on undetectable MRD.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'transplant': {
              'label': 'Stem cell transplant',
              'images': [],
              'description': 'Allogeneic transplant uses a matched donor\'s cells; autologous transplant reinfuses the patient\'s own harvested cells.',
              'mechanism': 'Allogeneic transplant can trigger the graft-versus-leukemia effect via donor immune cells; autologous transplant does not carry that benefit.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L28',
              'questions': [
                {
                  'id': 'o6',
                  'prompt': 'The main difference between allogeneic and autologous stem cell transplant is:',
                  'options': ['Allogeneic uses a donor\'s cells; autologous uses the patient\'s own', 'Allogeneic is always safer', 'Autologous always cures leukemia', 'They are the same procedure'],
                  'correctIndex': 0,
                  'explanation': 'Allogeneic transplant relies on a matched donor (enabling graft-versus-leukemia); autologous reinfuses the patient\'s own harvested cells.',
                  'hashtags': ['Leukemia'],
                  'course': 'MEDS3002',
                  'class': 'L13',
                },
              ],
            },
            'tnmStagingAndProgression': {
              'label': 'Cancer staging & disease progression',
              'images': [],
              'description': 'The TNM system stages cancers by primary tumour size/extent (T), regional lymph node involvement (N), and distant metastasis (M); sentinel lymph node biopsy is the key test for detecting early regional (nodal) spread. Some cancers, like gastric adenocarcinoma following H. pylori infection, progress through a well-defined stepwise sequence of tissue changes.',
              'mechanism': 'H. pylori-driven gastric cancer progresses through chronic inflammation → intestinal metaplasia → dysplasia → adenocarcinoma (the Correa cascade).',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'on-tnm-1',
                  'prompt': 'Sentinel lymph node biopsy is performed for a patient with a primary breast tumour. The sentinel node tests positive for cancer cells. Which conclusion does this finding most directly support?',
                  'options': ['The primary tumour has a high mutational burden, increasing its immunogenicity for T cell recognition', 'The cancer originated from a germline BRCA mutation, requiring family members to undergo genetic testing', 'The cancer has already spread to distant organs such as the liver or lung via haematogenous spread', 'Regional lymph node involvement is present, indicating at least N1 classification under TNM staging'],
                  'correctIndex': 3,
                  'explanation': 'A positive sentinel node indicates regional lymph node involvement — at least N1 under TNM staging — not necessarily distant metastasis.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'on-tnm-2',
                  'prompt': 'The TNM staging system classifies tumours using three parameters. A patient is staged as T3 N1 M0. What does this staging most accurately indicate?',
                  'options': ['A small primary tumour with extensive lymph node involvement and distant metastases present', 'An advanced primary tumour with some regional lymph node involvement and no distant metastases', 'A moderately sized primary tumour, no lymph node involvement, and metastasis confirmed in one organ', 'An absent primary tumour but with regional lymph node and distant organ involvement detected'],
                  'correctIndex': 1,
                  'explanation': 'T3 indicates an advanced/larger primary tumour, N1 indicates some regional lymph node involvement, and M0 indicates no distant metastasis.',
                  'hashtags': ['Leukemia'],
                },
                {
                  'id': 'on-tnm-3',
                  'prompt': 'Helicobacter pylori infection progresses to gastric adenocarcinoma through a series of tissue changes. Which sequence correctly represents this progression?',
                  'options': ['Mucosal colonisation → acute ulceration → genomic instability → adenocarcinoma', 'Acute gastritis → peptic ulcer → dysplasia → adenocarcinoma', 'Chronic inflammation → intestinal metaplasia → dysplasia → adenocarcinoma', 'Intestinal metaplasia → chronic inflammation → mucosal atrophy → adenocarcinoma'],
                  'correctIndex': 2,
                  'explanation': 'H. pylori-driven gastric cancer follows the well-established Correa cascade: chronic inflammation → intestinal metaplasia → dysplasia → adenocarcinoma.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'globalCancerEpidemiology': {
              'label': 'Global cancer burden & epidemiology',
              'images': [],
              'description': 'Global cancer case numbers are projected to rise substantially by 2050 even where age-standardised incidence rates stay relatively stable, primarily because growing and ageing populations mean more people reach cancer-susceptible age groups.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'on-epi-1',
                  'prompt': 'Global cancer burden projections to 2050 show that age-standardised incidence rates remain relatively stable while absolute case numbers rise substantially. Which factor most directly explains this discrepancy?',
                  'options': ['Improved cancer screening programs are detecting more indolent cancers that would previously have gone undiagnosed', 'Growing and ageing global populations mean more people are reaching cancer-susceptible age groups even if per-capita rates stay constant', 'Western lifestyle factors including obesity and ultra-processed food consumption are increasing mutation rates uniformly across all age groups', 'Advances in immunotherapy have paradoxically increased cancer survival, leading more patients to appear in incidence statistics'],
                  'correctIndex': 1,
                  'explanation': 'Even with stable per-capita (age-standardised) rates, growing and ageing populations mean far more people are reaching cancer-susceptible age groups — driving up absolute case counts.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
            'hpvCervicalCancer': {
              'label': 'HPV, cervical cancer & the Gardasil vaccine',
              'images': [],
              'description': 'Harald zur Hausen’s discovery that HPV causes cervical cancer (2008 Nobel Prize) led to the Gardasil vaccine, which prevents infection by generating neutralising antibodies against the viral L1 capsid protein.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'on-hpv-1',
                  'prompt': 'Harald zur Hausen received the 2008 Nobel Prize for discovering that HPV causes cervical cancer. The Gardasil vaccine prevents this by targeting which component?',
                  'options': ['The viral DNA integrase enzyme that inserts HPV genome into host chromosomal DNA', 'Chronic inflammation pathways that HPV activates in basal epithelial cells', 'The E6 and E7 oncoproteins that directly degrade p53 and pRb', 'The L1 capsid protein, generating neutralising antibodies that block viral entry'],
                  'correctIndex': 3,
                  'explanation': 'Gardasil is a virus-like-particle vaccine targeting the L1 capsid protein, generating neutralising antibodies that block HPV entry before infection can occur.',
                  'hashtags': ['Leukemia'],
                },
              ],
            },
          },
        },
        'cellBiology': {
          'label': 'Cell Biology',
          'icon': '🧫',
          'color': '#2dd4bf',
          'items': {
            'cellCycleCheckpoints': {
              'label': 'Cell cycle checkpoints & CDK regulation',
              'images': [],
              'description': 'The G1/S and G2/M checkpoints control progression through the cell cycle via cyclin-CDK complexes acting on Rb and E2F, with the DNA damage response able to halt the cycle at either checkpoint.',
              'mechanism': 'Cyclin D/CDK4-6 phosphorylates Rb, releasing E2F to drive S-phase entry; DNA damage activates ATM/ATR, which signal through CHK1/CHK2 to p53/p21 (G1 arrest) or directly inhibit CDK1/Cyclin B (G2 arrest). CDK4/6 inhibitors like palbociclib exploit cancer cells’ reliance on this axis.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Cell cycle'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'cb-cc-1',
                  'prompt': 'Oncogene-induced senescence is triggered when a normally quiescent cell experiences aberrant activation of a proto-oncogene such as RAS. What is the mechanistic link between oncogene activation and cell cycle arrest in this context?',
                  'options': ['The oncogene suppresses MDM2 expression, leading to constitutive p53 activity and permanent transcriptional silencing of cyclins', 'Hyperproliferation depletes cellular ATP, triggering AMPK-mediated phosphorylation of Rb and permanent S phase block', 'Oncogene-driven hyperproliferation creates replication stress and DNA damage at fragile sites, engaging the DDR and upregulating p53/p21', 'Oncogene activation directly phosphorylates p16, which then inhibits CDK2/Cyclin E to arrest the cell at the G1/S checkpoint'],
                  'correctIndex': 2,
                  'explanation': 'Oncogene-driven hyperproliferation creates replication stress and DNA damage at fragile sites, engaging the DNA damage response and upregulating p53/p21 — the well-established mechanism of oncogene-induced senescence.',
                  'hashtags': ['Cell cycle'],
                },
                {
                  'id': 'cb-cc-2',
                  'prompt': 'Cyclin D is overexpressed in a cancer cell, leading to hyperactive CDK4/6 signalling. What is the most direct downstream consequence of this dysregulation?',
                  'options': ['Increased p16 expression that further amplifies CDK4/6 activity in a positive feedback loop', 'Degradation of p53, removing the primary barrier to uncontrolled cell cycle progression', 'Constitutive activation of CDK1/Cyclin B, bypassing the G2/M checkpoint entirely', 'Premature phosphorylation of Rb, releasing E2F transcription factors to drive S phase entry'],
                  'correctIndex': 3,
                  'explanation': 'Hyperactive CDK4/6 phosphorylates Rb prematurely, releasing E2F transcription factors and driving S-phase entry — the core CDK4/6-Rb-E2F axis.',
                  'hashtags': ['Cell cycle'],
                },
                {
                  'id': 'cb-cc-3',
                  'prompt': 'Palbociclib is a CDK4/6 inhibitor used in breast cancer therapy. Based on the cell cycle checkpoint model, what is the mechanism by which it preferentially arrests cancer cells?',
                  'options': ['It stabilises p53 by preventing MDM2-mediated degradation, restoring checkpoint function in TP53-mutant cells', 'It inhibits CDK1/Cyclin B complex formation, arresting cells at the G2/M checkpoint before mitosis', 'It prevents the G1→S transition by blocking Rb phosphorylation, exploiting the cancer cell’s reliance on hyperactive CDK4/6', 'It induces DNA double-strand breaks that trigger ATM-mediated apoptosis selectively in dividing cells'],
                  'correctIndex': 2,
                  'explanation': 'Palbociclib blocks Rb phosphorylation by CDK4/6, preventing the G1→S transition — cancer cells that rely heavily on hyperactive CDK4/6 signalling are preferentially arrested.',
                  'hashtags': ['Cell cycle'],
                },
                {
                  'id': 'cb-cc-4',
                  'prompt': 'DNA double-strand breaks are detected in a cell during G2 phase. Tracing the signalling cascade, which sequence of events most accurately describes the resulting cell cycle response?',
                  'options': ['CHK1/CHK2 → Bax activation → cytochrome c release → apoptosis without checkpoint signalling', 'ATM/ATR → CHK1/CHK2 phosphorylation → p53 activation → p21 upregulation → CDK1/Cyclin B inhibition', 'MDM2 → ARF activation → p16 upregulation → CDK4/6 inhibition → G1 arrest', 'ATM/ATR → direct Rb phosphorylation → E2F suppression → cyclin D degradation'],
                  'correctIndex': 1,
                  'explanation': 'ATM/ATR activate CHK1/CHK2, which activate p53 and upregulate p21, ultimately inhibiting CDK1/Cyclin B and arresting the cell at the G2/M checkpoint — the canonical DNA damage response to G2-phase breaks.',
                  'hashtags': ['Cell cycle'],
                },
                {
                  'id': 'cb-cc-5',
                  'prompt': 'A patient’s tumour cells have lost p53 function through mutation. Based on the cell cycle checkpoint and senescence models, which compensatory mechanism might still enforce cell cycle arrest in response to oncogene activation in these cells?',
                  'options': ['p16 upregulation via the ARF-independent pathway can inhibit CDK4/6 to maintain Rb in its hypophosphorylated, growth-suppressive state', 'CHK1 can directly substitute for p53 by upregulating p21 transcription through an alternative promoter element', 'MDM2 undergoes autoubiquitination in the absence of p53, spontaneously activating Bax to trigger apoptosis', 'Cyclin D levels fall in p53-null cells because p53 is required for cyclin D transcription in response to growth signals'],
                  'correctIndex': 0,
                  'explanation': 'p16 can be upregulated independently of the ARF/p53 axis, inhibiting CDK4/6 and keeping Rb hypophosphorylated — a backup route to arrest that doesn’t require functional p53.',
                  'hashtags': ['Cell cycle'],
                },
                {
                  'id': 'cb-cc-6',
                  'prompt': 'A cell is paused at the G1/S checkpoint because ATP levels are critically low. Which of the following best explains why this checkpoint prevents S phase entry under these conditions?',
                  'options': ['Low ATP activates TGFβ, which directly phosphorylates and inactivates CDK2', 'Mitochondrial dysfunction triggers p53 to permanently silence cyclin E expression', 'The cell lacks sufficient organelles and growth factor signalling to support replication', 'The DNA polymerase enzyme requires ATP to initiate replication forks'],
                  'correctIndex': 2,
                  'explanation': 'The G1/S checkpoint (restriction point) monitors whether the cell has adequate resources and growth-factor signalling to support replication before committing to S phase — not simply whether DNA polymerase itself has enough ATP to run.',
                  'hashtags': ['Cell cycle'],
                },
              ],
            },
            'cellularSenescence': {
              'label': 'Cellular senescence & SASP',
              'images': [],
              'description': 'Senescence is a stable, largely irreversible cell cycle arrest distinct from quiescence or apoptosis — senescent cells remain metabolically active and secrete a senescence-associated secretory phenotype (SASP) that can be tumour-suppressing or tumour-promoting depending on context.',
              'mechanism': 'Replicative senescence (the Hayflick limit) and stress/oncogene-induced senescence both converge on stable CDK inhibition. SASP factors like IL-6, IL-8 and MMPs can reinforce arrest and recruit immune clearance, or — in a chronic tumour microenvironment — drive angiogenesis, immune evasion and EMT instead. SA-β-galactosidase activity at pH 6 (reflecting increased lysosomal content) is the classic senescence marker.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Senescence'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'cb-sen-1',
                  'prompt': 'A clinician considers two therapeutic strategies for a solid tumour: (1) administering a CDK4/6 inhibitor alone, or (2) combining a pro-senescence drug with a subsequent senolytic agent. What is the key mechanistic advantage of the combination "one-two punch" strategy?',
                  'options': ['The pro-senescence drug first arrests cancer cells by inducing senescence, and the senolytic agent then selectively eliminates those arrested cells by targeting their anti-apoptotic proteins', 'The CDK4/6 inhibitor induces SASP to attract immune cells, while the senolytic agent blocks the immune-mediated inflammation that would otherwise harm normal tissue', 'The first drug stabilises p53 to trigger apoptosis in rapidly dividing cells, while the second drug prevents re-entry into G1 by senescent cells that survived the first treatment', 'The pro-senescence drug methylates tumour suppressor genes to permanently silence cyclin expression, and the senolytic eliminates cells with residual CDK activity'],
                  'correctIndex': 0,
                  'explanation': 'The pro-senescence drug arrests cancer cells by driving them into senescence; the senolytic then selectively kills those senescent cells by targeting the anti-apoptotic proteins (e.g. BCL-2 family) they depend on to survive.',
                  'hashtags': ['Senescence'],
                },
                {
                  'id': 'cb-sen-2',
                  'prompt': 'A senescent tumour cell is characterised by elevated SASP factor secretion, including IL-6, IL-8, and MMPs. In what scenario would this SASP profile be considered tumour-promoting rather than tumour-suppressing?',
                  'options': ['When SASP factors activate p53 in adjacent stromal cells, spreading cell cycle arrest to pre-cancerous populations', 'When SASP factors recruit immune cells that clear surrounding pre-malignant cells and reinforce senescence in neighbouring cancer cells', 'When IL-6 and IL-8 upregulate angiogenesis, suppress immune surveillance, and promote epithelial-to-mesenchymal transition in nearby cancer cells', 'When MMPs degrade senescent cell membranes, triggering Bax-mediated apoptosis and reducing the senescent cell burden'],
                  'correctIndex': 2,
                  'explanation': 'When IL-6/IL-8 drive angiogenesis, suppress immune surveillance and promote EMT in neighbouring cancer cells, the SASP shifts from tumour-suppressing (paracrine senescence, immune clearance) to tumour-promoting.',
                  'hashtags': ['Senescence'],
                },
                {
                  'id': 'cb-sen-3',
                  'prompt': 'A tissue sample from an elderly patient shows strongly positive SA-β-galactosidase staining in a subset of cells. Why is this marker considered indicative of cellular senescence rather than another cell state?',
                  'options': ['Increased lysosomal content and activity in senescent cells leads to detectable β-galactosidase activity at pH 6, distinguishing them from proliferating or apoptotic cells', 'SA-β-galactosidase is a cell surface receptor upregulated specifically by p16 in response to telomere shortening', 'The enzyme is released into the extracellular matrix as part of SASP and stains the surrounding stromal tissue rather than the senescent cell itself', 'β-galactosidase activity at neutral pH reflects mitochondrial dysfunction unique to oncogene-induced senescence only'],
                  'correctIndex': 0,
                  'explanation': 'Senescent cells have markedly increased lysosomal content, producing detectable β-galactosidase activity at the non-physiological pH of 6 — distinguishing SA-β-gal from ordinary lysosomal β-gal (active at pH 4) and from proliferating or apoptotic cells.',
                  'hashtags': ['Senescence'],
                },
                {
                  'id': 'cb-sen-4',
                  'prompt': 'A fibroblast culture reaches the Hayflick Limit after approximately 50 population doublings and enters Phase III. Which description best characterises the fate of these cells?',
                  'options': ['They dedifferentiate into a stem-like state and resume proliferation once culture conditions are optimised', 'They enter G0 quiescence and can re-enter the cell cycle in response to appropriate growth factor stimulation', 'They enter stable cell cycle arrest but remain metabolically active, continuing to secrete cytokines and growth factors', 'They undergo rapid apoptosis triggered by critically short telomeres activating the intrinsic mitochondrial pathway'],
                  'correctIndex': 2,
                  'explanation': 'Cells at the Hayflick Limit enter replicative senescence: a stable, largely irreversible cell cycle arrest, but they remain metabolically active and continue secreting SASP factors — distinct from reversible quiescence or apoptosis.',
                  'hashtags': ['Senescence'],
                },
              ],
            },
            'stemCellPotencyAndLineage': {
              'label': 'Stem cell potency & lineage tracing',
              'images': [],
              'description': 'Stem and progenitor cells are classified by their differentiation potential — totipotent, pluripotent, or multipotent — and their developmental history can be reconstructed using lineage-tracing tools like Cre-LoxP or single-cell sequencing.',
              'mechanism': 'The zygote is totipotent (can form any cell type, including extraembryonic tissue); inner cell mass cells are pluripotent (any somatic/germ cell, but not extraembryonic tissue); adult tissue stem cells are typically multipotent with more limited self-renewal. Lineage tracing (e.g. Cre-LoxP reporters, or retrospective reconstruction from sequencing data) reveals how a single labelled cell’s progeny populate a tissue or tumour over time.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Stem cells'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'cb-stem-1',
                  'prompt': 'An experiment uses single-cell RNA sequencing on tumour biopsies before and after chemotherapy to reconstruct a cell lineage tree. What specific question does this retrospective lineage tracing approach help answer?',
                  'options': ['Whether the tumour originated from a single pluripotent cell in the embryonic inner cell mass', 'Which transcription factors must be activated to reprogram tumour cells into iPSCs for immune therapy', 'How many distinct germ layers contributed progenitor cells to the original tumour microenvironment', 'How subclones within the tumour acquired drug resistance mutations across successive rounds of division'],
                  'correctIndex': 3,
                  'explanation': 'Reconstructing a lineage tree from before/after-chemotherapy biopsies is used to trace how resistant subclones emerged and expanded across successive divisions during treatment.',
                  'hashtags': ['Stem cells'],
                },
                {
                  'id': 'cb-stem-2',
                  'prompt': 'A zygote undergoes its first cleavage divisions to form a blastocyst. How does the differentiation potential of the inner cell mass cells compare to those of the totipotent zygote?',
                  'options': ['Inner cell mass cells are unipotent, committed exclusively to the ectoderm lineage at this stage of development', 'Inner cell mass cells are pluripotent, able to form any somatic or germ cell type but unable to generate extraembryonic tissues', 'Inner cell mass cells remain totipotent because they retain all the same gene expression patterns as the original zygote', 'Inner cell mass cells are multipotent, already restricted to generating cells from a single germ layer lineage'],
                  'correctIndex': 1,
                  'explanation': 'Inner cell mass cells are pluripotent: they can generate any somatic or germ cell type, but — unlike the totipotent zygote — they can no longer form extraembryonic tissues such as the trophoblast.',
                  'hashtags': ['Stem cells'],
                },
                {
                  'id': 'cb-stem-3',
                  'prompt': 'During embryonic development, neural progenitor cells commit to a neuronal lineage and progressively lose the ability to generate glial cells. Which combination of molecular mechanisms best explains this irreversible lineage restriction?',
                  'options': ['Neurons undergo permanent cell cycle exit because CDK inhibitors like p21 degrade the totipotency factors Oct4, Sox2, and Nanog', 'Environmental signals from neighbouring cells suppress all transcription factor activity, leaving only constitutively expressed structural genes active in terminally differentiated neurons', 'DNA replication errors during rapid neuronal division introduce targeted mutations that permanently disrupt genes required for glial cell differentiation', 'Transcription factors such as NeuroD activate neuronal gene programmes while epigenetic silencing via histone methylation stably represses genes associated with alternative lineages'],
                  'correctIndex': 3,
                  'explanation': 'Lineage-specifying transcription factors like NeuroD activate the neuronal programme, while epigenetic silencing (e.g. histone methylation) stably represses genes for alternative lineages such as glia — the standard model of irreversible lineage restriction.',
                  'hashtags': ['Stem cells'],
                },
                {
                  'id': 'cb-stem-4',
                  'prompt': 'A Cre-LoxP system is used to label intestinal stem cells in a mouse with a fluorescent reporter. Weeks later, entire crypts contain fluorescently labelled cells. What does this finding most directly demonstrate?',
                  'options': ['The labelled stem cell underwent clonal expansion, giving rise to all differentiated daughter cells within that crypt', 'The reporter gene was transferred horizontally between neighbouring cells via gap junctions', 'All intestinal cells dedifferentiated back to a stem-like state following Cre recombinase activation', 'The lineage is invariant in vertebrates, following the same fixed division pattern as observed in C. elegans'],
                  'correctIndex': 0,
                  'explanation': 'A single labelled stem cell clonally expanded, its progeny eventually populating (and “winning” neutral drift within) the entire crypt — vertebrate intestinal lineages are stochastic, not fixed like C. elegans.',
                  'hashtags': ['Stem cells'],
                },
                {
                  'id': 'cb-stem-5',
                  'prompt': 'A researcher characterises a population of adult bone marrow stem cells and a population of embryonic stem cells. Which combination of features would correctly distinguish them?',
                  'options': ['Adult stem cells can be reprogrammed into iPSCs using Yamanaka factors; ESCs require somatic cell nuclear transfer for reprogramming', 'Adult stem cells are multipotent with limited self-renewal; ESCs are pluripotent, long-term culturable, and express Nanog, Oct4, and Sox2', 'Adult stem cells express Oct4 and Sox2 but lack Nanog; ESCs are totipotent and can generate extraembryonic structures', 'Adult stem cells are pluripotent but harder to culture; ESCs are multipotent and pose a higher tumour formation risk'],
                  'correctIndex': 1,
                  'explanation': 'Adult (e.g. bone marrow) stem cells are multipotent with limited self-renewal capacity; embryonic stem cells are pluripotent, can be cultured long-term, and characteristically express Nanog, Oct4 and Sox2.',
                  'hashtags': ['Stem cells'],
                },
              ],
            },
          },
        },
        'pharmacologyHistory': {
          'label': 'Pharmacology History',
          'icon': '📜',
          'color': '#818cf8', // was a magenta close enough to 'pharmacology's red-pink to be
                               // hard to tell apart for red-green colorblind players -- moved
                               // to indigo, clearly distinct from every other MEDS3002 topic color
          'items': {
            'historyOfPharmacology': {
              'label': 'History of pharmacology & pharmacognosy',
              'images': [],
              'description': 'Pharmacology traces back to ancient plant- and mineral-based remedies (the Ebers Papyrus, Galen’s theriac, digitalis, quinine, belladonna) and legal codes governing medical practice, through to the extraction and isolation of active compounds that enabled standardised, modern drug development.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['History'],
              'course': 'MEDS3002',
              'questions': [
                {
                  'id': 'ph-hist-1',
                  'prompt': 'The Ebers Papyrus, containing hundreds of pharmaceutical preparations, originated from which civilisation?',
                  'options': ['Mesopotamia', 'Ayurvedic India', 'Ancient Egypt', 'Ancient Greece'],
                  'correctIndex': 2,
                  'explanation': 'The Ebers Papyrus is one of the oldest and most important medical texts, originating from Ancient Egypt.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-2',
                  'prompt': 'William Harvey’s 1628 publication challenged Galenic medicine by proposing what?',
                  'options': ['The liver converts food directly into vital spirit', 'Anatomy is sufficient to explain and cure all disease', 'Blood circulates as a closed system driven by the heart', 'Disease is caused by imbalance of four humours'],
                  'correctIndex': 2,
                  'explanation': 'Harvey’s De Motu Cordis proposed that blood circulates in a closed system driven by the heart, overturning centuries of Galenic humoral theory.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-3',
                  'prompt': 'The thalidomide disaster of 1961 most directly led to which regulatory development?',
                  'options': ['The establishment of Phase I trials in healthy volunteers', 'Strengthened requirements for preclinical safety testing and pharmacovigilance', 'A global ban on using pregnant women as clinical trial participants', 'Mandatory post-marketing surveillance for all approved drugs'],
                  'correctIndex': 1,
                  'explanation': 'The thalidomide disaster led directly to strengthened preclinical safety testing requirements (including teratogenicity testing) and modern pharmacovigilance systems.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-4',
                  'prompt': 'The global consensus supporting animal testing before human trials was reinforced historically by which two key events?',
                  'options': ['The discovery of penicillin and the development of recombinant insulin', 'The Opium Wars and the introduction of laudanum', 'The 1937 Elixir Sulfanilamide poisoning and the 1950s–60s thalidomide disaster', 'The Nazi human experiments and the Tuskegee Syphilis study'],
                  'correctIndex': 2,
                  'explanation': 'The 1937 Elixir Sulfanilamide poisoning (leading to the 1938 FD&C Act) and the thalidomide disaster (leading to the 1962 Kefauver-Harris Amendment) are the two events most directly credited with cementing mandatory preclinical animal safety testing.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-5',
                  'prompt': 'Coca-Cola was originally invented as a non-alcoholic alternative to coca wine by:',
                  'options': ['Galen, who developed complex multi-ingredient remedies', 'John Pemberton, an American pharmacist, in 1886', 'William Withering, who also studied digitalis', 'Sigmund Freud, who promoted cocaine therapeutically'],
                  'correctIndex': 1,
                  'explanation': 'Coca-Cola was invented in 1886 by John Pemberton, an American pharmacist, as a non-alcoholic alternative to coca wine.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-6',
                  'prompt': 'Digitalis purpurea was first used clinically by Dr William Withering in the late 18th century to treat which condition?',
                  'options': ['Pupil dilation for ophthalmic examination', 'Pain relief and anaesthesia during surgery', 'Dropsy, which is oedema associated with heart failure', 'Malaria and intermittent fevers'],
                  'correctIndex': 2,
                  'explanation': 'Withering used digitalis (foxglove) to treat dropsy — oedema associated with heart failure — establishing it as a cardiac drug.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-7',
                  'prompt': 'Galen’s remedy "theriac", described as a universal remedy, contained approximately how many powdered ingredients?',
                  'options': ['120', '73', '12', '45'],
                  'correctIndex': 1,
                  'explanation': 'Theriac was a complex polypharmacy remedy historically described as containing around 70 or so ingredients.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-8',
                  'prompt': 'Belladonna (Atropa belladonna) was traditionally used for which purpose, and which active compound was later isolated from it?',
                  'options': ['Fever treatment; quinine', 'Pain relief; morphine', 'Heart failure; digoxin', 'Pupil dilation; atropine'],
                  'correctIndex': 3,
                  'explanation': 'Belladonna (“beautiful lady”) was traditionally used to dilate pupils; atropine was later isolated as its active compound.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-9',
                  'prompt': 'Which ancient legal code set fees for medical services and punishments for surgical malpractice?',
                  'options': ['Hippocratic Oath', 'Ebers Papyrus', 'Edwin Smith Papyrus', 'Code of Hammurabi'],
                  'correctIndex': 3,
                  'explanation': 'The Code of Hammurabi famously set fees for surgeons and punishments for malpractice, among the earliest known medical regulation.',
                  'hashtags': ['History'],
                },
                {
                  'id': 'ph-hist-10',
                  'prompt': 'Which plant is the original source of quinine, used to treat malaria?',
                  'options': ['Cinchona bark', 'Opium poppy', 'Belladonna', 'Digitalis purpurea'],
                  'correctIndex': 0,
                  'explanation': 'Quinine was originally isolated from the bark of the Cinchona tree.',
                  'hashtags': ['History'],
                },
              ],
            },
            'clinicalTrialPhases': {
              'label': 'Clinical trial phases & drug development',
              'images': [],
              'description': 'Drug development proceeds through preclinical testing and four clinical trial phases — Phase I (safety/dosing in healthy volunteers), Phase II (efficacy signal in patients), Phase III (comparative efficacy in large randomised populations), and Phase IV (post-marketing surveillance) — each with a different population, design, and primary question.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Clinical trials'],
              'course': 'MEDS3002',
              'class': 'L35',
              'questions': [
                {
                  'id': 'ph-ct-1',
                  'prompt': 'The NCI-CTCAE grading system classifies toxicity on a scale where Grade 4 is defined as:',
                  'options': ['Moderate, requiring monitoring and possible intervention', 'Mild, requiring no intervention', 'Life-threatening, requiring hospitalisation and cessation of chemotherapy', 'Severe, requiring intervention and possible pause of chemotherapy'],
                  'correctIndex': 2,
                  'explanation': 'CTCAE Grade 4 toxicity is life-threatening, requiring hospitalisation and cessation of chemotherapy (Grade 3 is severe, Grade 2 moderate, Grade 1 mild).',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-2',
                  'prompt': 'What proportion of drugs typically fail to progress past Phase I?',
                  'options': ['Approximately 50%', 'Approximately 10%', 'Approximately 75%', 'Approximately 25%'],
                  'correctIndex': 3,
                  'explanation': 'A substantial minority of drugs entering Phase I fail to progress, commonly cited at around 25% — lower than the attrition seen in later, efficacy-driven phases.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-3',
                  'prompt': 'Phase II trials are typically conducted in which population and using which design?',
                  'options': ['More than 10000 unselected people post-approval', 'Up to 1000 people with disease, mostly double-blind placebo-controlled', '100 healthy volunteers, open-label single arm', '1000 to 10000 people with a defined condition, randomised against best available drug'],
                  'correctIndex': 1,
                  'explanation': 'Phase II trials are conducted in up to around 1000 patients with the disease of interest, typically double-blind and placebo-controlled, to establish an efficacy signal.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-4',
                  'prompt': 'The primary question addressed in a Phase I clinical trial is:',
                  'options': ['Is this drug more effective than the current best treatment?', 'Does this drug produce a measurable therapeutic response in patients with the disease?', 'Does this drug work in an unselected real-world population?', 'Will this drug hurt the patient, and what is a safe dose?'],
                  'correctIndex': 3,
                  'explanation': 'Phase I trials, usually in healthy volunteers, primarily establish safety and a safe dosing range.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-5',
                  'prompt': 'Randomisation in a clinical trial primarily serves to:',
                  'options': ['Ensure all participants experience the experimental treatment at some point', 'Reduce bias and ensure experimental and control groups are similar at baseline', 'Guarantee a statistically significant result with a smaller sample size', 'Allow researchers to know which treatment each participant is receiving'],
                  'correctIndex': 1,
                  'explanation': 'Randomisation reduces bias and helps ensure the treatment and control groups are comparable at baseline.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-6',
                  'prompt': 'In cancer clinical trials, Objective Response Rate (ORR) is defined as:',
                  'options': ['The time from treatment initiation to disease progression', 'The percentage of patients alive at a defined time point after treatment', 'The proportion of patients experiencing any grade of adverse drug reaction', 'The proportion of patients achieving a defined degree of tumour shrinkage'],
                  'correctIndex': 3,
                  'explanation': 'ORR is the proportion of patients whose tumour shrinks by a defined amount (complete or partial response), distinct from progression-free survival, overall survival, or toxicity measures.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-7',
                  'prompt': 'Phase III trials differ from Phase II trials primarily in that they:',
                  'options': ['Compare the drug against the best available treatment or placebo in 1000 to 10000 patients', 'Test safety and dose for the first time in healthy volunteers', 'Evaluate long-term safety in unselected real-world populations after drug approval', 'Focus exclusively on pharmacokinetic parameters such as half-life and bioavailability'],
                  'correctIndex': 0,
                  'explanation': 'Phase III trials compare the drug against the best available treatment (or placebo) in a much larger population — typically 1000 to 10000 patients — than Phase II.',
                  'hashtags': ['Clinical trials'],
                },
                {
                  'id': 'ph-ct-8',
                  'prompt': 'The post-marketing surveillance finding that serious adverse drug reactions account for approximately 5% of hospital-related deaths illustrates the importance of:',
                  'options': ['Replacing randomised controlled trials with real-world observational data', 'Phase IV studies and voluntary reporting systems to detect rare or delayed toxicities', 'Stricter eligibility criteria in Phase III trials to exclude high-risk patients', 'Requiring all drugs to undergo a second Phase II trial after approval'],
                  'correctIndex': 1,
                  'explanation': 'This statistic underscores why Phase IV post-marketing surveillance and voluntary adverse-event reporting matter — rare or delayed toxicities often only surface once a drug reaches a much larger, more diverse real-world population.',
                  'hashtags': ['Clinical trials'],
                },
              ],
            },
            'animalResearchEthics': {
              'label': 'Animal research ethics & the 3 Rs',
              'images': [],
              'description': 'Animal research is governed by the 3 Rs framework (Replace, Reduce, Refine) and, in Australia, by Animal Ethics Committees with defined member categories; newer approach methodologies (NAMs) are progressively replacing some animal use in specific domains like ADME and genotoxicity testing.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Animal ethics'],
              'course': 'MEDS3002',
              'class': 'L36',
              'questions': [
                {
                  'id': 'ph-ae-1',
                  'prompt': 'The 3 Rs framework in animal research ethics consists of:',
                  'options': ['Replace, Refine, Reduce', 'Research, Regulate, Report', 'Randomise, Record, Review', 'Restrict, Replicate, Reassess'],
                  'correctIndex': 0,
                  'explanation': 'The 3 Rs — Replace, Reduce, Refine — form the core ethical framework for animal research, first proposed by Russell and Burch.',
                  'hashtags': ['Animal ethics'],
                },
                {
                  'id': 'ph-ae-2',
                  'prompt': 'The "Replace" component of the 3 Rs is best exemplified by:',
                  'options': ['Using cell-based assays or computer modelling instead of live animals for initial screening', 'Using anaesthesia to minimise pain during surgical procedures in animals', 'Designing experiments with the minimum number of animals needed for statistical power', 'Administering post-operative analgesics to reduce animal suffering'],
                  'correctIndex': 0,
                  'explanation': '"Replace" means substituting animal use with non-animal methods such as cell-based assays or computational modelling where possible.',
                  'hashtags': ['Animal ethics'],
                },
                {
                  'id': 'ph-ae-3',
                  'prompt': 'New Approach Methodologies (NAMs) currently have greatest validated application in which areas of preclinical testing?',
                  'options': ['Immunogenicity testing of biological medicines', 'ADME, safety pharmacology, and genotoxicity', 'Efficacy validation in complex disease models', 'Long-term chronic toxicity studies'],
                  'correctIndex': 1,
                  'explanation': 'NAMs (in vitro/in silico methods) are currently most validated and established for ADME, safety pharmacology, and genotoxicity testing.',
                  'hashtags': ['Animal ethics'],
                  'class': 'L37',
                },
                {
                  'id': 'ph-ae-4',
                  'prompt': 'In the Australian Animal Ethics Committee structure, a Category C member is defined as:',
                  'options': ['A layperson representing the general community', 'An animal welfare advocate with no institutional affiliation', 'A veterinarian with expertise in the species being used', 'A researcher with active animal experimentation experience'],
                  'correctIndex': 1,
                  'explanation': 'Category C members are people committed to animal welfare who are not involved in animal experimentation — distinct from the Category A vet, Category B experienced researcher, and Category D independent community layperson.',
                  'hashtags': ['Animal ethics'],
                },
                {
                  'id': 'ph-ae-5',
                  'prompt': 'hACE2 transgenic mice were developed specifically to:',
                  'options': ['Model cardiovascular disease for antihypertensive drug testing', 'Study oral drug pharmacokinetics in a human-like GI environment', 'Replace non-rodent models in regulatory toxicology studies', 'Make mice susceptible to SARS-CoV-2 infection for COVID-19 drug research'],
                  'correctIndex': 3,
                  'explanation': 'Ordinary mice don’t express a form of ACE2 that SARS-CoV-2 can use to enter cells; hACE2 transgenic mice express the human receptor, making them susceptible to infection for COVID-19 research.',
                  'hashtags': ['Animal ethics'],
                },
              ],
            },
            'drugDiscoveryAndRegulation': {
              'label': 'Drug discovery, regulation & personalised medicine',
              'images': [],
              'description': 'Modern drug discovery moved from crude plant extracts to isolated, chemically modifiable compounds, computational prediction of activity (QSAR), and genetically tailored dosing (pharmacogenomics) — all overseen by national regulatory and reimbursement bodies.',
              'mechanism': '',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Regulation'],
              'course': 'MEDS3002',
              'class': 'L34',
              'questions': [
                {
                  'id': 'ph-dd-1',
                  'prompt': 'In the context of enzyme pharmacology, an antagonist differs from an agonist in that an antagonist:',
                  'options': ['Increases enzyme activity by stabilising the active conformation', 'Occupies the receptor without activating it, blocking agonist activation', 'Binds irreversibly to the active site of an enzyme, preventing substrate binding', 'Mimics the natural ligand and produces a full pharmacological response'],
                  'correctIndex': 1,
                  'explanation': 'An antagonist occupies the receptor without activating it, thereby blocking activation by an agonist — the defining distinction from an agonist.',
                  'hashtags': ['Regulation'],
                },
                {
                  'id': 'ph-dd-2',
                  'prompt': 'Extraction of active compounds from plant remedies was significant because it enabled:',
                  'options': ['Standardised dosing, chemical synthesis, and therapeutic modification at scale', 'Direct clinical use without the need for preclinical testing', 'Replacement of all animal models with in vitro assays', 'Identification of genetic variants affecting drug metabolism'],
                  'correctIndex': 0,
                  'explanation': 'Isolating the active compound from a crude plant extract enabled standardised dosing, chemical synthesis, and further therapeutic modification — a major step in modern pharmacology.',
                  'hashtags': ['Regulation'],
                },
                {
                  'id': 'ph-dd-3',
                  'prompt': 'Pharmacogenomics aims to improve drug therapy primarily by:',
                  'options': ['Tailoring drug choice and dosage to an individual’s genetic makeup', 'Using recombinant bacteria to produce insulin at scale', 'Applying computer modelling to identify receptor binding sites', 'Replacing crude plant extracts with isolated active compounds'],
                  'correctIndex': 0,
                  'explanation': 'Pharmacogenomics tailors drug choice and dosage to an individual’s genetic makeup, aiming to improve efficacy and reduce adverse effects.',
                  'hashtags': ['Regulation'],
                },
                {
                  'id': 'ph-dd-4',
                  'prompt': 'In Quantitative Structure-Activity Relationships (QSAR), mathematical equations are used to:',
                  'options': ['Classify toxicity severity according to organ system affected', 'Model three-dimensional protein folding using AI', 'Predict drug activity for unsynthesised compounds based on molecular structure', 'Determine the optimal dosing interval from pharmacokinetic data'],
                  'correctIndex': 2,
                  'explanation': 'QSAR uses mathematical models relating molecular structure to biological activity, allowing prediction of activity for compounds that haven’t even been synthesised yet.',
                  'hashtags': ['Regulation'],
                },
                {
                  'id': 'ph-dd-5',
                  'prompt': 'In Australia, the body responsible for deciding which medicines are listed on the Pharmaceutical Benefits Scheme is the:',
                  'options': ['NHMRC (National Health and Medical Research Council)', 'ARTG (Australian Register of Therapeutic Goods)', 'PBAC (Pharmaceutical Benefits Advisory Committee)', 'TGA (Therapeutic Goods Administration)'],
                  'correctIndex': 2,
                  'explanation': 'The PBAC (Pharmaceutical Benefits Advisory Committee) recommends which medicines are listed on Australia’s PBS — distinct from the TGA, which handles approval/registration.',
                  'hashtags': ['Regulation'],
                },
              ],
            },
          },
        },
      },
    },
    'MEDS2003': {
      'label': 'MEDS2003',
      'icon': '🧪',
      'blurb': 'Biochemistry',
      'topics': {
        'metabolism': {
          'label': 'Metabolism',
          'icon': '🔥',
          'color': '#ffd23f',
          'items': {
            'warburgeffect': {
              'label': 'The Warburg effect',
              'images': [],
              'description': 'Cancer cells (and this game\'s namesake) often ferment glucose to lactate for energy even when oxygen is available.',
              'mechanism': 'Aerobic glycolysis is faster but far less ATP-efficient per glucose molecule than oxidative phosphorylation — a trade favouring rapid proliferation over efficiency.',
              'funFacts': ['Named after Otto Warburg, who first described it in the 1920s.', 'Basis for FDG-PET scans, which locate tumours by their glucose hunger.'],
              'refs': [],
              'hashtags': ['Metabolism'],
              'course': 'MEDS2003',
              'class': 'L1',
              'questions': [
                {
                  'id': 'bm1',
                  'prompt': 'The Warburg effect describes cancer cells preferentially using which pathway for energy, even with oxygen present?',
                  'options': ['Aerobic glycolysis (fermentation to lactate)', 'Oxidative phosphorylation only', 'Beta-oxidation of fatty acids', 'The urea cycle'],
                  'correctIndex': 0,
                  'explanation': 'Cancer cells often ferment glucose to lactate even when oxygen is available, trading efficiency for speed — the Warburg effect.',
                  'hashtags': ['Metabolism'],
                },
              ],
            },
            'gluconeogenesis': {
              'label': 'Gluconeogenesis',
              'images': [],
              'description': 'The synthesis of new glucose from non-carbohydrate precursors (lactate, glycerol, amino acids), mainly in the liver.',
              'mechanism': 'Largely reverses glycolysis but bypasses its three irreversible steps using distinct enzymes (e.g. PEPCK, fructose-1,6-bisphosphatase, glucose-6-phosphatase).',
              'funFacts': ['Essential during fasting to maintain blood glucose once glycogen stores run low.'],
              'refs': [],
              'hashtags': ['Fasting state'],
              'course': 'MEDS2003',
              'class': 'L6',
              'questions': [
                {
                  'id': 'bm2',
                  'prompt': 'Gluconeogenesis mainly takes place in which organ?',
                  'options': ['Liver', 'Skeletal muscle', 'Adipose tissue', 'Lungs'],
                  'correctIndex': 0,
                  'explanation': 'The liver is the primary site of gluconeogenesis, maintaining blood glucose during fasting.',
                  'hashtags': ['Fasting state'],
                },
              ],
            },
          },
        },
        'molecularBiology': {
          'label': 'Molecular Biology',
          'icon': '🔬',
          'color': '#7cff6b',
          'items': {
            'transcriptionbasics': {
              'label': 'Transcription (overview)',
              'images': [],
              'description': 'RNA polymerase synthesises an RNA copy of a DNA template, the first step of gene expression.',
              'mechanism': 'Initiation, elongation, and termination phases; in eukaryotes, RNA Pol II requires general transcription factors to assemble at the promoter.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Transcription'],
              'course': 'MEDS2003',
              'class': 'L25',
              'questions': [
                {
                  'id': 'mb1',
                  'prompt': 'Which enzyme synthesises the RNA copy of a DNA template during transcription?',
                  'options': ['RNA polymerase', 'DNA polymerase', 'Reverse transcriptase', 'Helicase'],
                  'correctIndex': 0,
                  'explanation': 'RNA polymerase reads the DNA template strand and synthesises a complementary RNA strand.',
                  'hashtags': ['Transcription'],
                },
              ],
            },
          },
        },
      },
    },
    'MEDS3003': {
      'label': 'MEDS3003',
      'icon': '🧫',
      'blurb': 'Nanomedicine & Drug Delivery',
      'topics': {
        'nanoparticleDelivery': {
          'label': 'Nanoparticle Delivery',
          'icon': '🔬',
          'color': '#e879f9',
          'items': {
            'ddsRequirements': {
              'label': 'Ideal drug delivery system (DDS) design goals',
              'images': [],
              'description': 'An ideal DDS should deliver its therapeutic cargo specifically to the target site, evade the immune system long enough to get there, and release its cargo only when triggered by the right stimulus.',
              'mechanism': 'Three linked properties: site-specific delivery (targeting), escape from recognition and premature degradation by immune defences (stealth), and controlled release of cargo upon selective stimuli (triggered release).',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Drug Delivery'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-dds-1',
                  'prompt': 'Which set of properties describes what an ideal drug delivery system (DDS) is meant to achieve?',
                  'options': ['Site-specific delivery, immune evasion, and stimuli-triggered release', 'Maximum particle size, rapid immune clearance, and continuous passive release', 'Broad biodistribution, strong immune activation, and irreversible cargo binding', 'Renal filtration, protein denaturation, and pH-independent release'],
                  'correctIndex': 0,
                  'explanation': 'A DDS is designed to reach its target, avoid being cleared or degraded by the immune system before it gets there, and only release its drug once triggered by a selective stimulus (e.g. pH, temperature, enzymes).',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-dds-2',
                  'prompt': "Why does a drug delivery system need to 'escape recognition' by the body's immune defences?",
                  'options': ["So it isn't prematurely degraded before it reaches its target", 'So it can trigger a stronger inflammatory response at the target site', 'So it binds irreversibly to circulating immune cells', 'So it increases its own molecular weight during circulation'],
                  'correctIndex': 0,
                  'explanation': "If immune defences recognise and degrade the carrier too early, the therapeutic cargo never reaches its intended site — stealth from immune recognition is what keeps it circulating long enough to work.",
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'endocytosisPathways': {
              'label': 'Nanoparticle cellular uptake routes',
              'images': [],
              'description': 'Cells take up nanoparticles through several distinct endocytosis pathways, each using different membrane machinery.',
              'mechanism': 'Caveolin-mediated endocytosis uses caveolin-coated pits (caveolae); clathrin-mediated endocytosis uses clathrin-coated pits that form clathrin-coated vesicles; (receptor-)independent endocytosis and pinocytosis take up material without these specific coat proteins.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Cell Biology'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-endo-1',
                  'prompt': 'Which two named coat proteins form the pits that mediate two of the main nanoparticle endocytosis routes?',
                  'options': ['Caveolin and clathrin', 'Actin and myosin', 'Collagen and elastin', 'Tubulin and dynein'],
                  'correctIndex': 0,
                  'explanation': 'Caveolin-mediated and clathrin-mediated endocytosis are named for the coat proteins (caveolin, clathrin) that form the membrane pits used to internalise the particle.',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-endo-2',
                  'prompt': 'Pinocytosis, as a route of nanoparticle cellular uptake, is best described as:',
                  'options': ['Non-specific fluid-phase uptake without a distinct receptor or coat protein', 'A process that only occurs in the nucleus', 'Uptake that requires the particle to first bind a caveolin receptor', 'A route exclusive to particles larger than 1 micron'],
                  'correctIndex': 0,
                  'explanation': "Pinocytosis is essentially 'cell drinking' — non-specific fluid uptake into small vesicles, without the receptor-specific or coat-protein machinery that clathrin/caveolin routes use.",
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'protonSpongeEffect': {
              'label': 'Endosomal escape via the proton sponge effect',
              'images': [],
              'description': 'Ionizable nanoparticles can escape the endosome before being degraded in the lysosome, by exploiting the endosome\'s own acidification process.',
              'mechanism': "As an early endosome matures into a late endosome, it acidifies. An ionizable nanoparticle buffers this acidification, drawing in extra protons and counter-ions, which causes osmotic swelling and eventual rupture of the endosomal membrane — releasing the nanoparticle into the cytoplasm. A non-responsive nanoparticle lacks this buffering capacity and instead proceeds to the lysosome, where enzymes degrade it.",
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Cell Biology'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-sponge-1',
                  'prompt': 'What ultimately allows an ionizable nanoparticle to escape the endosome instead of being degraded in the lysosome?',
                  'options': ['Its buffering causes osmotic swelling that ruptures the endosomal membrane', 'It actively binds and destroys lysosomal enzymes', 'It is too large to be enclosed by the endosomal membrane in the first place', 'It reverses the direction of vesicle trafficking back to the cell surface'],
                  'correctIndex': 0,
                  'explanation': "This is the 'proton sponge effect' — the ionizable particle absorbs protons (and water, osmotically) as the endosome acidifies, swelling it until the membrane ruptures and releases the cargo into the cytoplasm.",
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-sponge-2',
                  'prompt': 'What is the eventual fate of a NON-responsive nanoparticle that lacks the proton sponge effect?',
                  'options': ['It proceeds through the late endosome into the lysosome, where it is degraded', 'It immediately escapes into the nucleus', 'It is exocytosed back into the extracellular fluid unchanged', 'It triggers osmotic swelling identical to an ionizable particle'],
                  'correctIndex': 0,
                  'explanation': 'Without buffering capacity to trigger osmotic swelling, a non-responsive nanoparticle simply follows the default endocytic route — early endosome to late endosome to lysosome, where enzymes degrade it.',
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'npPhysicochemicalFactors': {
              'label': 'Nanoparticle physicochemical properties and biological fate',
              'images': [],
              'description': "A nanoparticle's size, shape, surface charge, and coating all influence how it behaves in the body — from crossing blood vessel walls to penetrating mucus.",
              'mechanism': 'Size and shape affect extravasation out of leaky tumour vasculature and clearance by immune cells; surface charge affects clearance and interaction with negatively-charged mucus; coating (e.g. a stealth layer) and active targeting ligands can reduce clearance and improve accumulation at the target tissue.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-phys-1',
                  'prompt': 'A neutral, small (roughly 20-150 nm) nanoparticle is generally favoured for tumour delivery mainly because:',
                  'options': ['That size range balances escaping rapid clearance while still being small enough to extravasate through leaky tumour vessels', 'It guarantees complete immune invisibility regardless of coating', 'Particles in this range cannot be taken up by any cell type', 'It is the only size range capable of crossing mucus layers'],
                  'correctIndex': 0,
                  'explanation': 'Very large particles (>150 nm) tend to be cleared or fail to extravasate well, while very small particles (<5 nm) may be rapidly filtered out; the ~20-150 nm range is generally the sweet spot for exploiting leaky tumour vasculature.',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-phys-2',
                  'prompt': 'Why might a positively charged nanoparticle be cleared from circulation faster than a neutral one?',
                  'options': ['Positive charge favours non-specific interactions with negatively charged serum proteins and cell surfaces, promoting clearance', 'Positive charge makes particles invisible to macrophages', 'Positive charge prevents any interaction with blood vessel walls', 'Positive charge is required for mucus penetration and therefore extends circulation time'],
                  'correctIndex': 0,
                  'explanation': 'Charged (particularly positively charged) surfaces tend to non-specifically bind serum proteins and cell membranes, which promotes opsonisation and clearance — neutral, coated particles tend to circulate longer.',
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'npTypesComparison': {
              'label': 'Polymeric, inorganic, and lipid-based nanoparticles',
              'images': [],
              'description': 'The three broad nanoparticle material classes each trade off differently between control, versatility, and safety.',
              'mechanism': 'Polymeric carriers (e.g. polymersomes, dendrimers, micelles) allow precise control of particle characteristics and easy surface modification but can aggregate or be toxic. Inorganic carriers (e.g. gold, iron oxide, silica, quantum dots) have unique electrical/magnetic/optical properties well suited to theranostics, but can raise toxicity and solubility concerns. Lipid-based carriers (e.g. liposomes, lipid nanoparticles, emulsions) are simple to formulate with high bioavailability, but can have low encapsulation efficiency.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-types-1',
                  'prompt': 'Inorganic nanoparticles such as gold or iron oxide particles are particularly well suited to theranostic applications mainly because of their:',
                  'options': ['Unique electrical, magnetic, and optical properties', 'Complete absence of any toxicity concerns', 'Inherent biodegradability into harmless metabolites', 'High encapsulation efficiency for hydrophilic drugs'],
                  'correctIndex': 0,
                  'explanation': "Inorganic nanoparticles' distinctive electrical, magnetic and optical properties (e.g. plasmon resonance in gold, magnetism in iron oxide) are exactly what makes them useful for both imaging and therapy — their main limitations are toxicity and solubility, not lack of these properties.",
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-types-2',
                  'prompt': 'A key practical limitation commonly associated with lipid-based nanoparticles (e.g. liposomes, emulsions) is:',
                  'options': ['Low encapsulation efficiency', 'Complete inability to carry hydrophobic cargo', 'A requirement for gold-based cores', 'Poor bioavailability compared to other classes'],
                  'correctIndex': 0,
                  'explanation': 'Lipid-based systems are praised for formulation simplicity, payload flexibility, and high bioavailability — but they are noted for relatively low encapsulation efficiency compared to some other carrier types.',
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'tripleHitNanorod': {
              'label': '"Triple hit" gold nanorod theranostic system',
              'images': [],
              'description': 'A gold nanorod core coated with mesoporous silica and a thermo-responsive polymer, loaded with doxorubicin (DOX), combines three functions in one particle: chemotherapy, photothermal therapy, and CT imaging.',
              'mechanism': 'Near-infrared LED light heats the gold nanorod core via plasmon resonance. This heat (1) triggers the thermo-responsive polymer coating to release DOX (chemotherapy), (2) directly damages tumour cells via hyperthermia (photothermal therapy), while (3) the gold core also acts as a contrast agent for X-ray CT imaging.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Theranostics'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-triple-1',
                  'prompt': "In the 'triple hit' gold nanorod/mesoporous silica/DOX system, what triggers drug release from the thermo-responsive polymer coating?",
                  'options': ['Near-infrared (NIR) light heating the gold nanorod core', 'A drop in extracellular pH alone, independent of light', 'Mechanical agitation of the particle by blood flow', 'UV light directly degrading the DOX molecule'],
                  'correctIndex': 0,
                  'explanation': 'NIR-LED light is absorbed by the gold nanorod core and converted to heat; that heat causes the thermo-responsive polymer coating to change conformation and release the loaded DOX — the switch is optical, not pH alone.',
                  'hashtags': ['Nanomedicine', 'Theranostics'],
                },
                {
                  'id': 'np-triple-2',
                  'prompt': "Which three functions does the gold nanorod core provide in this 'triple hit' system?",
                  'options': ['A heat source for both drug release and photothermal therapy, plus a CT contrast agent', 'A pH sensor, an oxygen carrier, and a fluorescent tag', 'An antibody scaffold, a vaccine adjuvant, and a pH buffer', 'A magnetic core for MRI, a radiotracer, and an enzyme mimic'],
                  'correctIndex': 0,
                  'explanation': "The gold core's job is thermal: it converts NIR light into heat for both triggering drug release and directly killing cells (photothermal therapy), while its high X-ray attenuation also makes it visible on CT scans.",
                  'hashtags': ['Nanomedicine', 'Theranostics'],
                },
              ],
            },
            'goldNanorodLSPR': {
              'label': 'Localized surface plasmon resonance (LSPR) in gold nanoparticles',
              'images': [],
              'description': 'Gold nanoparticles convert light into heat through localized surface plasmon resonance, and also strongly attenuate X-rays — giving them both a therapeutic (hyperthermia) and a diagnostic (CT contrast) role.',
              'mechanism': "LSPR is the collective oscillation of free electrons in the gold nanoparticle in response to light of a matching wavelength; this oscillation dissipates as heat, raising local temperature (hyperthermia, ~40-43°C). Separately, gold's high X-ray attenuation coefficient makes it useful as a contrast agent for X-ray CT imaging.",
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Theranostics'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-lspr-1',
                  'prompt': 'Localized surface plasmon resonance (LSPR) in a gold nanoparticle refers to:',
                  'options': ['The collective oscillation of free electrons in the particle upon exposure to light, which is dissipated as heat', "The particle's rate of renal clearance from the bloodstream", 'A chemical reaction between gold and doxorubicin', 'The binding of gold nanoparticles to plasma membrane receptors'],
                  'correctIndex': 0,
                  'explanation': 'LSPR describes the free electrons in the gold nanostructure oscillating together when hit by light of the right wavelength — that oscillation\'s energy is released as heat, which is the basis of gold-nanoparticle hyperthermia.',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-lspr-2',
                  'prompt': 'Besides generating heat, why is a gold nanoparticle also useful as an imaging agent for X-ray CT?',
                  'options': ['It has a high X-ray attenuation coefficient', 'It emits its own X-rays spontaneously', 'It becomes radioactive upon light exposure', 'It fluoresces under standard CT scanner illumination'],
                  'correctIndex': 0,
                  'explanation': 'Gold strongly attenuates (blocks) X-rays, which is exactly what a CT contrast agent needs to do — areas containing gold nanoparticles show up with different attenuation than surrounding tissue.',
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'thermoresponsivePolymer': {
              'label': 'Thermo-responsive polymer phase transition',
              'images': [],
              'description': 'The polymer coating used in the gold nanorod system undergoes a sharp phase transition around body-relevant temperatures, switching from a swollen, hydrophilic state to a collapsed, hydrophobic state.',
              'mechanism': 'Below its lower critical solution temperature (LCST, roughly around 36-37°C in this system), the polymer is hydrated and swollen, keeping the coating relatively open. Above the LCST, the polymer rapidly collapses into a hydrophobic, compact state, expelling water — this collapse is what drives cargo (e.g. DOX) release when heat is applied (e.g. by NIR-triggered gold-core heating).',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Theranostics'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-thermo-1',
                  'prompt': 'What happens to the thermo-responsive polymer coating once the temperature rises above its transition point?',
                  'options': ['It rapidly collapses into a hydrophobic, compact state, driving cargo release', 'It becomes permanently covalently cross-linked to the drug', 'It dissolves completely, destroying the underlying gold core', 'It becomes more hydrated and swells further, trapping the cargo'],
                  'correctIndex': 0,
                  'explanation': 'Below its transition temperature the polymer is swollen and hydrophilic; heating past that point flips it to a collapsed hydrophobic state, which is the physical change that squeezes the loaded drug out.',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-thermo-2',
                  'prompt': 'Why does this thermo-responsive behaviour matter for controlling drug release in the body?',
                  'options': ['It lets heat (e.g. from NIR-triggered gold heating) act as an external ON/OFF switch for release', 'It ensures the drug is released continuously regardless of temperature', 'It prevents the nanoparticle from ever reaching body temperature', 'It makes the polymer coating permanently impermeable to the drug'],
                  'correctIndex': 0,
                  'explanation': "Because the polymer's physical state flips sharply around a specific temperature, applying (or withholding) heat becomes a controllable trigger — exactly the ON/OFF switching behaviour used to control when DOX is released.",
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'dualResponsiveRelease': {
              'label': 'pH- and temperature-dual-responsive drug release',
              'images': [],
              'description': 'Doxorubicin release from the nanoparticle system is fastest under conditions mimicking a heated, acidic tumour microenvironment, and slowest under normal physiological conditions.',
              'mechanism': 'Release testing across 25°C/pH7.4 (slowest), 25°C/pH5.0, 41°C/pH7.4, and 41°C/pH5.0 (fastest) shows both lower pH and higher temperature independently increase release rate, and their combination (warm + acidic, resembling a tumour or an externally heated tumour) produces the greatest and fastest cumulative release.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Theranostics'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-dual-1',
                  'prompt': 'Under which combination of conditions was doxorubicin release from the nanoparticle fastest?',
                  'options': ['41°C and pH 5.0', '25°C and pH 7.4', '25°C and pH 5.0', '41°C and pH 7.4, identical to 25°C/pH7.4'],
                  'correctIndex': 0,
                  'explanation': 'The combination of elevated temperature and acidic pH — resembling a heated, acidic tumour microenvironment — produced the fastest and greatest cumulative drug release, faster than either condition alone.',
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-dual-2',
                  'prompt': 'This pattern of drug release (both pH and temperature affecting release rate) is best described as:',
                  'options': ['Dual-stimuli-responsive release', 'Purely passive, stimulus-independent diffusion', 'A single-use, non-repeatable burst release', 'Release that is unaffected by either pH or temperature'],
                  'correctIndex': 0,
                  'explanation': 'Because release rate changes with both pH and temperature independently (and combines when both are present), this is a dual-responsive system — not a simple passive-diffusion or single-trigger design.',
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
            'ultrasoundNPMechanisms': {
              'label': 'Ultrasound-triggered nanoparticle disruption',
              'images': [],
              'description': "Ultrasound can release a nanoparticle's cargo through two distinct mechanisms — a thermal effect and a physical (mechanical) effect — and also plays several other roles in nanoparticle-based therapy.",
              'mechanism': 'The thermal effect from ultrasound energy can cause a nanoparticle to deform/release its cargo through localized heating; the physical effect mechanically shatters/disrupts the particle structure directly. Beyond triggering release, ultrasound is also used for: (1) targeting/guiding accumulation at the tumour, (2) enhancing nanoparticle penetration into tissue, (3) directly disrupting the nanoparticle, and (4) sonoporation — transiently permeabilising the cell membrane to let cargo in.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Ultrasound'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-us-1',
                  'prompt': "Ultrasound can release a nanoparticle's cargo via two distinct effects. What are they?",
                  'options': ['A thermal effect and a physical (mechanical disruption) effect', 'An electrical effect and a magnetic effect', 'An enzymatic effect and a pH effect', 'A chemical effect and a radioactive effect'],
                  'correctIndex': 0,
                  'explanation': 'Ultrasound energy can release cargo either by heating the particle (thermal effect) or by mechanically disrupting/shattering its structure (physical effect) — two separate physical mechanisms, not a chemical or enzymatic one.',
                  'hashtags': ['Nanomedicine', 'Ultrasound'],
                },
                {
                  'id': 'np-us-2',
                  'prompt': "'Sonoporation', as one of the roles ultrasound plays in nanoparticle-based therapy, refers to:",
                  'options': ['Transiently making the cell membrane more permeable so cargo can enter', 'Permanently destroying the target cell membrane', 'Guiding nanoparticles using a magnetic field', 'Converting the nanoparticle into an inert byproduct'],
                  'correctIndex': 0,
                  'explanation': "Sonoporation is the transient permeabilisation of the cell membrane caused by ultrasound, which helps cargo (drugs, genes) get into the cell — it's temporary, not a permanent destructive effect.",
                  'hashtags': ['Nanomedicine', 'Ultrasound'],
                },
              ],
            },
            'hifuNPlusStrategy': {
              'label': 'HIFU-nanoparticle synergy (HIFUⁿ⁺ strategy)',
              'images': [],
              'description': 'Combining nanoparticles with high-intensity focused ultrasound (HIFU) substantially increases how deep thermal ablation can reach into tissue, and can be organised into a staged treatment strategy.',
              'mechanism': 'A three-stage HIFUⁿ⁺ strategy: Stage 1 uses low-intensity ultrasound to enhance nanoparticle accumulation and penetration; Stage 2 uses HIFU to disrupt the nanoparticles, causing in situ drug synthesis together with localized thermal ablation; Stage 3 removes residual cancer cells and activates a systemic anti-tumour immune response. In a liver tissue test, adding nanoparticles increased HIFU ablation depth from 2.53 mm (without nanoparticles) to 7.4 mm (with nanoparticles).',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Ultrasound'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-hifu-1',
                  'prompt': 'In the three-stage HIFUⁿ⁺ strategy, what happens in Stage 2?',
                  'options': ['HIFU disrupts the nanoparticles, causing in situ drug synthesis together with localized thermal ablation', 'Low-intensity ultrasound alone enhances nanoparticle accumulation, with no ablation', 'Residual cancer cells are removed and systemic immunity is activated', 'Nanoparticles are cleared from the body via the kidneys'],
                  'correctIndex': 0,
                  'explanation': 'Stage 1 is accumulation/penetration (low-intensity ultrasound), Stage 2 is HIFU-driven nanoparticle disruption with in situ drug synthesis plus thermal ablation, and Stage 3 is residual-cell clearance plus immune activation.',
                  'hashtags': ['Nanomedicine', 'Ultrasound'],
                },
                {
                  'id': 'np-hifu-2',
                  'prompt': 'In a liver ablation test comparing HIFU with and without nanoparticles present, what was the effect on ablation depth?',
                  'options': ['Ablation depth was substantially greater with nanoparticles present (7.4 mm) than without (2.53 mm)', 'Ablation depth was identical whether or not nanoparticles were present', 'Nanoparticles reduced ablation depth compared to HIFU alone', 'Ablation only occurred when nanoparticles were absent'],
                  'correctIndex': 0,
                  'explanation': 'The measured ablation depth was roughly three times greater with nanoparticles present (7.4 mm) than without them (2.53 mm), demonstrating that nanoparticles substantially enhance HIFU\'s thermal ablation effect.',
                  'hashtags': ['Nanomedicine', 'Ultrasound'],
                },
              ],
            },
            'twoComponentProdrug': {
              'label': 'Two-component, site-activated prodrug system',
              'images': [],
              'description': 'Splitting a drug into two inert components that only react to form the active drug at the target tissue reduces toxicity to healthy, non-target tissue.',
              'mechanism': 'Components A and B are separately inert (prodrugs). Delivered systemically, they only combine into the active drug (A+B) where localized ultrasound triggers their reaction at the target tissue. In non-target tissue, no activation occurs, so no reaction takes place and the inert components are simply excreted rather than causing off-target toxicity.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Nanomedicine', 'Drug Delivery'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'np-prodrug-1',
                  'prompt': 'In the two-component (A+B) prodrug system, what happens to components A and B when they reach NON-target tissue?',
                  'options': ['They remain inert, do not react, and are excreted', 'They spontaneously combine into the active drug anyway', 'They become more toxic than the active drug itself', 'They are permanently trapped in non-target tissue'],
                  'correctIndex': 0,
                  'explanation': "Without the localized ultrasound trigger present at non-target tissue, components A and B never react — they stay inert and are cleared from the body rather than forming active drug where it isn't wanted.",
                  'hashtags': ['Nanomedicine'],
                },
                {
                  'id': 'np-prodrug-2',
                  'prompt': 'What is the main advantage of splitting a drug into two separately-inert components (A and B) that only combine at the target site?',
                  'options': ['It reduces the chance of the active drug causing toxicity in non-target tissue', 'It doubles the total dose delivered everywhere in the body', 'It removes the need for any targeting mechanism at all', 'It makes both components individually more potent than the combined drug'],
                  'correctIndex': 0,
                  'explanation': "Because the active drug only forms where the trigger (localized ultrasound) is applied, tissue elsewhere in the body is only ever exposed to the inert precursors — this is what limits off-target toxicity.",
                  'hashtags': ['Nanomedicine'],
                },
              ],
            },
          },
        },
        'extracellularVesicles': {
          'label': 'Extracellular Vesicles',
          'icon': '🫧',
          'color': '#38bdf8',
          'items': {
            'evsVsCells': {
              'label': 'Extracellular vesicles (EVs) vs whole-cell therapies',
              'images': [],
              'description': 'EVs are increasingly used instead of transplanting whole cells, because they offer several safety and practical advantages while still carrying therapeutic cargo.',
              'mechanism': 'Unlike whole cells, EVs cannot self-replicate (removing any risk of forming a tumour from the therapy itself), tend to be less immunogenic, are more resistant to hostile environments, and have better stability during storage. All cell types secrete EVs.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Extracellular Vesicles'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'ev-vs-1',
                  'prompt': 'Which of the following is a key safety advantage of extracellular vesicles (EVs) over whole-cell therapies?',
                  'options': ['EVs cannot self-replicate, removing the risk of the therapy itself forming a tumour', 'EVs are larger than the cells that produce them', 'EVs are exclusively produced by cancer cells', 'EVs require live cell division to function therapeutically'],
                  'correctIndex': 0,
                  'explanation': "Because EVs are non-replicating vesicles rather than living cells, there's no possibility of the therapeutic material itself dividing uncontrollably — unlike a transplanted living cell, which in principle could.",
                  'hashtags': ['Extracellular Vesicles'],
                },
                {
                  'id': 'ev-vs-2',
                  'prompt': 'Compared with whole cells, EVs are generally described as being:',
                  'options': ['Less immunogenic and more resistant to hostile environments', 'More immunogenic and less stable in storage', 'Incapable of being produced by most cell types', 'Only producible under laboratory culture conditions, never in vivo'],
                  'correctIndex': 0,
                  'explanation': 'EVs tend to trigger less of an immune response than whole cells, and hold up better under storage and hostile conditions — practical advantages that make them attractive as a cell-free alternative.',
                  'hashtags': ['Extracellular Vesicles'],
                },
              ],
            },
            'evSubtypesSizes': {
              'label': 'Extracellular vesicle subtypes and size ranges',
              'images': [],
              'description': 'Extracellular vesicles come in several distinct subtypes with very different characteristic size ranges, from the smallest exosomes to the largest blebbisomes.',
              'mechanism': 'Roughly increasing in size: exosomes (30-150 nm), microvesicles (100-1000 nm), migrasomes (500-3000 nm), apoptotic bodies (1000-5000 nm), oncosomes (1000-10000 nm), exophers (3500-4000 nm), and blebbisomes (10-20 μm) — the largest category, roughly 1000x larger than the smallest exosomes.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Extracellular Vesicles'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'ev-size-1',
                  'prompt': 'Which extracellular vesicle subtype is the smallest, at roughly 30-150 nm?',
                  'options': ['Exosomes', 'Blebbisomes', 'Apoptotic bodies', 'Exophers'],
                  'correctIndex': 0,
                  'explanation': 'Exosomes are the smallest of the listed EV subtypes (roughly 30-150 nm) — blebbisomes, apoptotic bodies, and exophers are all substantially larger, up to the micron scale.',
                  'hashtags': ['Extracellular Vesicles'],
                },
                {
                  'id': 'ev-size-2',
                  'prompt': 'Roughly how does the size of a blebbisome compare to that of an exosome?',
                  'options': ['A blebbisome (10-20 μm) is on the order of 1000 times larger than an exosome (30-150 nm)', 'They are approximately the same size', 'A blebbisome is smaller than an exosome', 'Blebbisomes and exosomes are simply two names for the same structure'],
                  'correctIndex': 0,
                  'explanation': 'Exosomes are tens to ~150 nanometres, while blebbisomes span 10-20 micrometres — a difference of roughly three orders of magnitude, making blebbisomes far larger than exosomes.',
                  'hashtags': ['Extracellular Vesicles'],
                },
              ],
            },
            'evBindingModes': {
              'label': 'EV-target cell interaction modes',
              'images': [],
              'description': 'When an extracellular vesicle binds a target cell, it can interact in one of three distinct ways, trading off efficiency against how many cells are affected.',
              'mechanism': '"Bind-and-leave" is high efficiency, affecting multiple cells via broad/transient signaling. "Bind-and-stay" is medium efficiency, affecting one cell via localized/stable surface signaling. "Bind-and-internalize" is low efficiency, affecting one cell but also risking lysosomal degradation, with downstream signaling through the endosome.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Extracellular Vesicles'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'ev-bind-1',
                  'prompt': 'Which EV-target cell interaction mode is described as high-efficiency and capable of affecting multiple cells via broad, transient signaling?',
                  'options': ['Bind-and-leave', 'Bind-and-stay', 'Bind-and-internalize', 'None of these modes affect more than one cell'],
                  'correctIndex': 0,
                  'explanation': "'Bind-and-leave' briefly engages a receptor and then detaches, allowing the same EV (or its signal) to potentially affect multiple cells — this is the high-efficiency, broad-but-transient mode.",
                  'hashtags': ['Extracellular Vesicles'],
                },
                {
                  'id': 'ev-bind-2',
                  'prompt': 'Which EV-target cell interaction mode carries a risk of the vesicle undergoing lysosomal degradation after internalization?',
                  'options': ['Bind-and-internalize', 'Bind-and-leave', 'Bind-and-stay', 'All three modes carry an identical risk of lysosomal degradation'],
                  'correctIndex': 0,
                  'explanation': "Only 'bind-and-internalize' brings the EV inside the cell (via endocytosis), which is what exposes it to the endosome-to-lysosome degradation pathway — the other two modes act at the cell surface.",
                  'hashtags': ['Extracellular Vesicles'],
                },
              ],
            },
            'evDamageSignaling': {
              'label': 'Damaged-cell signaling via extracellular vesicles',
              'images': [],
              'description': 'A damaged cell can send an EV-mediated distress signal that prompts a stem cell to send back genetic repair instructions.',
              'mechanism': 'A damaged cell releases nanoparticles/EVs as a distress signal; a stem cell receives and responds to this signal; the stem cell sends back a small package of DNA/RNA instructions; the damaged cell follows these instructions to repair itself.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Extracellular Vesicles'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'ev-damage-1',
                  'prompt': "In this damaged-cell signaling model, what does the stem cell send back to the damaged cell after receiving its distress signal?",
                  'options': ['A small package of DNA/RNA instructions', 'A fully differentiated replacement cell', 'A dose of chemotherapy', 'Nothing — the stem cell only observes without responding'],
                  'correctIndex': 0,
                  'explanation': "After receiving the damaged cell's EV-carried distress signal, the stem cell responds by sending back genetic material (DNA/RNA) — instructions the damaged cell then follows to repair itself, rather than being physically replaced.",
                  'hashtags': ['Extracellular Vesicles'],
                },
                {
                  'id': 'ev-damage-2',
                  'prompt': 'What is the overall sequence of this damaged-cell repair signaling process?',
                  'options': ['Damaged cell signals → stem cell receives and responds → stem cell sends genetic instructions → damaged cell repairs itself', 'Stem cell signals → damaged cell ignores it → damaged cell degrades further', 'Damaged cell instantly self-destructs without any signaling', 'Damaged cell sends genetic instructions to the stem cell, which then repairs itself instead'],
                  'correctIndex': 0,
                  'explanation': 'The sequence runs from the damaged cell outward: it signals distress, a stem cell picks up and responds to that signal, sends back repair instructions, and the original damaged cell is the one that uses them to heal — not the reverse.',
                  'hashtags': ['Extracellular Vesicles'],
                },
              ],
            },
            'longevityEVs': {
              'label': 'Young serum EVs and rejuvenation of aged tissue',
              'images': [],
              'description': 'Injecting extracellular vesicles from young serum (young sEVs) into aged mice measurably improved multiple markers of ageing, from survival to cognition to cellular senescence.',
              'mechanism': 'Compared with aged mice given a control (PBS), aged mice given young sEVs showed: increased survival (12.42% improvement), restored fertility markers, improved metabolic health, improved cardiac performance (LV mass and ejection fraction closer to young levels), reduced bone loss, improved cognition and endurance (47.6% increase in running time to exhaustion), and reduced senescent-cell staining alongside restored mitochondrial ATP synthesis.',
              'funFacts': ['Young sEV treatment restored aged mice sperm concentration and motility to near-young levels.'],
              'refs': [],
              'hashtags': ['Extracellular Vesicles', 'Longevity'],
              'course': 'MEDS3003',
              'class': 'L7-8',
              'questions': [
                {
                  'id': 'ev-longevity-1',
                  'prompt': 'In aged mice, treatment with young serum-derived EVs (young sEVs) was associated with approximately what change in survival compared to control?',
                  'options': ['A 12.42% increase in survival', 'No measurable change in survival', 'A 12.42% decrease in survival', 'Complete elimination of mortality'],
                  'correctIndex': 0,
                  'explanation': 'The Kaplan-Meier survival comparison showed aged mice treated with young sEVs survived about 12.42% longer than aged mice given the PBS control, a statistically significant difference.',
                  'hashtags': ['Extracellular Vesicles', 'Longevity'],
                },
                {
                  'id': 'ev-longevity-2',
                  'prompt': 'Besides survival, which of the following was also reported to improve in aged mice after young sEV treatment?',
                  'options': ['Running endurance, cardiac performance, and reduced markers of cellular senescence', 'Only tumour growth rate, with no effect on any other system', 'Hearing acuity exclusively, with no other measurable changes', 'A permanent reversal of chronological age'],
                  'correctIndex': 0,
                  'explanation': 'Reported improvements spanned endurance (a 47.6% increase in running time), cardiac performance (LV mass/ejection fraction shifting toward young-mouse values), and reduced senescent-cell staining/improved mitochondrial function — a broad, multi-system effect, not just one measure, and not literal reversal of chronological age.',
                  'hashtags': ['Extracellular Vesicles', 'Longevity'],
                },
              ],
            },
          },
        },
      },
    },
  };

/* ======================================================================
   STAGES — per course. Each stage has correct-answer requirements (reset
   each stage) and a narrative shown on the transition screen before that
   stage begins.
   ====================================================================== */
  const STAGES = {
    'MEDS3002': [
      /* "scenario" is patient-facing narrative — this is also where a real
         case study can be dropped in later (per stage). */
      { n:1, roman:'I', requirements:{ genetics:3, immunology:3, pharmacology:3, oncology:3 },
        scenario:"Patient presents with fatigue and unexplained bruising. Bloodwork shows an abnormal white cell count — the care team orders genetic testing to find out exactly what's driving it." },
      { n:2, roman:'II', requirements:{ genetics:5, immunology:10 },
        scenario:"The genetic picture is in. Now the patient's own immune system is in the fight — how well it can recognise and respond to the disease will shape what comes next." },
      { n:3, roman:'III', requirements:{ genetics:3, immunology:8, pharmacology:10 },
        scenario:"With the genetics and immunology understood, the patient starts treatment. Which drugs will actually work against this specific leukemia?" },
      { n:4, roman:'IV', requirements:{ genetics:3, immunology:5, pharmacology:7, oncology:10 },
        scenario:"The patient is now deep into treatment. Staging, complications, and what happens next define the road ahead." },
    ],
    // Deliberately short right now — MEDS2003 only has a handful of
    // seed questions so far. Expand requirements as you add more content
    // (see the contributor tool or dev notes).
    'MEDS2003': [
      { n:1, roman:'I', requirements:{ metabolism:2 },
        scenario:"You're tracing how a cell fuels itself — starting with how it handles glucose and energy production." },
      { n:2, roman:'II', requirements:{ metabolism:1, molecularBiology:1 },
        scenario:"From metabolism to the molecular machinery that reads and copies the genome — the next layer of the picture." },
    ],
  };
  const COMPLETE_SCENARIO = "You've worked through the full case — review your answers below, or start again to reinforce what you've learned. (Real case studies coming soon.)";

  const RUNNABLE_THEMES = ['MEDS3002', 'MEDS2003']; // course ids with a matching STAGES config, playable in Runner mode


  window.RUNNER_DATA = {
    COURSES, GAME_CONFIG, LIFE_CONFIG, THEMES,
    STAGES, COMPLETE_SCENARIO, RUNNABLE_THEMES, LEARNING_PATH_CONFIG,
  };

})();
