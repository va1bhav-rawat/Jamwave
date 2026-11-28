import { CONTACT_EMAIL } from '@/lib/env';
import { FACTS } from '@/lib/site-facts';
import type { ContentPage } from './types';

export const aboutPage: ContentPage = {
  slug: 'about',
  title: 'About Jamwave — Built in India by an Independent Developer',
  description:
    'Jamwave is a free web app to listen to music together online, built and run by an independent developer in India. Why it exists and how to get in touch.',
  h1: 'About Jamwave',
  crumb: 'About',
  kind: 'about',
  lastModified: '2026-11-28',
  showKeyFacts: true,
  answer: `Jamwave is a free web app for listening to music together online. One person starts a jam, shares a link or code, and everyone hears the same song at the same second. It is built and run by an independent developer in India, has no ads and no paid tier, and needs no app or account to join.`,
  sections: [
    {
      heading: 'Why Jamwave exists',
      paragraphs: [
        'It started with the ritual everyone with a friend in another city knows: "3, 2, 1, play". It never works. One of you is a second early, the other has an ad, and the song you wanted to share together becomes two separate songs with a phone call in between. Meanwhile the group chat fills with links that nobody opens at the same time.',
        'Jamwave is the small fix for that. One link, one queue, and every player held at the same second so the chorus lands for everyone at once. It is for the partner in Delhi, the hostel wing that went home for the holidays, the cousins planning a wedding playlist from four cities, and the thirty fans who want to hear an album at midnight together.',
      ],
    },
    {
      heading: 'How it works, in one paragraph',
      paragraphs: [
        `${FACTS.definition} Every browser follows one server clock, so playback stays ${FACTS.sync}; on a weak connection a player keeps going smoothly a little behind rather than stuttering, and catches up when it can. ${FACTS.source} Up to ${FACTS.listeners} people can share a queue of up to ${FACTS.queueSongs} songs, chat, react and vote to skip.`,
      ],
    },
    {
      heading: 'What Jamwave is not',
      paragraphs: [
        'It is not a streaming service. Jamwave hosts no music, copies no audio and downloads nothing; it tells each person’s official YouTube player what to play and keeps them in step. It is not an app to install: it runs in the browser on any phone, tablet or laptop. And it does not sell data or show ads of its own; the privacy policy says exactly what is kept, which is very little, and for how long.',
      ],
    },
    {
      heading: 'Who builds it',
      paragraphs: [
        'One independent developer in India, as a personal project, with the hosting paid out of pocket. The code is public on GitHub, bugs are fixed in the open, and there is no company behind it. There is no paid tier and no ads from us at present; if that ever changes, this page and the FAQ will say so before anything else does.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `Questions, problems or ideas: write to ${CONTACT_EMAIL}. Bugs can also be reported on GitHub. Privacy questions and deletion requests are answered within seven days.`,
      ],
    },
  ],
  faqs: [
    {
      q: 'Who made Jamwave?',
      a: 'An independent developer in India. It is a one-person project, built in the open on GitHub.',
    },
    {
      q: 'How does Jamwave make money?',
      a: 'It does not, at present. There are no ads from us and no paid tier; hosting is paid out of pocket.',
    },
    {
      q: 'Is Jamwave affiliated with YouTube?',
      a: 'No. Jamwave plays music through YouTube’s official embedded player and does not host or copy any audio.',
    },
    {
      q: 'How do I report a bug or a problem?',
      a: `Email ${CONTACT_EMAIL}, or open an issue on GitHub.`,
    },
  ],
  related: ['listen-to-music-together', 'help'],
  cta: { line: 'See it in thirty seconds.', sub: 'Start a jam, open the link on your phone, and hear the same second.' },
};
