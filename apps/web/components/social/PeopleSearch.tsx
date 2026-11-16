'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchPeopleAction, type PersonResult } from '@/lib/actions';
import { PEOPLE_SEARCH_MIN } from '@/lib/social';
import { FriendButton } from './FriendButton';
import { PersonRow } from './PersonRow';

interface Found {
  query: string;
  people: PersonResult[];
  error: string | null;
}

/** Find accounts by username, as you type. */
export function PeopleSearch({ signedIn }: { signedIn: boolean }) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found | null>(null);
  const q = query.trim().toLowerCase();
  const searchable = q.length >= PEOPLE_SEARCH_MIN;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPeopleAction(q)
        .then((result) => {
          if (cancelled) return;
          setFound(
            result.ok
              ? { query: q, people: result.data, error: null }
              : { query: q, people: [], error: result.error },
          );
        })
        .catch(() => {
          if (!cancelled) setFound({ query: q, people: [], error: 'Search is unavailable' });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, searchable]);

  const current = searchable && found?.query === q ? found : null;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          aria-label="Search people by username"
          placeholder="Search by username…"
          className="pl-10"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={40}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div aria-live="polite">
        {!searchable ? (
          q ? (
            <p className="mt-3 px-1 text-sm text-fg-subtle">
              Type at least {PEOPLE_SEARCH_MIN} characters.
            </p>
          ) : null
        ) : !current ? (
          <p className="mt-3 px-1 text-sm text-fg-subtle">Searching…</p>
        ) : current.error ? (
          <p className="mt-3 px-1 text-sm text-red-300">{current.error}</p>
        ) : current.people.length === 0 ? (
          <p className="mt-3 px-1 text-sm text-fg-muted">No usernames start with “{q}”.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-0.5">
            {current.people.map((person) => (
              <PersonRow key={person.id} user={person}>
                <FriendButton
                  username={person.username}
                  relation={person.relation}
                  signedIn={signedIn}
                />
              </PersonRow>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
