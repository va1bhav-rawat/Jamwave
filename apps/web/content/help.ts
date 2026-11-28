import { CONTACT_EMAIL } from '@/lib/env';
import { FACTS } from '@/lib/site-facts';
import { landingFaq, searchBudgetFaq, type FaqItem } from './faq';
import {
  friendGroupsPage,
  longDistancePage,
  pillarPage,
  studyTogetherPage,
  youtubeTogetherPage,
} from './guides';
import type { ContentPage } from './types';

/** Pick a question from another page's list by its exact wording, so the hub never drifts. */
function pick(items: FaqItem[], q: string): FaqItem {
  const item = items.find((entry) => entry.q === q);
  if (!item) throw new Error(`Help page: no FAQ titled "${q}"`);
  return item;
}

const groups: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Getting started',
    items: [
      { q: 'What is a jam?', a: FACTS.definition },
      {
        q: 'How do I start a jam?',
        a: 'Press "Start a jam" on the home page, type a nickname, and you get a link, a 6-character code and a QR code to share. There is no sign-up.',
      },
      {
        q: 'How do I join with a code?',
        a: 'Open the Join page, type the 6-character code your friend gave you, and pick a nickname. Opening their link does the same thing without typing the code.',
      },
      pick(landingFaq, 'Do my friends need an account or an app?'),
      pick(pillarPage.faqs, 'Does everyone need an account?'),
    ],
  },
  {
    title: 'Playing music',
    items: [
      {
        q: 'Where does the music come from?',
        a: `${FACTS.source} Search for a song inside the jam, or paste a YouTube video or playlist link, and it goes into the shared queue.`,
      },
      pick(youtubeTogetherPage.faqs, 'Can I paste a YouTube playlist link?'),
      searchBudgetFaq,
      pick(landingFaq, 'Can I use playlists from other apps?'),
      pick(landingFaq, 'Why is there a video and not just audio?'),
    ],
  },
  {
    title: 'Staying in sync',
    items: [
      pick(landingFaq, 'How tight is the sync?'),
      pick(pillarPage.faqs, 'Do we all have to press play at the same time?'),
      pick(pillarPage.faqs, 'What if someone’s internet is slow?'),
      {
        q: 'What if I fall out of sync?',
        a: 'Your player corrects itself automatically within a few seconds. If it looks stuck, reload the page: you keep your seat in the jam and rejoin at the same second as everyone else.',
      },
    ],
  },
  {
    title: 'Phones and tablets',
    items: [
      pick(landingFaq, 'Does it keep playing when I switch apps on my phone?'),
      pick(landingFaq, 'Does it work on iPhone?'),
      pick(landingFaq, 'How much mobile data does it use?'),
      pick(longDistancePage.faqs, 'Can we keep listening with the phone locked?'),
    ],
  },
  {
    title: 'Hosting and controls',
    items: [
      {
        q: 'Who can control playback?',
        a: 'By default everyone in the jam can play, pause, seek and skip. The host can switch that off for everyone and then allow individual people from the People list.',
      },
      {
        q: 'How do I lock the queue?',
        a: 'In the jam settings, turn off "Anyone can add songs". From then on only people with control can add; everyone can still remove their own songs.',
      },
      pick(friendGroupsPage.faqs, 'What if someone adds a bad song?'),
      {
        q: 'How does vote to skip work?',
        a: 'Listeners who cannot control playback can vote to skip the current song. When more than half of the people in the jam have voted, it skips. The host can turn voting off in the jam settings.',
      },
      {
        q: 'How do I remove someone?',
        a: 'Open the People list, open the menu next to their name and choose "Remove from jam". They are told, and they cannot rejoin that jam by reloading.',
      },
      pick(friendGroupsPage.faqs, 'What happens if the host leaves?'),
    ],
  },
  {
    title: 'Accounts, friends and playlists',
    items: [
      {
        q: 'What does a free account add?',
        a: 'Public playlists you can start a jam from in one tap, friends, and "a friend is in a jam" with a Join button. Jams themselves never need an account.',
      },
      {
        q: 'Can friends see when I am in a jam?',
        a: 'Only if you both have free accounts and are friends on Jamwave. Then they see which jam you are in and can join it. Turn this off any time in Settings.',
      },
      {
        q: 'What are public playlists?',
        a: 'Playlists saved to a free account. They are visible on your profile, and anyone can start a jam from one. A playlist stores only the songs’ video ids; titles are fetched when it is shown.',
      },
      {
        q: 'I forgot my password.',
        a: 'Use "Forgot password?" on the sign-in page. We email you a link that works once, for one hour.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Settings → Delete account. Your account, playlists and friendships are removed immediately.',
      },
    ],
  },
  {
    title: 'Privacy and safety',
    items: [
      pick(landingFaq, 'Who can see or join my jam?'),
      {
        q: 'What do you store?',
        a: 'As little as we can: a nickname in your own browser, the jam itself in server memory only while it is running, and, if you choose an account, your username, email and playlists. The privacy policy lists everything and for how long.',
      },
      {
        q: 'How do I report someone?',
        a: `Hosts can remove anyone from a jam. For anything else, email ${CONTACT_EMAIL} and we will reply within seven days.`,
      },
    ],
  },
  {
    title: 'Limits and when things end',
    items: [
      pick(landingFaq, 'How many people can join a jam?'),
      pick(studyTogetherPage.faqs, 'Can we leave it running for three or four hours?'),
      pick(landingFaq, 'What happens when everyone leaves?'),
    ],
  },
];

const seen = new Set<string>();
const allFaqs = groups
  .flatMap((group) => group.items)
  .filter((item) => (seen.has(item.q) ? false : (seen.add(item.q), true)));

export const helpPage: ContentPage = {
  slug: 'help',
  title: 'Jamwave Help & FAQ — Joining, Sync, Phones, Privacy',
  description:
    'Answers about Jamwave: joining with a code, how sync works, phones and picture-in-picture, limits, privacy, and fixes when something breaks.',
  h1: 'Help and frequently asked questions',
  crumb: 'Help & FAQ',
  kind: 'help',
  lastModified: '2026-11-28',
  answer: `Jamwave is a free website for listening to music together online. This page answers the common questions: how to start or join a jam with a link or 6-character code, how tight the sync is, how to keep music playing on your phone, what the limits are (${FACTS.listeners} listeners, ${FACTS.queueSongs} songs), what happens when everyone leaves, and how privacy works.`,
  sections: [],
  faqGroups: groups,
  faqs: allFaqs,
  related: ['listen-to-music-together', 'about'],
  cta: { line: 'Still stuck?', sub: `Email ${CONTACT_EMAIL} and a person will reply.` },
};
