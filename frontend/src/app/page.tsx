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
  MessageSquare
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
  engine: str;
  results: SearchResult[];
}

interface IngestResponse {
  status: str;
  video_id: str;
  total_frames: number;
  unique_frames: number;
  removed_frames: number;
  transcripts_count: number;
  webpage_url: str;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'ingest' | 'search'>('ingest');
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
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      {/* HEADER */}
      <header className="border-b border-darkBorder bg-darkCard/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accentGreen to-emerald-400 flex items-center justify-center text-darkBg shadow-lg shadow-accentGreen/20">
              <Film className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                InstaReelRAG <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-accentGreen/10 text-accentGreen border border-accentGreen/20">v1.0 Local</span>
              </h1>
              <p className="text-xs text-slate-400">Multimodal Reel Transcription & CLIP RAG Engine</p>
            </div>
          </div>

          {/* SYSTEM HEALTH BADGE */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
              apiStatus === 'online'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : apiStatus === 'offline'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {apiStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {apiStatus === 'online' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {apiStatus === 'offline' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span>FastAPI Backend: {apiStatus.toUpperCase()}</span>
            </div>

            <button 
              onClick={checkHealth} 
              title="Refresh API Status" 
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB SWITCHER */}
        <div className="flex space-x-2 border-b border-darkBorder mb-8">
          <button
            onClick={() => setActiveTab('ingest')}
            className={`flex items-center space-x-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'ingest'
                ? 'border-accentGreen text-accentGreen bg-accentGreen/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>1. Ingest Reel URL</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-accentIndigo text-accentIndigo bg-accentIndigo/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>2. Multimodal RAG Search</span>
          </button>
        </div>

        {/* TAB 1: INGEST */}
        {activeTab === 'ingest' && (
          <div className="space-y-6">
            <div className="bg-darkCard border border-darkBorder rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Video className="w-5 h-5 text-accentGreen" />
                Ingest Reel or Video URL
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Enter an Instagram Reel URL to automatically download, transcribe audio with Whisper, extract keyframes, deduplicate with CLIP, and index into local Qdrant Vector Store.
              </p>

              <form onSubmit={handleIngest} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-darkBg border border-darkBorder focus:border-accentGreen focus:ring-1 focus:ring-accentGreen outline-none text-slate-100 placeholder-slate-500 text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={isIngesting || apiStatus !== 'online'}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-accentGreen hover:from-emerald-400 hover:to-emerald-300 text-darkBg font-semibold text-sm shadow-lg shadow-accentGreen/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all min-w-[160px]"
                >
                  {isIngesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Process & Index</span>
                    </>
                  )}
                </button>
              </form>

              {ingestError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Ingestion Error</span>
                    <span>{ingestError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* METRICS DASHBOARD */}
            {ingestData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Reel Processed Successfully! (ID: {ingestData.video_id})
                  </h3>
                  {ingestData.webpage_url && (
                    <a
                      href={ingestData.webpage_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-accentGreen flex items-center gap-1 transition-colors"
                    >
                      <span>View Reel</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Raw Frames Extracted</span>
                      <Layers className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{ingestData.total_frames}</div>
                  </div>

                  <div className="bg-darkCard border border-accentGreen/30 rounded-xl p-5 shadow-lg shadow-accentGreen/5">
                    <div className="flex items-center justify-between text-accentGreen text-xs mb-2">
                      <span>Unique Keyframes Saved</span>
                      <Film className="w-4 h-4 text-accentGreen" />
                    </div>
                    <div className="text-2xl font-bold text-accentGreen">{ingestData.unique_frames}</div>
                  </div>

                  <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Redundant Frames Filtered</span>
                      <Cpu className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{ingestData.removed_frames}</div>
                  </div>

                  <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Audio Transcripts</span>
                      <Mic className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{ingestData.transcripts_count}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-darkCard border border-darkBorder rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Search className="w-5 h-5 text-accentIndigo" />
                Multimodal RAG Search
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Query your indexed reels with natural language. Combines CLIP visual embeddings, Faster-Whisper audio transcripts, and BM25 full-text keyword search with RRF rank fusion.
              </p>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Find reels showing quick pasta recipes or mechanical keyboards"
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-darkBg border border-darkBorder focus:border-accentIndigo focus:ring-1 focus:ring-accentIndigo outline-none text-slate-100 placeholder-slate-500 text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching || apiStatus !== 'online'}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all min-w-[160px]"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Run Search</span>
                    </>
                  )}
                </button>
              </form>

              {searchError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Search Error</span>
                    <span>{searchError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SEARCH RESULTS */}
            {searchData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* AI ANSWER CARD */}
                <div className="bg-darkCard border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-accentGreen" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      RAG Answer ({searchData.engine})
                    </span>
                  </div>
                  <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {searchData.answer}
                  </div>
                </div>

                {/* EVIDENCE CARDS */}
                <div>
                  <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accentGreen" />
                    Retrieved Multimodal Evidence & Timestamps ({searchData.results.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchData.results.map((res, idx) => (
                      <div key={idx} className="bg-darkCard border border-darkBorder hover:border-slate-700 rounded-xl p-5 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                res.type === 'transcript'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {res.type}
                              </span>
                              {res.uploader && res.uploader !== 'unknown' && (
                                <span className="text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <User className="w-3 h-3 text-accentGreen" />
                                  @{res.uploader}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              RRF Score: {res.score}
                            </span>
                          </div>

                          {/* REEL CAPTION */}
                          {res.caption && (
                            <div className="mb-3 p-2.5 rounded-lg bg-darkBg/80 border border-darkBorder/60 text-xs text-slate-300">
                              <div className="flex items-center gap-1 text-slate-400 font-semibold mb-1 text-[11px]">
                                <MessageSquare className="w-3 h-3 text-indigo-400" />
                                <span>Reel Caption:</span>
                              </div>
                              <p className="line-clamp-2 italic text-slate-300">&quot;{res.caption}&quot;</p>
                            </div>
                          )}

                          {res.type === 'transcript' && res.text && (
                            <div className="space-y-2 mb-3">
                              <p className="text-sm text-slate-200 italic">&quot;{res.text}&quot;</p>
                              {res.timestamp !== undefined && (
                                <div className="flex items-center text-xs text-slate-400 space-x-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Timestamp: {res.timestamp}s</span>
                                </div>
                              )}
                            </div>
                          )}

                          {res.type === 'frame' && (
                            <div className="space-y-2 mb-3">
                              {res.timestamp !== undefined && (
                                <div className="flex items-center text-xs text-slate-400 space-x-1 mb-2">
                                  <Clock className="w-3.5 h-3.5 text-accentGreen" />
                                  <span>Visual Frame at: {res.timestamp}s</span>
                                </div>
                              )}
                              {res.frame_path && (
                                <div className="rounded-lg overflow-hidden border border-darkBorder bg-darkBg">
                                  <div className="p-2 text-xs font-mono text-slate-400 truncate">
                                    Frame: {res.frame_path}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {res.webpage_url && (
                          <a
                            href={res.webpage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 pt-3 border-t border-darkBorder/60 flex items-center justify-between text-xs text-slate-400 hover:text-accentGreen transition-colors group"
                          >
                            <span className="group-hover:underline">Visit Reel on Instagram ({res.video_id})</span>
                            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
