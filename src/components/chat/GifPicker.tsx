import React, { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Search, Loader2 } from 'lucide-react';

// Uses Tenor's public API (no key required for limited usage)
const TENOR_API = 'https://tenor.googleapis.com/v2';
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public Tenor API key

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    gif?: { url: string };
    tinygif?: { url: string };
    mediumgif?: { url: string };
  };
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `${TENOR_API}/search?q=${encodeURIComponent(searchQuery)}&key=${TENOR_KEY}&limit=20&media_filter=gif,tinygif,mediumgif`
        : `${TENOR_API}/featured?key=${TENOR_KEY}&limit=20&media_filter=gif,tinygif,mediumgif`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGifs('');
  }, [fetchGifs]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(value), 400);
  };

  const getGifUrl = (gif: TenorGif) => {
    return gif.media_formats?.mediumgif?.url || gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '';
  };

  const getThumbnailUrl = (gif: TenorGif) => {
    return gif.media_formats?.tinygif?.url || gif.media_formats?.mediumgif?.url || gif.media_formats?.gif?.url || '';
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-20">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('searchGifs')}
          className="h-8 text-xs border-none bg-transparent p-0 focus-visible:ring-0"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-60">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-xs text-muted-foreground">{t('noGifsFound')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 p-2">
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(getGifUrl(gif))}
                className="relative aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={getThumbnailUrl(gif)}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-1.5 border-t border-border">
        <p className="text-[9px] text-muted-foreground text-center">Powered by Tenor</p>
      </div>
    </div>
  );
}
