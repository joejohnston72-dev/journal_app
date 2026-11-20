# Journal App — Product Brief & Build Framework

Source of truth for scope. Original: [brief.pdf](brief.pdf) (20 Nov 2026). Text below is a layout-preserving extraction so requirement tables stay readable; requirement IDs (CAP-1, DATA-1, …) are referenced from code, specs and PRs.

```text

Journal App — Product Brief & Build
Framework
  Nov 20, 2026       ·   @Joe Johnston

Summary
Build an installable web app for your iPhone that runs your morning ritual end to end: one
Claude-curated prompt, then write, speak or scan, then reflect or learn, then meditate.
Every entry feeds an editable map of your thinking, with sources, and that map shapes
the next prompts.

North star: one question worth sitting with each morning, and nothing you write is ever
lost.

Platform (decided 20 Nov): a web app now, wrapped as a native app later. This removes
the Mac blocker for v1; widgets, Siri, Apple Health and locked-phone bells wait for the
wrapper. See Platform below.

Product principles
   1. Never lose a word. Local-first storage, save on every keystroke, revision history, three
      independent copies.
   2. Calm by design. No badges, no red dots, no feeds. A session has a clear end.
   3. One prompt, chosen for a reason. Every prompt shows why it was picked and which
      entries it came from.
   4. Provenance everywhere. Every insight links back to the words that produced it. You
       can edit or veto anything.
   5. Web first, native-ready. Open web standards now, structured so a native wrapper can
      add widgets, Siri and Health later.
   6. A thinking partner, not a therapist. Asks before it tells, names existing frameworks,
       never diagnoses.
   7. You own the data. Full export in open formats (Markdown, JSON, original media) at
      any time.

Original brief (verbatim)
Your text, unedited. Every line is traced to a requirement ID in the next section.

Journal App — Product Brief & Build Framework

    My journal app

    I went to build a personalise journaling app to replace my current use of Apple native
    notes app which isn’t particularly great.

    Says written must never be lost either locally or land backed up to cloud.

    Inputs must vary from written to speech, images or other.

    The key premise is a curated prompts each day, fed by Claude like we did on
    reminders. This should include learning context when necessary or more information
    to create a true discussion within me.

    Notes etc whisk create a feedback loop - ongoing, that is used to generate further
    prompts.

    We should be spotting patterns, and creating an “image”, an interactive version of my
    brain within the app that’s used as reference. I should be able to view / edit this. This
    should include information on where the information came from.

    I want to input all my existing notes, journals and Claude personal development
    chats.

    It should be simple, intuitive, use as much native IOS capability as possible - meaning
    be as plugged into iPhone as we can.

    It should also bring a sense of calm, no addictive flashing lights etc. we can do some
    branding and UI brainstorming / drafting together.

    It should mimic my regular meditation in session. I wake, I get dressed for gym, I make
    coffee, I sit with notebook or phone, I do my prompt, I write. I think, I feedback or
    learn more if necessary. I move on to traditional meditation session (guided or
    unguided).

    We want to track streaks, calendars, achievements, and any sense of progress,
    insightful / new ideas.

    Spot within my writings when I am touching on subjects that alresdy exist, like
    theoretical and philosophical frameworks or ideas that I seem to be edging close to
    and raise that - so like if I spontaneously come up with a theory or framework that
    exists alresdy then raise it so I can research more.

    I should be able to click on find more information on entries and information
    throughout.

    The UI should have a sense of fluidity and calm. Flow.

    Entries should be auto dated and titled, stored and everything should be available for
    export.

Journal App — Product Brief & Build Framework

    There should be backups for periods of offline / disconnect. We want stability and
    reliability.

    A key feature is the prompts, entries should feedback and the daily prompts should
    be dynamic. They can be moved and prioritised once generated, but I don’t think we
    should be deleting prompts once generated because they came from an original idea
    for a reason. All prompts should be kept in a library.

    I should be abele to skip a daily prompt.

    We will build in notification capabilities such as daily reminders.

    FYI, I am not a dev, but I am fairly technical.

    Looking at what we have here, what features have I missed, what are some gaps.
    What are some easy wins to build in alongside what we have here.

    Write an extensive brief and framework for how we will build this.

Follow-up added the same morning:

    howdo we buildin meditation features, like at minimum a timer

Requirements
46 requirements in 11 areas: 40 Must, 6 Should. Each traces to a line of your brief; change
Priority in place.

Areas: CAP capture · DATA storage · PRM prompts · LOOP reflection · MAP mind map ·
ECHO framework echoes · RIT ritual · PROG progress · IMP imports · NOTIF notifications ·
UX experience.

  ID                Requirement                 Done when                 Priority   From your brief

  CAP-1             Typed entries               Simple editor; saves on    Must     “Inputs must vary
                                                every keystroke                      from written…”

  CAP-2             Voice entries               Audio kept, plus an        Must     “…to speech”
                                                editable transcript

  CAP-3             Photo entries               Camera or library; any     Must     “…images”
                                                text in the photo is
                                                searchable

Journal App — Product Brief & Build Framework

  ID                Requirement                 Done when                   Priority   From your brief

  CAP-4             Notebook page               Scan a page: image +         Must     “I sit with notebook or
                    scans                       handwriting transcript,                phone”
                                                linked

  CAP-5             Other inputs                Share Sheet links,           Should   “…or other”
                                                quotes, files; Apple
                                                Journaling
                                                Suggestions moments

  CAP-6             Auto date and               Timestamp on create;         Must     “auto dated and titled”
                    title                       title written after you
                                                finish; editable

  DATA-1            Zero-loss writing           Kill the app mid-            Must     “must never be lost”
                                                sentence: nothing lost
                                                on relaunch

  DATA-2            Revision history            Every edit versioned;        Must     “must never be lost”
                    and bin                     deletes go to a
                                                restorable bin

  DATA-3            iCloud sync                 Fully usable offline;        Must     “backed up to cloud”
                                                syncs on reconnect; no
                                                duplicates

  DATA-4            Independent                 Nightly backup to a          Must     “backups for periods
                    backups                     second provider, plus a                of offline”
                                                manual backup file

  DATA-5            Full export                 One tap: Markdown,           Must     “available for export”
                                                JSON, media, prompts
                                                and map as a ZIP

  DATA-6            Tested restore              Snapshot restore             Must     “stability and
                                                verified on a clean                    reliability”
                                                install

  PRM-1             One curated                 Ready before you             Must     “curated prompts each
                    prompt a day                wake, even offline                     day”

  PRM-2             Learning context            Optional context card:       Must     “learning context
                                                the concept, why it                    when necessary”
                                                matters, sources

  PRM-3             Dynamic                     Upcoming prompts             Must     “daily prompts should
                    prompts                     shift with entries, skips              be dynamic”
                                                and ratings

Journal App — Product Brief & Build Framework

  ID                Requirement                 Done when                  Priority   From your brief

  PRM-4             Library, never              Every prompt kept           Must     “kept in a library”
                    deleted                     with a status; archive,
                                                never delete

  PRM-5             Reorder and                 Drag to reorder; pin;       Must     “moved and
                    prioritise                  ask next                              prioritised”

  PRM-6             Skip                        One tap, no streak          Must     “able to skip a daily
                                                penalty, prompt                       prompt”
                                                returns to library

  PRM-7             Prompt origin               Each prompt shows           Must     “came from an original
                                                the entries and idea it               idea for a reason”
                                                came from

  LOOP-1            Feedback loop               Each entry updates the      Must     “create a feedback
                                                map and adds prompt                   loop”
                                                candidates

  LOOP-             Reflect step                After writing: 1–3          Must     “I think, I feedback”
  2                                             follow-up questions, on
                                                request

  LOOP-             Find more                   On any entry, highlight,    Must     “find more information
  3                 information                 node or prompt:                       … throughout”
                                                explainer plus sources

  LOOP-             Discussion                  A follow-up can             Should   “a true discussion
  4                 thread                      become a short back-                  within me”
                                                and-forth

  MAP-1             Interactive self-           Themes, values,             Must     “an interactive version
                    model                       beliefs, goals,                       of my brain”
                                                questions, ideas,
                                                patterns

  MAP-2             View and edit               Rename, merge, split,       Must     “view / edit this”
                                                correct, delete, add;
                                                your edits locked

  MAP-3             Provenance                  Every node lists its        Must     “where the
                                                source entries, quotes                information came
                                                and dates                             from”

  MAP-4             Used as                     Prompt engine reads         Must     “used as reference”
                    reference                   the map; you can see
                                                what it read

Journal App — Product Brief & Build Framework

  ID                Requirement                 Done when                  Priority   From your brief

  MAP-5             Pattern spotting            Recurring themes and        Must     “spotting patterns”
                                                shifts surfaced weekly

  ECHO-             Existing-idea               Names the framework         Must     “a theory or
  1                 detection                   or thinker, the                       framework that exists
                                                matching quote,                       already”
                                                confidence, sources

  ECHO-             Idea log                    Your original ideas         Should   “insightful / new ideas”
  2                                             listed and checked for
                                                prior art

  RIT-1             Morning session             Guided flow: settle,        Must     “mimic my regular
                    mode                        prompt, write, reflect,               meditation session”
                                                meditate, close

  RIT-2             Meditation timer            Presets, bells, screen      Must     “at minimum a timer”
                                                kept awake, Mindful
                                                Minutes logged via
                                                Shortcut

  RIT-3             Guided                      Play your own audio, or     Should   “guided or unguided”
                    meditation                  hand off to your
                                                meditation app

  PROG-             Streaks                     Calm streak with grace      Must     “track streaks”
  1                                             days; never guilt-trips

  PROG-             Calendar                    Month view of entries,      Must     “calendars”
  2                                             sessions and
                                                meditation minutes

  PROG-             Achievements                Quiet milestones: 30        Should   “achievements”
  3                                             days, 100 entries, first
                                                echo

  PROG-             Progress and                Insights and new ideas      Must     “any sense of
  4                 insights                    counted and listed                    progress”
                                                over time

  IMP-1             Apple Notes                 Bulk import with            Must     “input all my existing
                    import                      original dates                        notes”

  IMP-2             Past journals               Digital files and           Must     “journals”
                    import                      notebook scans,
                                                original dates kept

Journal App — Product Brief & Build Framework

  ID                Requirement                 Done when                Priority   From your brief

  IMP-3             Claude chats                Personal-development      Must     “Claude personal
                    import                      chats selected and                  development chats”
                                                mined into the map

  NOTIF-            Daily reminder              At your time, with        Must     “daily reminders”
  1                                             Start, Snooze and Skip
                                                actions

  NOTIF-            Calm notification           One a day by default;     Must     “no addictive flashing
  2                 rules                       no badges                           lights”

  UX-1              Simple and                  Launch to writing in      Must     “simple, intuitive”
                    intuitive                   two taps or fewer

  UX-2              Calm, fluid, flow           Slow easing, quiet        Must     “fluidity and calm.
                                                palette, Reduce Motion              Flow.”
                                                respected

  UX-3              Native iOS                  Home Screen install,      Must     “as plugged into
                                                push and Shortcuts                  iPhone as we can”
                                                now; widgets, Siri and
                                                Health via the wrapper

  UX-4              Brand and UI                Name, palette, type       Should   “branding and UI
                    drafting                    and key screens                     brainstorming”
                                                drafted together

Morning session and meditation
The app runs your ritual as one Session with six stages; meditation is the last stage and
also works on its own. The minimum meditation feature is a timer with bells that keeps
working with the phone locked and logs to Apple Health.

Session flow
   1. Arrive (optional, 1 min). Open from the Home Screen, the Action Button (via a
       Shortcut) or the reminder. A slow breath pacer while the coffee brews; one tap skips
       it.
   2. Prompt. Today's prompt, a one-line “why this prompt”, and a context card when
      useful. Actions: Write, Skip, Swap (pick from the library), Lighter today.
   3. Write. Type, dictate, or scan the notebook page you just wrote. Saves continuously. No
       AI interruptions while you write.

Journal App — Product Brief & Build Framework

   4. Reflect or learn (optional). Reflect gives 1–3 follow-up questions; Learn more gives an
       explainer with sources. Framework echoes appear here, never mid-writing.
   5. Meditate. Unguided timer, or guided audio.
   6. Close. Optional one-line note or mood. Session logged; tomorrow's prompt is
       prepared in the background.

Meditation build, in three steps
v1 — the timer (ships with the first usable build)

       Presets of 5, 10, 15, 20 and 30 minutes plus custom; optional 10–60 second settle-in.
       Bells: start, optional interval, end; two or three bowl sounds.
       The Screen Wake Lock API keeps the screen on and near-black; bells play through
       Web Audio while the app is open.
       Locked phone: a web app cannot reliably ring once the phone locks, so v1 keeps the
       screen on. A Web Push at the end time is the backup, but it follows Silent mode.
       After the sit, an Apple Shortcut logs Mindful Minutes to Apple Health (to verify in P3).
       Stats: minutes this week, sessions, streak.
       With the wrapper: locked-phone bells via Background Audio, a Lock Screen
       countdown via ActivityKit, an AlarmKit end bell that breaks through Silent mode (one
       developer reports late firing), and direct Health logging (mindfulSession).

v2 — guided and richer

       Guided: play audio files you own, with lock-screen controls; or hand off to your usual
       meditation app through a Shortcut and log the sit on return.
       Optional ambient sound (rain, room tone), off by default.
       Optional mood check after the sit, saved to Health with the State of Mind API.
       A meditation focus suggested from today's entry, e.g. “notice the urge to plan”.

v3 — personalised

       Claude writes a 5–10 minute guided script from today's entry; the app reads it aloud
       with text-to-speech. Prototype first: voice quality is the risk.
       Apple Watch: haptic interval bells, start from the wrist.

Timer spec notes for Claude Code
       States: idle → settling → running ↔ paused → finished or abandoned.
       Store the start time and compute remaining time from the clock, never by
       decrementing a counter, so suspension cannot drift it.
       Save the session record at start; on finish, mark it complete and write to Health.

Journal App — Product Brief & Build Framework

       Test: phone locked mid-sit, Silent on, a Focus on, app force-quit, incoming call.
       Sounds: CC0 bowl recordings from Freesound, or record your own bowl.

Gaps
14 gaps. Two change the foundations — the web platform's limits and the AI privacy model
— so they are settled before any feature work.

  #           Gap                               Why it matters         Proposed fix              Phase

  1           Web limits on                     No widgets, Health     Server holds the           P0 Foundations
              iPhone                            or locked-phone        master copy;
                                                bells; iPhone web      Shortcuts bridge the
                                                storage can be         gaps now; Capacitor
                                                cleared                wrapper later

  2           Notebook                          Half your ritual       In-app page scan           P1 Core journal
              capture                           happens on paper;      with a handwriting
                                                the brief names        transcript (CAP-4)
                                                speech and images
                                                only

  3           AI privacy                        Your most private      Private flag per entry,    P1 Core journal
              model                             writing goes to an     encrypted in the
                                                API                    browser; passkey
                                                                       lock; send
                                                                       summaries, not
                                                                       history

  4           Safety rails                      A probing prompt       Tone dial; a distress      P2 Prompt engine
                                                can land badly on a    check pauses deep
                                                heavy day              prompts; UK support
                                                                       card

  5           Search and                        Years of entries are   Full-text search first;    P1 Core journal
              recall                            no use if you          meaning-based
                                                cannot find them       search and Ask my
                                                                       journal, with cited
                                                                       entries, later

  6           Periodic reviews                  Patterns show over     Sunday review,             P5 Mind map
                                                weeks, not days        monthly synthesis,
                                                                       year in review, On
                                                                       this day

Journal App — Product Brief & Build Framework

  #           Gap                               Why it matters        Proposed fix             Phase

  7           Prompt                            Without a signal      Rate each prompt;         P2 Prompt engine
              feedback                          the engine cannot     add your own; re-ask
                                                tell good prompts     old prompts months
                                                from filler           later to see change

  8           Capture outside                   Ideas arrive at the   Two-second Quick          P1 Core journal
              the ritual                        gym or on the Tube    thought (button, or
                                                                      Siri via a Shortcut)
                                                                      that feeds
                                                                      tomorrow's prompt

  9           Onboarding                        First prompts are     15-minute first-run       P2 Prompt engine
              seed                              generic without       conversation: values,
                                                context               open questions, no-
                                                                      go topics

  10          Mood and body                     Patterns need a       Optional one-tap          P3 Session
              signal                            second axis to        mood; opt-in sleep
                                                compare against       and workout context
                                                                      from Health

  11          AI transparency                   A model quietly       Why-this-prompt, an       P2 Prompt engine
              and control                       editing your self-    inbox for map
                                                portrait erodes       changes, AI call log,
                                                trust                 spend cap, AI-off
                                                                      switch

  12          Operations                        Personal apps die     Yearly checklist,         P0 Foundations
                                                of neglect:           pinned Xcode
                                                renewals, keys, iOS   version, versioned
                                                updates               data format, restore
                                                                      drill

  13          People in                         The map would         People nodes off by       P5 Mind map
              entries                           hold views about      default; opt in per
                                                people who never      person
                                                agreed to it

  14          Your other apps                   You already run a     Decide whether            Later
                                                life dashboard with   ritual streaks also
                                                a habits module       flow there, via export
                                                                      or Shortcuts

Journal App — Product Brief & Build Framework

Easy wins
16 wins that stay small because the web, Shortcuts or the plan already does the hard part;
nine land in Phase 1.

  Easy win                                  What you get            Built with             Phase

  Tomorrow's prompt                         A prompt is always      Supabase cron +         P2 Prompt engine
  made by a nightly                         ready, offline too      Claude API
  server job, plus a 7-
  day buffer on the
  phone

  Home Screen install                       Opens full screen,      Web app manifest        P1 Core journal
  with a calm icon                          like an app

  “Start my morning                         Hands-free start,       A Shortcut that         P1 Core journal
  session” on the                           coffee in hand          opens the app
  Action Button and
  Siri

  Alarm-stopped                             When your alarm         Shortcuts               P3 Session
  automation                                stops, the app opens    automation
                                            on today's prompt

  Mindful Minutes                           Meditation history in   Shortcut that logs a    P3 Session
  after every sit                           Apple Health            Health sample

  Automatic titles and                      Every entry named       Claude Haiku 5.5        P1 Core journal
  tags                                      and filed

  Voice entries                             Speak an entry; keep    Browser recording +     P1 Core journal
                                            the audio and the       server transcription
                                            text

  Notebook page scan                        Paper pages become      Camera capture +        P1 Core journal
                                            searchable text         Claude reading the
                                                                    image

  On this day                               Last month's and last   Database query          P1 Core journal
                                            year's entries
                                            resurface

  Nightly backup to a                       A readable copy         Scheduled export        P1 Core journal
  second provider                           outside Supabase

  Passkey sign-in with                      No passwords, quick     WebAuthn                P1 Core journal
  Face ID                                   unlock

Journal App — Product Brief & Build Framework

  Easy win                                  What you get              Built with            Phase

  Why this prompt                           One line, plus links to   Stored with each       P2 Prompt engine
                                            the entries it came       prompt
                                            from

  Highlight to explore                      Select a sentence:        Text selection menu    P2 Prompt engine
                                            Explore, Save as idea,
                                            Make a prompt

  Daily push reminder                       One gentle nudge at       Web Push               P1 Core journal
                                            your time

  Screen kept awake in                      No dimming mid-           Screen Wake Lock       P3 Session
  sessions                                  sentence or mid-sit       API

  Share to journal                          Save a quote or link      A Shortcut in the      P6 Native polish
                                            from any app              Share Sheet

Experience design
Four tabs, one primary action per screen, and a full-screen Session mode that hides
everything else. Calm over clever.

Structure
       Today: the prompt card, Start session, quiet streak dots, Quick thought.
       Journal: timeline and calendar, search, On this day.
       Map: your mind map as a graph or a list by type, plus the inbox of proposed changes.
       Library: the prompt queue (drag to reorder), every prompt by status, your ideas,
       saved explorations.
       Settings (behind your initial): AI and privacy, backups and export, notifications,
       meditation, appearance.
       Session mode: full screen, no tab bar, the six stages of the morning flow.

Entry detail shows the text, attachments, date and title, any framework echo, an Explore
button, and which map nodes the entry fed.

Calm design rules
   1. No badges, red dots, confetti or flames. Streaks are small dots.
   2. One primary action per screen; the rest sit in a menu.

Journal App — Product Brief & Build Framework

   3. Slow, soft motion: 300–500 ms ease-in-out, nothing bounces, Reduce Motion
       honoured.
   4. A dark, low-contrast morning theme first, a light theme second.
   5. A serif for writing, the system sans for interface; generous line height; Dynamic Type
       throughout.
   6. Haptics, once wrapped, only at stage changes and light.
   7. No infinite scroll, no feeds, no recommendations.
   8. AI waits to be asked while you write; suggestions come after.
   9. Plain, warm copy that never guilt-trips: “Welcome back”, not “You broke your streak”.
 10. Every screen works offline.

Branding starter
Three directions to react to. Names are placeholders: check the App Store and the UK
trademark register before choosing.

  Direction             Feel                             Palette                     Type

  First                 The dawn ritual: coffee, a       Dawn amber, ink blue-       Warm serif with a clean
  Light                 quiet room                       black, paper                sans

  Stillwater            A calm surface with              Slate, mist, sand           Humanist serif
                        depth beneath

  Margins               Thinking in the margins          Paper, graphite, one        Book serif, monospace
                        of a notebook                    oxblood accent              for dates

Once you pick a direction, the next step is mood boards and key-screen mockups on a
design canvas.

Platform: web app now, native wrapper later
v1 is an installable web app (PWA) on your iPhone Home Screen. Later, Capacitor wraps
the same code as a native app to add what the web cannot do; that step needs a current
Mac.

  Capability                      v1 web app on iPhone                       Later, with the wrapper

  Install                         Add to Home Screen; since iOS 26           TestFlight app
                                  every site added there opens as a web
                                  app (timeline)

Journal App — Product Brief & Build Framework

  Capability                      v1 web app on iPhone                       Later, with the wrapper

  Daily reminder                  Web Push, which works only once the        Native notifications
                                  app is on the Home Screen
                                  (compatibility)

  Offline writing                 Service worker plus a local IndexedDB      Native store
                                  copy

  Data safety                     The server copy is the master; iPhone      Native store as well
                                  web storage can be evicted (WebKit)

  Voice entries                   Record in the browser; transcribe on       On-device speech
                                  the server

  Notebook                        Camera capture; Claude reads the           On-device OCR as well
  scans                           handwriting

  Meditation                      Screen Wake Lock keeps the screen          Locked-phone bells, AlarmKit,
  timer                           on (iOS 18.4+); bells play while the app   Live Activity
                                  is open

  Apple Health                    An Apple Shortcut logs Mindful             HealthKit directly
                                  Minutes after a sit (to verify in P3)

  Quick start                     Action Button or Siri runs a Shortcut      App Intents, widgets, Control
                                  that opens the app                         Center

  Background                      None on the iPhone (no Background          Background tasks as well
  work                            Sync); scheduled server jobs do it

  App lock                        Passkey sign-in with Face ID               Face ID app lock

Architecture
Every keystroke saves on the iPhone first, then syncs to your own server, which holds the
master copy because iPhone web storage can be cleared. Claude is called only from the
server, so the API key never reaches the browser.

Journal App — Product Brief & Build Framework

architecture · iPhone, iCloud and Claude

The server copy is the one that counts; if Claude or the network is down, writing still
works and syncs later.

Stack

  Layer                       Choice                                   Why

  App                         TypeScript, React and Vite, built as a   Claude Code knows it well;
                              PWA                                      Capacitor wraps it later

  Local copy                  IndexedDB through Dexie                  Offline writing that survives
                                                                       restarts

  Backend                     Supabase: Postgres, auth, file           Already your plan for the life
                              storage, edge functions, London          dashboard's sync
                              region

  Sync                        Write locally, push to Supabase;         Text is never overwritten by the last
                              append-only revisions                    writer

  Hosting                     Static front end on GitHub Pages or      What you already use
                              similar, over HTTPS

Journal App — Product Brief & Build Framework

  Layer                       Choice                                  Why

  AI                          Claude API called from edge             The key never sits in the browser
                              functions; key in server secrets

  Scheduled                   Supabase cron: tomorrow's prompt,       iPhone web apps cannot run in the
  jobs                        nightly analysis, weekly synthesis,     background
                              push reminders

  Backups                     Nightly database and file export to     Independent of Supabase
                              a second provider, plus in-app ZIP
                              export

  Native later                Capacitor plus small Swift              Needs a Mac with current Xcode at
                              extensions for widgets, HealthKit,      that point
                              AlarmKit

Row-level security means only your account can read your rows. Private entries are
encrypted in the browser before upload.

Data model

  Entity                    Key fields                                  Rule

  Entry                     created, updated, original date, title      Never hard-deleted
                            (auto or yours), body (Markdown), kind,
                            source, private flag, prompt, session

  Revision                  entry, body snapshot, saved at              Append-only

  Attachment                entry, type (audio, image, scan, file),     Originals kept
                            file, transcript or OCR text

  Prompt                    text, type, depth, rationale, origins,      Archived, never deleted
                            status, order, rating, re-ask date,
                            context card

  Exploration               topic, explainer, sources, linked item      Saved from Learn more

  Map node                  type, title, summary, confidence, first     No node without evidence
                            and last seen, status, locked by you

  Evidence                  node, entry, exact quote, position,         Quote must match the source text
                            added by

  Map link                  from, to, relation (supports, tension,      Shown on the graph
                            leads to, part of)

Journal App — Product Brief & Build Framework

  Entity                    Key fields                                Rule

  Echo                      entry, framework, summary, matching       Shown only after verification
                            quote, confidence, sources, status

  Session                   date, stages done, prompt, entry,         Streaks computed from sessions,
                            meditation minutes, mood                  not stored

  AI run                    job, model, tokens, cost, what was sent   Visible in Settings

The Postgres schema mirrors this model, so a native app can sync to the same tables later.

Never-lose rules
   1. Save to IndexedDB on every keystroke, debounced about 300 ms, then sync to the
       server within seconds when online.
   2. Every save adds a revision; history is never overwritten.
   3. Deletes go to a bin that never empties itself; emptying it needs a passkey check.
   4. A sync conflict never picks a winner for text: both versions are kept and flagged.
   5. Any entry not yet on the server shows a quiet “not backed up” marker, because the
       server copy is the one that counts.
   6. Every schema change is a versioned migration, preceded by a database backup.
   7. Nightly backup to a second provider, plus a full ZIP export at any time, with an
       automated test that re-imports it.

Offline behaviour
       Writing, voice recording, scans and the timer work offline; transcription and Claude
       jobs wait for the network.
       Entries queue locally and sync when the network returns.
       A 7-prompt buffer is cached on the phone, so a week offline still has a prompt each
       morning.
       Scheduled server jobs do the background work; iPhone web apps get no background
       sync.

AI design
Eight jobs, each with one purpose and a token budget. Sonnet 5.5 does most of the work,
Haiku 5.5 handles bulk imports, and private entries never reach Claude. Estimated running
cost: about US$4.34 a month.

Journal App — Product Brief & Build Framework

Jobs

  Job                     When                  Model          Sends                 Returns

  Quick                   After each entry      Haiku 5.5      The entry; private    Title, tags, privacy
  triage                  syncs                                entries are skipped   flags

  Entry                   10 minutes after      Sonnet 5.5     The entry plus a      Summary, themes,
  analysis                you stop editing,                    compact map           ideas, open
                          or nightly                           summary               questions, map
                                                                                     proposals with
                                                                                     exact quotes, echo
                                                                                     and prompt
                                                                                     candidates

  Prompt                  Nightly server        Sonnet 5.5     Map summary,          Next prompt, why,
  curation                job; tops up when                    recent entry          origins, optional
                          fewer than 3 are                     summaries, open       context card
                          queued                               threads, prompt
                                                               ratings, library
                                                               candidates, your
                                                               depth setting

  Reflect                 On tap                Sonnet 5.5     Today's entry plus    1–3 Socratic
                                                               related past          questions
                                                               entries

  Explore                 On tap                Sonnet 5.5 +   The selected text     Explainer with
                                                web search     or node               cited sources, 2
                                                                                     follow-up prompts

  Echo                    When analysis         Sonnet 5.5 +   The quote and the     Confirm or reject,
  check                   flags a candidate     web search     candidate             with sources
                                                               framework

  Weekly                  Sunday night          Opus 5.5       The week's            Weekly review,
  synthesis                                                    summaries plus the    pattern notes, map
                                                               map                   clean-up proposals

  Import                  Once per import       Haiku 5.5 or   Old notes and         Per-item summary
  mining                                        Sonnet 5.5,    chats                 and map proposals
                                                Batch API                            for your review

Every job must return JSON matching a schema, so the app can validate it. A reply whose
evidence quote is not found word for word in the source is rejected. Model names live in
one config file, so an upgrade is a one-line change.

Journal App — Product Brief & Build Framework

The feedback loop

feedback loop · 6 steps, 2 you control

Write, analyse, propose map changes (you approve), turn them into prompt candidates,
queue them in the library (you reorder), serve today's prompt, write again. Your ratings
and skips steer the curation step.

Prompt engine
       Types: reflective, Socratic follow-up, learning (a concept plus a question), revisit (an
       old thread), re-ask (the same prompt months later), tension (two beliefs pulling
       apart), light, future self.
       Selection rules (defaults to tune): follow open threads first; no theme more than two
       days running; one learning prompt and one re-ask a week; “Lighter today” or a heavy
       recent entry switches to a light prompt.
       Why this prompt: every prompt stores its rationale and the entries or ideas it came
       from.
       Library states: queued → today → answered, skipped or snoozed → archived. Nothing
       is deleted. Skip sends the prompt back to the queue with a skip count.
       Your own prompts live in the same library, marked as yours.
       Context cards: 80–150 words with 1–3 sources, only when a prompt introduces a
       concept.

Mind map
       Node types: theme, value, belief, goal, question, idea (yours), pattern, framework
       (external), person (opt-in).

Journal App — Product Brief & Build Framework

       Evidence rule: no node without at least one exact quote from an entry, chat or import,
       each with its date and source.
       Confidence rises with evidence and recency. Old, unconfirmed nodes fade; they
       never vanish.
       Claude proposes, you decide: proposals land in the Map inbox (add, merge, rename,
       retire). Your edits are locked against AI overwrite.
       Views: a calm graph with a slow layout, a list by type, and a timeline per node showing
       how it changed.
       Reference: the prompt engine reads a compact summary of the map, and Settings
       shows exactly what it read.

Framework echoes
       Two steps: analysis flags a candidate; an echo check with web search confirms it
       before you see anything.
       An echo shows the framework or thinker, a one-line summary, “you wrote: …”, why
       they match, a confidence level, and 2–3 sources such as the Stanford Encyclopedia of
       Philosophy or a primary text.
       Actions: Explore (opens a learn-more thread), Mine (you got there independently:
       logged as your idea, prior art attached), Dismiss.
       Limit: at most one echo per entry and about two a week, so it stays a pleasure, not a
       lecture.

Guardrails
       Role: a thinking partner that asks before it advises, never diagnoses, never invents
       sources, and only quotes your actual words.
       Data: private entries are encrypted in the browser and never sent to Claude; other
       entries go as summaries where possible. By default, Anthropic does not use API
       inputs or outputs to train models (source).
       Heavy days: if an entry reads as acute distress, deep prompts pause, a grounding
       exercise is offered, and a support card shows Samaritans, free on 116 123, day or night.
       You choose whether to carry on.
       Tone dial: gentle to challenging; gentle by default.

Models and cost
About US$4.34 a month at the usage assumed below; prompt caching on the fixed
instructions saves about US$0.57. One-off imports cost about US$3.52 for 1,000 notes on
Haiku and 150 chats on Sonnet, both via the Batch API.

Journal App — Product Brief & Build Framework

  Job                                           Model       Runs a          Tokens in / out per    Est. US$ a
                                                            month           run                    month

  Weekly synthesis                              Opus 5.5    4.3             40k / 4k               1.03

  Prompt curation                               Sonnet      30              12k / 1k               1.02
                                                5.5

  Explore, 2 searches                           Sonnet      15              15k / 1.5k             0.98
  each                                          5.5

  Entry analysis                                Sonnet      30              6k / 1.5k              0.81
                                                5.5

  Reflect                                       Sonnet      20              4k / 0.5k              0.26
                                                5.5

  Echo check, 1 search                          Sonnet      8               6k / 0.8k              0.24
  each                                          5.5

  Total                                                                                            4.34

Prices per million tokens, in / out: Sonnet 5.5 $2 / $10, Opus 5.5 $4 / $20, Haiku 5.5 $0.10 /
$0.50 for prompts up to 100K tokens. Batch API 50% off; web search $10 per 1,000
(pricing). Token counts are estimates: the AI run log shows real numbers within a week.
Set a monthly spend limit in the Claude Console.

Imports
All three sources import with their original dates. The only manual steps are exporting
from Notes and requesting your Claude export.

  Source                                         How to get it out                 What the app does

  Apple Notes on iPhone                          Open a note, Share, Export as     Fine for a handful of notes
  (iOS 26+)                                      Markdown; one note at a time

  Apple Notes on a Mac                           Select several notes and          Bulk; not available on macOS
  with macOS Tahoe                               export them as Markdown           Sequoia

  Apple Notes on any Mac                         The free Exporter app: every      Best route while your Mac
                                                 note to Markdown, creation        stays on Sequoia
                                                 and modification dates kept,
                                                 folders kept

Journal App — Product Brief & Build Framework

  Source                                        How to get it out                What the app does

  Paper notebooks                               Scan pages in the app;           Page images kept as originals
                                                handwriting becomes text;
                                                set the date per page or per
                                                batch

  Other digital journals                        Markdown, text, PDF or Docs      Parsed into entries with
                                                files; Day One's JSON export     original dates

  Claude chats                                  claude.ai Settings, Privacy,     Lists conversations by title and
                                                Export data, on the web or       date; you tick the personal-
                                                desktop app, not mobile; the     development ones
                                                emailed link expires after 24
                                                hours

Import pipeline
   1. Files land in an import batch that can be undone as a unit.
   2. Each item becomes an entry with its source and original date; duplicates are dropped
       by content hash.
   3. Triage adds titles, tags and privacy flags; you can mark items private before any AI
       step.
   4. Claude analyses the batch through the Batch API: summaries plus map proposals with
       exact quotes.
   5. You accept, edit or reject the proposals before they reach the map.
   6. Every imported item shows where it came from and its original date.

For Claude chats, your turns and Claude's replies are tagged separately. Map evidence
quotes only your own words; Claude's past suggestions are context, never your beliefs.

Privacy, security and safety
Treat every entry as the most private file you own: locked on the phone, encrypted in
sync, minimised before it reaches Claude, and never used for model training.

  Risk                                            Control

  Phone lost or borrowed                          Passkey sign-in with Face ID; short session timeout

  Server breach                                   Supabase row-level security, encryption at rest,
                                                  London region; private entries encrypted in the
                                                  browser with a key only you hold

Journal App — Product Brief & Build Framework

  Risk                                          Control

  Text sent to Claude                           Private flag per entry; summaries rather than raw
                                                history; AI call log; AI-off switch

  Model training                                By default, Anthropic does not train on API inputs
                                                or outputs (source)

  Your own accidental delete                    A bin that never empties itself, revision history,
                                                nightly backups

  People you write about                        No person nodes unless you opt in; no lookups
                                                about people

  A heavy day                                   Distress check, grounding exercise, support card,
                                                tone dial

One trade-off to decide: browser-encrypted private entries cannot be analysed or
searched on the server, and losing the key loses them. Keep the key in your password
manager.

Safety
       A reflective tool, not therapy: no diagnosis, no treatment advice.
       Distress protocol: deep prompts pause, a grounding exercise is offered, and a support
       card shows Samaritans on 116 123, free at any hour, and NHS 111. You choose whether
       to continue.
       “Not today” always works; Claude never pushes you to keep digging.
       If the app is ever shared beyond you, a privacy policy, App Store health-data rules and
       UK GDPR rules for health data come into scope. Out of scope while it is yours alone.

Build framework
You direct, Claude Code builds, your iPhone tests. Work moves in small vertical slices
against the Requirements table, and data-safety tests must pass before anything merges.

Setup (Phase 0)
       Private GitHub repo, with this brief saved as docs/brief.md
       Supabase project in the London region, with auth
       Front-end hosting over HTTPS (GitHub Pages or similar)
        CLAUDE.md with the rules below
       Claude Console account; API key stored as a Supabase secret; monthly spend limit

Journal App — Product Brief & Build Framework

       Sync and backup spike: offline edits, a conflict, a restore from the nightly backup
       Hello-world installed on your iPhone Home Screen, with a test push

Rules for CLAUDE.md
   1. TypeScript, React, Vite, Dexie and Supabase; no other packages without asking first.
   2. Never delete or overwrite user data. Every migration ships with a backup step and a
       test.
   3. One feature per branch; every change builds, runs and has tests.
   4. Explain each change in plain English in the pull request.
   5. AI prompts live as versioned files, with sample inputs and expected outputs.
   6. Model IDs and token budgets live in one config file.
   7. The Claude key lives only in server secrets, never in front-end code.

If you run Claude Code with permissions bypassed, add a hook in this repo that blocks
commands which delete files or reset the store.

The loop for each feature
   1. Spec. Claude drafts a one-page spec from the Requirements table: story, acceptance
       criteria, data changes, edge cases. You approve it.
   2. Build. Claude Code implements it on a branch as a vertical slice: screen, data and tests
       together.
   3. Check. CI runs the tests on every push (GitHub Actions).
   4. Try. The branch deploys to a preview URL; you use it on your iPhone for a day or two
       and log issues in GitHub Issues, in your own words.
   5. Merge. When the acceptance criteria and the data-safety suite pass.

Journal App — Product Brief & Build Framework

Phases and gates

roadmap · 7 phases, 7 gates

Weeks and gate thresholds are proposals to tune; a phase is done only when its gate
passes on your phone.

Scope by phase, using the requirement IDs:

       P0 Foundations: the setup checklist; a first draft of design tokens.
       P1 Core journal: CAP-1 to CAP-4, CAP-6, DATA-1 to DATA-6, NOTIF-1, NOTIF-2, UX-1, UX-
       2; passkey sign-in, full-text search, Quick thought, a starter set of 30 hand-written
       prompts.
       P2 Prompt engine: PRM-1 to PRM-7, LOOP-1 to LOOP-4; nightly prompt job,
       onboarding seed, guardrails, AI call log, spend cap.

Journal App — Product Brief & Build Framework

       P3 Session and meditation: RIT-1, RIT-2, PROG-1, PROG-2; Wake Lock timer, Mindful
       Minutes Shortcut.
       P4 Imports: IMP-1 to IMP-3 and the review queue.
       P5 Mind map and echoes: MAP-1 to MAP-5, ECHO-1, ECHO-2, PROG-3, PROG-4; the
       weekly review.
       P6 Polish and native wrapper: UX-3, UX-4, CAP-5, RIT-3; a Shortcuts pack, then a
       Capacitor build with widgets, HealthKit and locked-phone bells (needs a current
       Mac).
       Later: personalised guided meditation, Apple Watch, iPad and Mac, Ask my journal,
       year in review.

Indicative pace: about 17 weeks at 6–10 hours a week. The gates matter more than the
dates.

Testing
       Data-safety suite (must pass to merge): force-quit mid-sentence; three days in
       airplane mode; a two-device conflict; delete, reinstall and restore; export then re-
       import; a migration with its backup.
       Unit tests: prompt library states, streak calculation, timer maths.
       UI tests: the six session stages; skip and reorder.
       AI evals: 20 sample entries checked for valid JSON, quotes found word for word,
       sensible echoes and tone; rerun whenever a prompt file or model changes.
       Cost check: each job stays inside its token budget.

Costs and risks
Running costs are about US$4–5 a month for Claude, with free tiers for hosting and the
database to start. Apple's fee and a Mac arrive only with the native wrapper. The top risk
is data loss, and most of this plan exists to prevent it.

Running costs

  Item                                  Cost                            Notes

  Claude API                            About US$4–5 a month; imports   Spend limit in the Console
                                        about US$3.50 once

  Supabase                              Free tier to start              Paid plan if storage or backups
                                                                        need it (pricing)

Journal App — Product Brief & Build Framework

  Item                                  Cost                                   Notes

  Hosting                               Free on GitHub Pages                   HTTPS included

  Storage growth                        Small at journal sizes                 Voice at 64 kbps is about 0.5 MB a
                                                                               minute; 10 minutes a day is about
                                                                               1.75 GB a year

  Apple Developer                       99 USD a year, only with the           TestFlight and native capabilities
  Program                               wrapper

  Apple silicon Mac                     One-off, only with the wrapper, if     A Mac mini, or a used Apple
                                        yours is Intel                         silicon Mac, e.g. from Hoxton
                                                                               Macs

Risks

  Risk                                           Impact                             Mitigation

  Data loss from a bad                           The one unforgivable failure       Backup before every
  migration or AI-written                                                           migration; data-safety suite;
  code                                                                              protected main branch

  iPhone web limits                              No locked-phone bells,             Server master copy;
                                                 widgets or Health; storage         Shortcuts now; Capacitor
                                                 can be cleared; Apple added        wrapper in P6
                                                 nothing for web apps in iOS
                                                 27

  Phone-to-server sync bugs                      Duplicates or missing edits        P0 spike; append-only
                                                                                    revisions; nightly backups

  Emotional weight                               A heavy day gets heavier           Guardrails, tone dial, support
                                                                                    card

  Invented frameworks or                         Trust erodes                       Verification with web
  sources                                                                           search; sources shown;
                                                                                    confidence levels

  Generic, repetitive prompts                    You stop opening the app           Onboarding seed, ratings,
                                                                                    evals, weekly tuning

  Cost creep                                     Surprise bills                     Token budget per job; Haiku
                                                                                    for bulk; spend limit

  Scope creep                                    Nothing ships                      Phase gates; the Later
                                                                                    column

Journal App — Product Brief & Build Framework

  Risk                                          Impact                     Mitigation

  Yearly iOS changes                            Breakage each September    Pinned Xcode version; a
                                                                           planned update week

  Background tasks not                          Nightly analysis skipped   Nothing essential depends
  running                                                                  on them

Open decisions
13 decisions; none blocks Phase 0 now.

       Your Mac. Matters only for the native wrapper in P6. Apple menu, About This Mac. If it
       says Intel, the newest Xcode it can run is 26.3 (iOS 26.2 SDK), and only on macOS
       Sequoia 15.6 or later: Xcode 27 needs macOS Tahoe 26.6, and no Intel MacBook Air can
       install Tahoe. Recommended: an Apple silicon Mac. Stopgap: build locally with Xcode
       26.3 and ship TestFlight builds from Xcode Cloud, after checking 26.3 can install on
       your iPhone's iOS version.
       Your iPhone. Model and iOS version. Needed to test push, Wake Lock and Shortcuts.
       Just for you, or a product later? It changes the backend, the privacy work and
       onboarding.
       AI budget. Proposed cap: US$10 a month.
       What Claude may see. Proposed: everything not marked private, sent as summaries
       where possible.
       Snapshot format. Nightly backup as readable Markdown, or encrypted with your own
       key.
       Guided meditation. Which app do you use now? Hand off to it, or import your own
       audio?
       Streaks. One ritual streak, or separate journaling and meditation streaks?
       People in the map. Off by default; keep it that way?
       “Like we did on reminders.” That chat isn't visible from this project. Paste the gist or a
       link so the prompt engine copies what worked.
       Paper or phone. Roughly how often you write on paper; it sets how early scanning
       lands.
       Existing material. Rough counts of notes, notebooks and Claude chats.
       Brand direction. First Light, Stillwater, Margins, or another.

Journal App — Product Brief & Build Framework

Sources
Reference apps worth studying, then the pages this brief relies on.

Reference products

  App                          Worth studying for

  Apple Journal                The native baseline: Journaling Suggestions, lock,
                               schedule (user guide)

  Day One                      Streaks, calendar, prompts, encryption, import and
                               export

  Rosebud                      AI follow-up questions, pattern insights, voice
                               journaling

  Mindsera                     Writing templates built on 50+ mental models: the
                               nearest thing to framework echoes

Pages used
       Apple: Xcode system requirements · Xcode 26 release notes · What's new in iOS 27 ·
       macOS Tahoe compatible computers · Foundation Models · SpeechAnalyzer ·
       RecognizeDocumentsRequest · Journaling Suggestions · AlarmKit · AlarmKit late-
       firing report · HealthKit category types · State of Mind, WWDC24 · CloudKit
       encrypted fields · Advanced Data Protection in the UK · Developer memberships ·
       Xcode Cloud
       Anthropic: Claude API pricing · Is my data used for model training? · Export your
       Claude data · Claude Code overview
       Other: Apple Notes Markdown on iPhone, AppleInsider · Bulk Markdown export on
       macOS, AppleWorld.Today · Exporter · Samaritans · NHS help for suicidal thoughts ·
       Freesound
       Web platform: iOS PWA compatibility, firt.dev · WebKit storage policy · iOS web app
       timeline, MobiLoud · Capacitor · Supabase · Dexie

```
