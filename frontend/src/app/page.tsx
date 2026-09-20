'use client';

import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Search, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Layers, 
  Film, 
  Sparkles, 
  Clock,
  Mic,
  Loader2,
  RefreshCw,
  User,
  MessageSquare,
  ArrowRight,
  Filter
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

interface SearchResult {
  id: string;
  score: number;
  type: string;
  video_id: string;
  timestamp?: number;
  text?: string;
  frame_path?: string;
  webpage_url?: string;
  uploader?: string;
  caption?: string;
}

interface SearchResponse {
  query: string;
  answer: string;
  engine: string;
  results: SearchResult[];
}

interface IngestResponse {
  status: string;
  video_id: string;
  total_frames: number;
  unique_frames: number;
  removed_frames: number;
  transcripts_count: number;
  webpage_url: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'search' | 'ingest'>('search');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);

  // Ingest State
  const [reelUrl, setReelUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestData, setIngestData] = useState<IngestResponse | null>(null);
  const [ingestError, setIngestError] = useState('');

  // Search State
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState('');

  // Check Health of FastAPI Backend
  const checkHealth = async () => {
    setApiStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setApiStatus('online');
        setOllamaOnline(data.ollama_online);
      } else {
        setApiStatus('offline');
      }
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Handle Reel Ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelUrl.trim()) return;

    setIsIngesting(true);
    setIngestError('');
    setIngestData(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: reelUrl.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setIngestData(data);
      } else {
        const err = await res.json();
        setIngestError(err.detail || 'Ingestion failed');
      }
    } catch (err: any) {
      setIngestError(err.message || 'Connection error to FastAPI backend');
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle RAG Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchData(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), top_k: 5 }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchData(data);
      } else {
        const err = await res.json();
        setSearchError(err.detail || 'Search failed');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Connection error to FastAPI backend');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-butterBg text-darkText font-sans selection:bg-butterAccent selection:text-black">
      
      {/* TOP NEO-BRUTALIST NAVBAR (MATCHING REFERENCE IMAGE) */}
      <header className="border-b-[2.5px] border-black bg-white py-4 px-4 sm:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* LOGO & TITLE */}
          <div className="flex items-center space-x-2">
            <span className="font-black text-2xl tracking-tight text-black">
              InstaReel<span className="text-black">RAG</span>
            </span>
          </div>

          {/* NAVBAR RIGHT-ALIGNED TEXT LINKS (MATCHING REFERENCE UI) */}
          <div className="flex items-center space-x-5 sm:space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`font-black text-sm sm:text-base tracking-tight transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'text-black underline underline-offset-8 decoration-[2.5px] decoration-black'
                  : 'text-slate-800 hover:text-black hover:underline hover:underline-offset-8'
              }`}
            >
              Browse
            </button>

            <button
              onClick={() => setActiveTab('ingest')}
              className={`font-black text-sm sm:text-base tracking-tight transition-all cursor-pointer ${
                activeTab === 'ingest'
                  ? 'text-black underline underline-offset-8 decoration-[2.5px] decoration-black'
                  : 'text-slate-800 hover:text-black hover:underline hover:underline-offset-8'
              }`}
            >
              Ingest Reel
            </button>

            <a
              href={`${API_BASE}/docs`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-block font-black text-sm sm:text-base tracking-tight text-slate-800 hover:text-black hover:underline hover:underline-offset-8 transition-all"
            >
              API Docs
            </a>

            {/* STATUS BADGE STYLED LIKE GITHUB STAR PILL IN REFERENCE IMAGE */}
            <div className={`flex items-center space-x-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] cursor-pointer transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] ${
              apiStatus === 'online'
                ? 'bg-butterAccent text-black'
                : apiStatus === 'offline'
                ? 'bg-rose-200 text-black'
                : 'bg-amber-100 text-black'
            }`} onClick={checkHealth} title="FastAPI Status - Click to Refresh">
              <CheckCircle2 className="w-3.5 h-3.5 text-black font-bold" />
              <span>FastAPI</span>
              <span className="text-amber-700 font-extrabold">★ {apiStatus === 'online' ? 'Online' : 'Offline'}</span>
            </div>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-4">
        <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight mb-2">
          {activeTab === 'search' ? 'Browse & Search Reels' : 'Ingest Instagram Reels'}
        </h1>
        <p className="text-base font-semibold text-slate-700 max-w-2xl">
          {activeTab === 'search'
            ? 'Explore saved Instagram Reels with Faster-Whisper audio transcripts, GPU CLIP visual deduplication, and local hybrid RAG search.'
            : 'Enter a Reel URL or Youtube Short to transcribe speech, sample frames, deduplicate keyframes with CLIP, and index vectors.'}
        </p>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pb-16">

        {/* NEO-BRUTALIST CONTROL / INPUT BOX */}
        <div className="bg-butterCard border-[2.5px] border-black rounded-2xl p-6 sm:p-8 shadow-brutal mb-8">
          
          {/* CARD TOP INFO ROW */}
          <div className="flex items-center justify-between gap-4 mb-6 border-b-2 border-black pb-4">
            <div className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
              {activeTab === 'search' ? (
                <>
                  <Search className="w-4 h-4 text-black" />
                  <span>SEARCH REELS &amp; SPEECH TRANSCRIPTS</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 text-black" />
                  <span>INGEST REEL URL (INSTAGRAM / YOUTUBE SHORTS)</span>
                </>
              )}
            </div>

            <div className="text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
              <Cpu className="w-3.5 h-3.5 text-black" />
              <span>Ollama Model: {ollamaOnline ? 'Online (Qwen2-VL)' : 'Local Fallback'}</span>
            </div>
          </div>

          {/* TAB 1: SEARCH REELS */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest text-black mb-1">
                SEARCH REELS &amp; SPEECH TRANSCRIPTS
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-black font-bold" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search query e.g. RAG evaluation, pasta recipes, keyboard builds..."
                    required
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white border-2 border-black text-black font-bold placeholder-slate-500 text-sm focus:outline-none shadow-[2px_2px_0px_0px_#000] focus:shadow-brutal transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching || apiStatus !== 'online'}
                  className="px-7 py-3.5 rounded-xl bg-black hover:bg-slate-900 text-butterAccent font-black text-sm uppercase tracking-wider border-2 border-black shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all min-w-[170px]"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-butterAccent" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>Search Query</span>
                      <ArrowRight className="w-4 h-4 text-butterAccent" />
                    </>
                  )}
                </button>
              </form>

              {/* QUICK EXAMPLE TAGS */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-extrabold text-black uppercase tracking-wider mr-1">TRY:</span>
                {['Evaluate RAG system', 'Quick dinner recipes', 'Mechanical keyboard setup', 'Workout routine'].map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(tag); }}
                    className="text-xs font-bold text-black bg-white hover:bg-butterAccent border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000] transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {searchError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-200 border-2 border-black text-black font-bold text-sm flex items-start space-x-3 shadow-brutal-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-black" />
                  <div>
                    <span className="font-extrabold block uppercase tracking-wider">Search Failure</span>
                    <span>{searchError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INGEST REEL URL */}
          {activeTab === 'ingest' && (
            <div className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest text-black mb-1">
                INGEST REEL URL (INSTAGRAM / YOUTUBE SHORTS)
              </div>

              <form onSubmit={handleIngest} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  required
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white border-2 border-black text-black font-bold placeholder-slate-500 text-sm focus:outline-none shadow-[2px_2px_0px_0px_#000] focus:shadow-brutal transition-all"
                />
                <button
                  type="submit"
                  disabled={isIngesting || apiStatus !== 'online'}
                  className="px-7 py-3.5 rounded-xl bg-black hover:bg-slate-900 text-butterAccent font-black text-sm uppercase tracking-wider border-2 border-black shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all min-w-[170px]"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-butterAccent" />
                      <span>Ingesting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-butterAccent" />
                      <span>Process Reel</span>
                    </>
                  )}
                </button>
              </form>

              {ingestError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-200 border-2 border-black text-black font-bold text-sm flex items-start space-x-3 shadow-brutal-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-black" />
                  <div>
                    <span className="font-extrabold block uppercase tracking-wider">Ingestion Error</span>
                    <span>{ingestError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* INGESTION METRICS DASHBOARD */}
        {ingestData && (
          <div className="mb-8 space-y-4">
            <div className="bg-emerald-200 border-2 border-black rounded-2xl p-5 shadow-brutal flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-black" />
                <div>
                  <h3 className="font-black text-base uppercase tracking-wider text-black">
                    Reel Processed Successfully!
                  </h3>
                  <p className="text-xs font-bold text-slate-800">Reel ID: {ingestData.video_id}</p>
                </div>
              </div>
              {ingestData.webpage_url && (
                <a
                  href={ingestData.webpage_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-white border-2 border-black shadow-brutal-sm font-black text-xs hover:bg-butterAccent transition-all text-black flex items-center gap-1.5"
                >
                  <span>Open Reel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-brutal">
                <div className="text-xs font-black uppercase text-slate-600 mb-1">Raw Frames Extracted</div>
                <div className="text-3xl font-black text-black">{ingestData.total_frames}</div>
              </div>

              <div className="bg-butterAccent border-2 border-black rounded-2xl p-5 shadow-brutal">
                <div className="text-xs font-black uppercase text-black mb-1">Unique Keyframes Saved</div>
                <div className="text-3xl font-black text-black">{ingestData.unique_frames}</div>
              </div>

              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-brutal">
                <div className="text-xs font-black uppercase text-slate-600 mb-1">Redundant Filtered</div>
                <div className="text-3xl font-black text-black">{ingestData.removed_frames}</div>
              </div>

              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-brutal">
                <div className="text-xs font-black uppercase text-slate-600 mb-1">Transcripts Extracted</div>
                <div className="text-3xl font-black text-black">{ingestData.transcripts_count}</div>
              </div>
            </div>
          </div>
        )}

        {/* RAG SEARCH RESULTS CONTAINER */}
        {searchData && (
          <div className="space-y-8">
            
            {/* AI SYNTHESIZED RAG ANSWER CARD */}
            <div className="bg-white border-[2.5px] border-black rounded-2xl p-6 sm:p-8 shadow-brutal relative">
              <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-butterAccent border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center font-bold text-black">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wider text-black">
                    RAG Synthesized Answer
                  </h3>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-xl bg-butterCardWarm border-2 border-black shadow-[2px_2px_0px_0px_#000] text-black">
                  {searchData.engine}
                </span>
              </div>

              <div className="text-slate-900 font-medium text-sm leading-relaxed whitespace-pre-line bg-butterBg p-4 rounded-xl border-2 border-black">
                {searchData.answer}
              </div>
            </div>

            {/* RETRIEVED MULTIMODAL REELS LIST TABLE/CARDS */}
            <div className="bg-white border-[2.5px] border-black rounded-2xl p-6 sm:p-8 shadow-brutal">
              
              <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                <div>
                  <h3 className="font-black text-xl tracking-tight text-black uppercase">
                    Retrieved Reels &amp; Evidence ({searchData.results.length})
                  </h3>
                  <p className="text-xs font-bold text-slate-600">
                    Hybrid BM25 + CLIP Dense vectors combined via Reciprocal Rank Fusion (RRF)
                  </p>
                </div>
                <div className="text-xs font-black uppercase bg-butterAccent border-2 border-black px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
                  Query: {searchData.query}
                </div>
              </div>

              {/* REELS GRID CARDS */}
              <div className="space-y-4">
                {searchData.results.map((res, idx) => (
                  <div key={idx} className="bg-butterMuted border-2 border-black rounded-2xl p-5 shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                    
                    {/* CARD HEADER ROW */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                          res.type === 'transcript'
                            ? 'bg-amber-200 text-black'
                            : 'bg-emerald-200 text-black'
                        }`}>
                          {res.type}
                        </span>

                        {res.uploader && res.uploader !== 'unknown' && (
                          <span className="text-xs font-black text-black bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-black" />
                            @{res.uploader}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-black text-black bg-white border-2 border-black px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
                          RRF Score: {res.score}
                        </span>

                        {res.webpage_url && (
                          <a
                            href={res.webpage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-black text-black bg-butterAccent hover:bg-yellow-300 border-2 border-black px-3.5 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000] hover:shadow-brutal-sm transition-all flex items-center gap-1"
                          >
                            <span>Open Reel</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* REEL CAPTION QUOTE BOX */}
                    {res.caption && (
                      <div className="mb-3 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] text-xs">
                        <div className="flex items-center gap-1.5 font-black text-black uppercase tracking-wider mb-1 text-[11px]">
                          <MessageSquare className="w-3.5 h-3.5 text-black" />
                          <span>Reel Caption:</span>
                        </div>
                        <p className="line-clamp-2 font-semibold italic text-slate-800">&quot;{res.caption}&quot;</p>
                      </div>
                    )}

                    {/* TRANSCRIPT / FRAME CONTENT */}
                    {res.type === 'transcript' && res.text && (
                      <div className="bg-white p-4 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                        <p className="text-sm font-bold text-black italic mb-2">&quot;{res.text}&quot;</p>
                        {res.timestamp !== undefined && (
                          <div className="flex items-center text-xs font-black text-slate-700 space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-black" />
                            <span>Speech Timestamp: {res.timestamp}s</span>
                          </div>
                        )}
                      </div>
                    )}

                    {res.type === 'frame' && (
                      <div className="bg-white p-4 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                        {res.timestamp !== undefined && (
                          <div className="flex items-center text-xs font-black text-black space-x-1.5 mb-2">
                            <Clock className="w-3.5 h-3.5 text-black" />
                            <span>Visual Frame at: {res.timestamp}s</span>
                          </div>
                        )}
                        {res.frame_path && (
                          <div className="p-2 text-xs font-mono font-bold text-slate-700 bg-butterBg rounded-lg border border-black truncate">
                            Frame: {res.frame_path}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
