import { FACTS } from '@/lib/site-facts';
import type { ContentPage } from './types';

const { listeners, queueSongs, sync, closeAfterMinutes } = FACTS;

const threeSteps = {
  start: {
    name: 'Start a jam',
    text: 'Press "Start a jam", type a nickname, and you get a link, a 6-character code and a QR code. No sign-up, nothing to install.',
  },
  add: {
    name: 'Add songs',
    text: 'Search for a song inside the jam, or paste a YouTube video or playlist link. Everything goes into one shared queue that anyone in the jam can add to.',
  },
  share: {
    name: 'Share the link or code',
    text: `Send the link in your chat, read out the code, or show the QR. Everyone who opens it hears the same song at the same second, ${sync}.`,
  },
};

export const pillarPage: ContentPage = {
  slug: 'listen-to-music-together',
  title: 'How to Listen to Music Together Online (Free, No App)',
  description:
    'Share one link and everyone hears the same song at the same second. Free, no app, no account to join, up to 50 people. Here is how it works in 3 steps.',
  h1: 'How to listen to music together online',
  crumb: 'Listen to music together',
  kind: 'guide',
  lastModified: '2026-11-28',
  showKeyFacts: true,
  answer: `To listen to music together online, one person starts a jam on Jamwave and shares the link or 6-character code. Everyone who opens it hears the same song at the same second, ${sync}. It is free, works in any phone or laptop browser, and needs no app or account to join.`,
  steps: {
    heading: 'How to listen to music together online in 3 steps',
    items: [threeSteps.start, threeSteps.add, threeSteps.share],
  },
  sections: [
    {
      heading: 'What does "listening together" actually mean?',
      paragraphs: [
        FACTS.definition,
        'It is different from sharing a song. When you forward a link, each person plays it whenever they get to it, if they get to it. In a jam everyone’s own player is kept at the same moment, so a chorus lands for all of you at once, a reaction in the chat is about the same beat, and nobody has to count down "3, 2, 1, play".',
      ],
    },
    {
      heading: 'Why not just send song links, or play music over a call?',
      paragraphs: [
        'Links back and forth are a pile, not a listening session: nobody hears anything at the same time, and half the links are never opened. Music over a video call is one phone’s speaker picked up by a microphone, compressed by the call, and cut off every time someone talks.',
        `A jam keeps the quality (each person’s own player plays the original) and the timing (${sync}) at the same time, and it scales: up to ${listeners} people can be in one jam, which no call or group chat does well.`,
      ],
    },
    {
      heading: 'What can you do inside a jam?',
      paragraphs: [
        'Everything you would expect from listening in the same room, without being in the same room.',
      ],
      bullets: [
        `One shared queue of up to ${queueSongs} songs. Anyone can add to it, unless the host locks it.`,
        'Chat beside the music, and emoji reactions that float up for everyone.',
        'Vote to skip: when enough people vote, the song moves on.',
        'Host controls: decide who can play, pause and skip, hand over hosting, remove someone.',
        'A free account (optional) adds public playlists and lets friends see when you are in a jam.',
      ],
    },
    {
      heading: 'Does it work on phones?',
      paragraphs: [
        'Yes, in the browser on Android and iPhone, with nothing to install. The music plays through the official YouTube player, so the video is on screen; you can shrink it to save data.',
        'Phone browsers pause video when you switch apps. Tap the fullscreen button inside the video and then go Home: picture-in-picture keeps it playing in a small floating window while you message, scroll or lock the screen.',
      ],
    },
    {
      heading: 'Is it free, and is it safe?',
      paragraphs: [
        `Free. There is no paid tier and no ads from us; ${FACTS.source.toLowerCase().replace(/\.$/, '')}, so there is nothing for us to charge for.`,
        `Only people with your link or code can join; jams are not listed anywhere public. The host can lock the queue or remove anyone, and a jam closes ${closeAfterMinutes} minutes after the last person leaves. You do not give us an email address or a phone number to listen.`,
      ],
    },
    {
      heading: 'Who is it for?',
      paragraphs: [
        'Anyone who wants the same song at the same second with someone who is not in the room: a partner in another city, a hostel group that scattered for the holidays, a study group in different towns during exam season, or thirty fans hearing an album at midnight.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Do we all have to press play at the same time?',
      a: `No. The host’s playback is the clock and everyone’s player follows it automatically, ${sync}. If someone joins late, their player jumps to where everyone else is.`,
    },
    {
      q: 'How many people can listen at once?',
      a: `Up to ${listeners} listeners per jam, with a shared queue of up to ${queueSongs} songs.`,
    },
    {
      q: 'Does everyone need an account?',
      a: 'No. Nobody needs an account to start or join a jam: a nickname is enough. A free account is optional and adds public playlists and friends.',
    },
    {
      q: 'What if someone’s internet is slow?',
      a: 'Their player keeps playing smoothly a little behind instead of stuttering, and tightens back up as soon as the connection recovers. Everyone else is unaffected.',
    },
    {
      q: 'Does it work on iPhone and Android?',
      a: 'Yes, in Safari or Chrome, with no app. Use the video’s fullscreen button and then go Home to keep the music playing in picture-in-picture.',
    },
  ],
  related: ['long-distance-couples', 'friend-groups', 'youtube-together'],
  cta: { line: 'Try it with one friend right now.', sub: 'No sign-up. Share the link; they are in.' },
};

export const youtubeTogetherPage: ContentPage = {
  slug: 'youtube-together',
  title: 'Listen to YouTube Together With Friends (Free, Synced)',
  description:
    'Paste a YouTube link or search, share your jam link, and up to 50 friends hear the same song at the same second. Free, no app, no account needed.',
  h1: 'Listen to YouTube together with friends, in sync',
  crumb: 'YouTube together',
  kind: 'guide',
  lastModified: '2026-11-28',
  useCase: {
    title: 'Anything on YouTube',
    line: 'Search, or paste a video or playlist link. It plays through the official player, for everyone at once.',
  },
  answer: `Jamwave lets you listen to YouTube together, in sync and free. Start a jam, search a song or paste a YouTube video or playlist link, then share the jam link or code. Everyone who opens it hears the same track at the same second through the official YouTube player. Nothing to install, no account to join, up to ${listeners} listeners.`,
  steps: {
    heading: 'How to listen to YouTube together on Jamwave',
    items: [
      threeSteps.start,
      {
        name: 'Paste a link or search',
        text: `Paste any YouTube video link, or a whole playlist link, and it goes into the shared queue (up to ${queueSongs} songs). Or search by name inside the jam.`,
      },
      threeSteps.share,
    ],
  },
  sections: [
    {
      heading: 'Can I add a whole YouTube playlist?',
      paragraphs: [
        `Yes. Paste the playlist link and its songs are added to the queue in order, up to ${queueSongs} at a time. Anyone in the jam can keep adding, reorder what is coming up (if the host allows it) or vote to skip.`,
      ],
    },
    {
      heading: 'Why does Jamwave use the official YouTube player?',
      paragraphs: [
        'Because that is where the music is. Jamwave does not host, copy or re-stream any audio; it tells each person’s official YouTube player what to play and keeps them at the same position. Playback, quality options and anything YouTube shows inside the player are exactly as on YouTube. That is also why the video is visible: YouTube’s terms require its player to stay on screen while music plays.',
      ],
    },
    {
      heading: 'Does it work on phones?',
      paragraphs: [
        'Yes, in the browser. Shrink the video to save data, or pick a lower quality in the player’s own menu. To keep listening while you use other apps, tap the fullscreen button inside the video and then go Home: picture-in-picture keeps it playing.',
      ],
    },
    {
      heading: 'Can we watch videos together too?',
      paragraphs: [
        'The video plays in sync for everyone, so yes, a music video or a live performance works. Jamwave’s controls are built around music: a queue, reactions, vote to skip, and a host who keeps things moving.',
      ],
    },
    {
      heading: 'What are the limits?',
      paragraphs: [
        `Up to ${listeners} listeners per jam and ${queueSongs} songs in the queue. Searching inside Jamwave uses a daily YouTube search allowance shared by everyone; when it runs out, pasting a link still works. A jam closes ${closeAfterMinutes} minutes after the last person leaves, and the queue is remembered on your device so you can rebuild it in one tap.`,
      ],
    },
  ],
  faqs: [
    {
      q: 'Do I need a browser extension?',
      a: 'No. Jamwave is a website; open the link and it works, on phones too.',
    },
    {
      q: 'Can I paste a YouTube playlist link?',
      a: `Yes. Its songs are added to the shared queue, up to ${queueSongs} at a time.`,
    },
    {
      q: 'Why does search sometimes say the daily budget is used up?',
      a: 'Searching inside Jamwave uses a daily YouTube search allowance shared by everyone, and new apps get a small one. Pasting a YouTube video or playlist link always works and never counts against it.',
    },
    {
      q: 'Does the video have to stay on screen?',
      a: 'On a laptop it stays in the tab; you can shrink it. On a phone, tap the video’s fullscreen button and then go Home: picture-in-picture keeps the music playing while you use other apps.',
    },
    {
      q: 'Is Jamwave affiliated with YouTube?',
      a: 'No. Jamwave plays music through YouTube’s official embedded player and does not host or copy any audio.',
    },
  ],
  related: ['listen-to-music-together', 'listening-party', 'help'],
  cta: { line: 'Have a link ready? Paste it in.', sub: 'Search or paste any YouTube video or playlist.' },
};

export const longDistancePage: ContentPage = {
  slug: 'long-distance-couples',
  title: 'Listen to Music Together in a Long-Distance Relationship',
  description:
    'Same song, same second, even in different cities. Start a jam, send one link, and listen together on your phones while you talk. Free, no app, no account.',
  h1: 'Listen to music together, even when you’re in different cities',
  crumb: 'Long-distance couples',
  kind: 'guide',
  lastModified: '2026-11-28',
  useCase: {
    title: 'Couples in different cities',
    line: 'Same song, same second, goodnight calls included. Add songs for each other and chat beside the music.',
  },
  answer: `Long-distance couples can hear the same song at the same second with Jamwave. One of you starts a jam and sends the link; the other opens it on their phone. Keep your call running on another device, add songs to a shared queue, and react in real time. Free, with no app or account needed to join.`,
  steps: {
    heading: 'How to listen to the same song at the same time with your partner',
    items: [
      {
        name: 'One of you starts a jam',
        text: 'Press "Start a jam" and type a nickname. You get a link and a 6-character code. No sign-up.',
      },
      {
        name: 'Send the link',
        text: 'Drop it in your chat. Your partner opens it on their phone, types a nickname, and they are in.',
      },
      {
        name: 'Add songs for each other',
        text: `Search or paste YouTube links into one shared queue. Both players stay at the same second, ${sync}, whatever the distance between Bengaluru and Delhi, or Pune and Dubai.`,
      },
    ],
  },
  sections: [
    {
      heading: 'Why sending song links back and forth isn’t the same',
      paragraphs: [
        'You know the routine: "listen to this", a link, and a reply three hours later. It is sharing, but it is not listening together. The whole point of a song you both love is hearing the same line at the same moment.',
        `A jam gives you that. Both of you press nothing; the players follow one clock, ${sync}, so the chorus lands for both of you at once and a "this part" in the chat is about the same part.`,
      ],
    },
    {
      heading: 'Ideas for a long-distance music night',
      paragraphs: ['A few that people keep coming back to.'],
      bullets: [
        'The goodnight song: one song, same second, before you both sleep. Takes two minutes.',
        'One for one: take turns adding to the queue. Nobody DJs the whole night.',
        'Release night: an album you have both been waiting for, front to back, with reactions on every track.',
        'The time-gap night: India to Dubai, Toronto or Sydney. Whoever is awake starts the jam; there is nothing to schedule.',
        'The 12 a.m. birthday song. Queue it at 11:55, press play together at midnight.',
      ],
    },
    {
      heading: 'Can we talk while the music plays?',
      paragraphs: [
        'Chat and reactions are built into the jam. If you want voice, run your usual call on another device, or keep the call on the phone and the jam on a laptop: a phone will generally not play the jam and a call through the same speaker at once.',
      ],
    },
    {
      heading: 'Does it eat data or battery?',
      paragraphs: [
        'About as much as watching the same video on YouTube at the same quality, because that is what is playing. Shrink the video, or choose a lower quality in the player’s own menu, and it drops a lot. Picture-in-picture with the screen dimmed is the lightest way to run a long night.',
      ],
    },
    {
      heading: 'What happens when one of you falls asleep?',
      paragraphs: [
        `Nothing dramatic. The jam keeps playing for whoever is still in it, and closes ${closeAfterMinutes} minutes after the last person leaves. Your queue is remembered on your device, so tomorrow’s jam starts where tonight’s left off, in one tap.`,
      ],
    },
  ],
  faqs: [
    {
      q: 'Do we need the same kind of phone?',
      a: 'No. Any phone, tablet or laptop browser works, and they can be different from each other.',
    },
    {
      q: 'Can only one of us control the music?',
      a: 'The host decides: let both of you control playback, or keep it to the host. The queue can also be locked.',
    },
    {
      q: 'Does it work across countries and time zones?',
      a: 'Yes. It is live, so whoever is awake starts the jam and sends the link. There is nothing to schedule.',
    },
    {
      q: 'Is our jam private?',
      a: 'Only people with the link or 6-character code can join, and jams are not listed anywhere public. The host can remove anyone. If you both have free accounts and are friends on Jamwave, the other can see when you are in a jam; that can be turned off in Settings.',
    },
    {
      q: 'Can we keep listening with the phone locked?',
      a: 'Use picture-in-picture: tap the video’s fullscreen button, then go Home. The music keeps playing in a small window; dim the screen to save battery.',
    },
  ],
  related: ['listen-to-music-together', 'listening-party', 'help'],
  cta: { line: 'Tonight’s song. Same second.', sub: 'Send the link. They open it. That is it.' },
};

export const friendGroupsPage: ContentPage = {
  slug: 'friend-groups',
  title: 'Listen to Music With Friends Online — Shared Queue, Free',
  description:
    'One link, up to 50 friends, one shared queue everyone can add to. Hear the same song at the same second, chat, react, vote to skip. Free, no app needed.',
  h1: 'Listen to music with your friends online, wherever everyone is',
  crumb: 'Friend groups',
  kind: 'guide',
  lastModified: '2026-11-28',
  useCase: {
    title: 'Friend groups that scattered',
    line: `One queue up to ${listeners} people can add to. Vote to skip the bad ones. Nobody has to be the DJ.`,
  },
  answer: `To listen to music with friends online, start a jam on Jamwave and drop the link or 6-character code into your group chat. Up to ${listeners} people can join from any phone or laptop, hear the same song at the same second, and add tracks to one shared queue. Chat, react, vote to skip. Free, nothing to install.`,
  steps: {
    heading: 'How to start a jam for your group',
    items: [
      threeSteps.start,
      {
        name: 'Paste it in the group',
        text: 'Share the link or the code in your group chat. Everyone opens it in their browser, types a nickname, and they are in.',
      },
      {
        name: 'Let everyone add',
        text: `The queue holds up to ${queueSongs} songs and anyone can add to it. If it gets out of hand, the host can lock it or let people vote to skip.`,
      },
    ],
  },
  sections: [
    {
      heading: 'Why a group chat full of song links isn’t listening together',
      paragraphs: [
        'The hostel group that scattered after college, the school friends now in five cities: the chat is full of links and nobody opens them at the same time. A jam turns that pile into one queue, playing at the same second for everyone who is in it.',
      ],
    },
    {
      heading: 'Keeping 20 people from fighting over the queue',
      paragraphs: ['Jamwave gives the host a few simple tools, and uses none of them unless needed.'],
      bullets: [
        'Who controls playback: everyone, or only the host, or specific people.',
        'Lock the queue so only people with control can add songs.',
        'Vote to skip: when enough people vote, the song moves on without an argument.',
        'Remove someone from the jam; they cannot just reload and come back.',
        'Hand over hosting when you leave, or it passes automatically to whoever has been there longest.',
      ],
    },
    {
      heading: 'Nights that work',
      paragraphs: ['Groups use it for the same handful of things.'],
      bullets: [
        'Semester break: the hostel wing, back home in different towns, same queue on Saturday night.',
        'Placement season: late-night company while everyone preps for the same interviews.',
        '"Everyone adds three songs": a Sunday hour where the queue is the conversation.',
        'The night before the trip: build the road-trip queue together, then rebuild it in the car.',
      ],
    },
    {
      heading: 'Phones, laptops, tablets: does it matter?',
      paragraphs: [
        'No. Some can be on laptops and some on phones; every browser follows the same clock. Phone users can shrink the video or use picture-in-picture to keep the music going while they chat.',
      ],
    },
    {
      heading: 'When the night ends',
      paragraphs: [
        `A jam closes ${closeAfterMinutes} minutes after the last person leaves. The queue is remembered on the devices that were in it, so whoever starts next week’s jam can rebuild tonight’s in one tap.`,
      ],
    },
  ],
  faqs: [
    {
      q: 'How many friends can join one jam?',
      a: `Up to ${listeners} listeners, with one shared queue of up to ${queueSongs} songs.`,
    },
    {
      q: 'Can anyone add songs, or just the host?',
      a: 'Anyone can add by default. The host can lock the queue so only people with control can add.',
    },
    {
      q: 'What if someone adds a bad song?',
      a: 'Vote to skip, or anyone with control can skip it outright. The host can also remove a person from the jam.',
    },
    {
      q: 'What happens if the host leaves?',
      a: 'Hosting passes to whoever has been in the jam longest, so the music keeps going. The host can also hand it to a specific person before leaving.',
    },
    {
      q: 'Is there a time limit?',
      a: `No. A jam runs as long as someone is in it, and closes ${closeAfterMinutes} minutes after the last person leaves.`,
    },
  ],
  related: ['listening-party', 'study-together', 'listen-to-music-together'],
  cta: { line: 'Start it, paste it in the group.', sub: `Up to ${listeners} people, nothing to install.` },
};

export const studyTogetherPage: ContentPage = {
  slug: 'study-together',
  title: 'Study Together Online With Synced Music (Free, No App)',
  description:
    'Put on one focus playlist and study with friends in different cities, hearing the same track at the same time. Free, no account needed to join.',
  h1: 'Study together online with the same music playing',
  crumb: 'Study together',
  kind: 'guide',
  lastModified: '2026-11-28',
  useCase: {
    title: 'Studying together',
    line: 'One focus playlist, a locked queue, the same track on every desk. Company without a video call.',
  },
  answer:
    'To study with friends online with the same music, start a jam on Jamwave, queue a focus playlist and share the link. Everyone hears the same track at the same second on their own device, so nobody has to manage the music. Lock the queue to keep it distraction-free. Free, no account needed to join.',
  steps: {
    heading: 'How to set up a study jam',
    items: [
      threeSteps.start,
      {
        name: 'Paste a long focus playlist',
        text: 'Paste a YouTube playlist link, or two or three long focus mixes, so the queue runs for hours without anyone touching it.',
      },
      {
        name: 'Share, then lock the queue',
        text: 'Send the link to your group and turn off "Anyone can add songs" in the jam settings. Now it is background music, not a group project.',
      },
    ],
  },
  sections: [
    {
      heading: 'Why study with music in sync?',
      paragraphs: [
        'A video call for a study session eats data and attention; a silent chat feels like studying alone. One playlist that everyone hears at the same moment sits in between: you know the others are at their desks, the same track changes for all of you at once, and nobody has to speak.',
      ],
    },
    {
      heading: 'Setups that work',
      paragraphs: ['Keep it simple; the music is not the point.'],
      bullets: [
        'A 50-minute playlist, then a 10-minute break where the queue is unlocked and everyone adds one song.',
        'Coaching batchmates in different cities during exam season: same jam link every evening, rebuilt in one tap.',
        'Hostel friends who went home: the common-room playlist, now in six houses.',
        'A study date with your partner in another city: one queue, chat for breaks.',
      ],
    },
    {
      heading: 'Will it distract us?',
      paragraphs: [
        'Lock the queue, keep playback control with the host, and use the chat only for breaks. With the queue locked nobody can change the song mid-session, and there is nothing to fiddle with.',
      ],
    },
    {
      heading: 'Does it keep playing behind other tabs and apps?',
      paragraphs: [
        'On a laptop it keeps playing in a background tab while you work in another. On a phone, tap the video’s fullscreen button and then go Home: picture-in-picture keeps the music running while you use your notes app.',
      ],
    },
    {
      heading: 'How much data does a long session use?',
      paragraphs: [
        'About as much as watching that video on YouTube at the same quality, because that is what is playing. Shrink the video or pick the lowest quality in the player’s menu; a laptop on Wi-Fi is the most comfortable way to run three hours.',
      ],
    },
  ],
  faqs: [
    {
      q: 'Can we leave it running for three or four hours?',
      a: `Yes. A jam runs as long as someone is in it, and closes ${closeAfterMinutes} minutes after the last person leaves. Queue enough music or a long playlist and nobody has to touch it.`,
    },
    {
      q: 'Can I stop friends changing the song mid-session?',
      a: 'Yes. Turn off "Anyone can add songs" and keep playback control with the host. Then the queue is read-only for everyone else.',
    },
    {
      q: 'Do we need to be on a call too?',
      a: 'No. Most study groups use the jam’s chat for breaks and nothing else. Add a call only if you want voices.',
    },
    {
      q: 'Can I join from a laptop while a friend uses a phone?',
      a: 'Yes. Every browser follows the same clock, whatever the device.',
    },
    {
      q: 'Can I save the study queue for tomorrow?',
      a: 'It is remembered on your device and can be rebuilt in one tap. With a free account you can also save it as a playlist and start tomorrow’s jam from it.',
    },
  ],
  related: ['friend-groups', 'long-distance-couples', 'listen-to-music-together'],
  cta: { line: 'One playlist. Everyone’s desk.', sub: 'Lock the queue and get back to work.' },
};

export const listeningPartyPage: ContentPage = {
  slug: 'listening-party',
  title: 'How to Host an Online Listening Party (Free, Up to 50)',
  description:
    'Host a birthday or album-release listening party: one link, up to 50 guests, everyone hears the same second and adds to the queue. Free, no app.',
  h1: 'Host an online listening party your friends can join in one tap',
  crumb: 'Online listening party',
  kind: 'guide',
  lastModified: '2026-11-28',
  useCase: {
    title: 'Birthday and album nights',
    line: `Queue the songs, send one link at party time, and up to ${listeners} guests hear every track at the same second.`,
  },
  answer: `An online listening party is a session where friends in different places hear the same music at the same moment. To host one, start a jam on Jamwave, build the queue, and send the link or code. Up to ${listeners} guests join with nothing to install, hear every track at the same second, and can chat, react and add songs. Free.`,
  steps: {
    heading: 'How to host an online listening party in 3 steps',
    items: [
      {
        name: 'Start a jam and build the queue',
        text: `Start the jam early and add the songs in order: paste a YouTube playlist link for an album, or search track by track. The queue holds up to ${queueSongs} songs.`,
      },
      {
        name: 'Send the link or code at party time',
        text: 'Share the link in the group, or put the code and QR on the invite. Guests open it in any browser, type a nickname, and they are in.',
      },
      {
        name: 'Open the queue, or lock it',
        text: 'For a birthday, leave the queue open so everyone adds a song. For an album night, lock it so the album plays front to back.',
      },
    ],
  },
  sections: [
    {
      heading: 'What is an online listening party?',
      paragraphs: [
        'A listening party used to mean a room, a speaker and an album nobody had heard yet. Online, it is the same idea with the room removed: everyone hears the same track at the same second, reacts in the same chat, and nobody has to be in the same city.',
        FACTS.definition,
      ],
    },
    {
      heading: 'Birthday listening party: the plan',
      paragraphs: [
        'Queue the birthday person’s songs before guests arrive. Ask each guest to add one song and say in the chat why they picked it. At midnight, the host presses play on the one that matters and the reactions do the rest. Guests on phones can use picture-in-picture and keep the call open on another device if they want voices.',
      ],
    },
    {
      heading: 'Album-release night: the plan',
      paragraphs: [
        'Paste the album’s playlist link so it is queued in order, lock the queue, and send the link ten minutes before the drop. Everyone hears track one at the same second; reactions per track replace the "which song are you on?" messages. Keep playback control with the host so nobody skips.',
      ],
    },
    {
      heading: 'Other nights that work',
      paragraphs: ['The format fits anything with a soundtrack and people in different places.'],
      bullets: [
        'The batch farewell, with everyone adding the song that reminds them of someone.',
        'Cousins in four cities planning the sangeet playlist together.',
        'Diwali evening with family abroad: the same songs in both living rooms.',
        'A reunion night for school friends who have not been in one room in years.',
      ],
    },
    {
      heading: `Keeping ${listeners} people in order`,
      paragraphs: [
        'The host decides who can control playback, can lock the queue, can remove someone, and can let the room vote to skip. Most parties never need any of it; it is there for the one guest who adds the same song four times.',
      ],
    },
  ],
  faqs: [
    {
      q: 'How many guests can join?',
      a: `Up to ${listeners} listeners per jam.`,
    },
    {
      q: 'Do guests need an account or an app?',
      a: 'No. They open the link or enter the 6-character code in any browser and type a nickname.',
    },
    {
      q: 'Can guests add songs?',
      a: 'Yes, if the host leaves the queue open. Lock it for an album night so it plays in order.',
    },
    {
      q: 'Can I prepare the queue in advance?',
      a: `Yes: start the jam early and build the queue before you share the link. If the jam closes before the party (it closes ${closeAfterMinutes} minutes after the last person leaves), the queue is remembered on your device and can be rebuilt in one tap.`,
    },
    {
      q: 'Can I run it from my phone?',
      a: 'Yes. Hosting works from any phone or laptop browser; picture-in-picture keeps the music playing while you reply to guests.',
    },
  ],
  related: ['youtube-together', 'friend-groups', 'long-distance-couples'],
  cta: { line: 'Build the queue now. Send the link at 11:55.', sub: `Up to ${listeners} guests, nothing to install.` },
};

export const guides: ContentPage[] = [
  pillarPage,
  youtubeTogetherPage,
  longDistancePage,
  friendGroupsPage,
  studyTogetherPage,
  listeningPartyPage,
];
