import { FACTS } from '@/lib/site-facts';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * The landing page FAQ. Brand-free: we compare with behaviours (sending links, music over a
 * call), never with other products. Every number comes from `site-facts`.
 */
export const landingFaq: FaqItem[] = [
  {
    q: 'Is Jamwave really free?',
    a: `Yes. There is no paid tier and no ads from us. ${FACTS.source} There is nothing for us to charge for.`,
  },
  {
    q: 'Do my friends need an account or an app?',
    a: 'No. They open your link in any browser, type a nickname and they are listening. Phones, laptops and tablets all work.',
  },
  {
    q: 'How many people can join a jam?',
    a: `Up to ${FACTS.listeners} listeners per jam, with one shared queue of up to ${FACTS.queueSongs} songs that anyone can add to.`,
  },
  {
    q: 'How is this different from sending song links or playing music over a call?',
    a: `Links get opened at different times, if at all, and a call carries one phone's speaker through a microphone. In a jam every person's own player is kept at the same second, ${FACTS.sync}, and anyone can add to one shared queue.`,
  },
  {
    q: 'How tight is the sync?',
    a: `Every browser follows one server clock, and the gap is ${FACTS.sync}. On a struggling connection Jamwave keeps playback smooth rather than chasing the clock, and tightens up again as soon as the connection recovers.`,
  },
  {
    q: 'Does it keep playing when I switch apps on my phone?',
    a: 'Phone browsers pause the player when the tab is hidden. Tap the fullscreen button inside the video, then go Home: the video keeps playing in a small floating window while you use other apps.',
  },
  {
    q: 'Does it work on iPhone?',
    a: 'Yes, in Safari or Chrome, with no app to install. To keep the music playing while you use other apps, tap the fullscreen button inside the video and then go Home; it carries on in a small floating window.',
  },
  {
    q: 'How much mobile data does it use?',
    a: 'About the same as watching that video on YouTube at the same quality, because that is what is playing. Shrink the video, or pick a lower quality in the player’s own menu, to save data.',
  },
  {
    q: 'Who can see or join my jam?',
    a: 'Only people with the link or 6-character code; jams are not listed anywhere public. The host can lock the queue or remove anyone. If you and a friend both have free accounts and are friends on Jamwave, they can see that you are in a jam, and you can turn that off in Settings.',
  },
  {
    q: 'Why is there a video and not just audio?',
    a: "YouTube's terms require its player to stay visible while music plays. You can shrink the video to save data; the music is what matters.",
  },
  {
    q: 'What happens when everyone leaves?',
    a: `A jam closes ${FACTS.closeAfterMinutes} minutes after the last person leaves. Your queue is remembered on your device, so you can rebuild the jam in one tap and share a fresh link.`,
  },
  {
    q: 'Can I use playlists from other apps?',
    a: 'Paste any YouTube playlist link to add the whole thing to the queue. Other services’ catalogues are not open to free apps. A free Jamwave account lets you save your own playlists here.',
  },
];

/** Lives on the help page and the YouTube page, not on the sales page. */
export const searchBudgetFaq: FaqItem = {
  q: 'Why does search sometimes say the daily budget is used up?',
  a: 'Searching inside Jamwave uses a daily YouTube search allowance that everyone shares, and new apps get a small one. When it runs out, pasting a YouTube video or playlist link still works and never counts against it.',
};
