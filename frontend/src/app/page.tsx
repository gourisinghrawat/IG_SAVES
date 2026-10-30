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
  Filter,
  Globe,
  Settings,
  Link2,
  X,
  Check,
  Copy,
  Terminal,
  AlertTriangle,
  Radio,
  Zap
} from 'lucide-react';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_API_BASE = RAW_API_BASE.replace(/\/+$/, '');

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

interface HealthData {
  status: string;
  whisper_loaded?: boolean;
  clip_loaded?: boolean;
  vector_db_connected?: boolean;
  ollama_online?: boolean;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'search' | 'ingest'>('search');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Dynamic Backend & Tunnel URL State
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_BASE);
  const [inputUrl, setInputUrl] = useState<string>(DEFAULT_API_BASE);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
    details?: HealthData;
  } | null>(null);
  const [copiedTunnelCmd, setCopiedTunnelCmd] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

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

  // Centralized fetch helper supporting tunnel headers & trailing slash normalization
  const apiFetch = async (endpoint: string, options: RequestInit = {}, customBase?: string) => {
    const base = (customBase || apiUrl).replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${base}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Bypass tunnel warning screens (e.g. ngrok free tier, localtunnel)
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      ...((options.headers as Record<string, string>) || {}),
    };

    return fetch(fullUrl, {
      ...options,
      headers,
    });
  };

  // Check Health of FastAPI Backend
  const checkHealth = async (targetBaseUrl?: string) => {
    const target = (targetBaseUrl || apiUrl).replace(/\/+$/, '');
    setApiStatus('checking');
    try {
      const startTime = performance.now();
      const res = await apiFetch('/health', { method: 'GET' }, target);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (res.ok) {
        const data: HealthData = await res.json();
        setApiStatus('online');
        setOllamaOnline(Boolean(data.ollama_online));
        setLatencyMs(duration);
        return { success: true, message: `Connected (${duration}ms)`, latency: duration, details: data };
      } else {
        setApiStatus('offline');
        setLatencyMs(null);
        return { success: false, message: `HTTP Error: ${res.status} ${res.statusText}` };
      }
    } catch (err: any) {
      setApiStatus('offline');
      setLatencyMs(null);
      return { success: false, message: err?.message || 'Failed to connect to backend' };
    }
  };

  // Load saved backend URL from localStorage on initial render
  useEffect(() => {
    setIsClient(true);
    let initialUrl = DEFAULT_API_BASE;
    try {
      const saved = localStorage.getItem('instareelrag_api_base_url');
      if (saved && saved.trim()) {
        initialUrl = saved.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore storage access errors
    }
    setApiUrl(initialUrl);
    setInputUrl(initialUrl);
    checkHealth(initialUrl);
  }, []);

  // Mixed content detection (Frontend on HTTPS / Vercel calling plain HTTP backend)
  const isMixedContent = isClient && typeof window !== 'undefined' && 
    window.location.protocol === 'https:' && 
    apiUrl.startsWith('http://');

  // Handle Testing custom URL inside Modal
  const handleTestConnection = async (urlToTest: string) => {
    const clean = urlToTest.trim().replace(/\/+$/, '');
    if (!clean) {
      setTestResult({ success: false, message: 'Please enter a valid URL' });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const startTime = performance.now();
      const res = await apiFetch('/health', { method: 'GET' }, clean);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (res.ok) {
        const data: HealthData = await res.json();
        setTestResult({
          success: true,
          message: `Connected successfully in ${duration}ms!`,
          latency: duration,
          details: data,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      let msg = err?.message || 'Failed to fetch';
      if (isClient && window.location.protocol === 'https:' && clean.startsWith('http://')) {
        msg = 'Blocked by Browser: Mixed Content Error. Vercel is served over HTTPS, so it cannot connect to insecure "http://" URLs. Please use an HTTPS tunnel URL (e.g. from ngrok or Cloudflare).';
      } else if (msg.includes('Failed to fetch')) {
        msg = 'Failed to fetch. Verify that the backend server or tunnel is currently running and accessible.';
      }
      setTestResult({
        success: false,
        message: msg,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save new backend URL to state & localStorage
  const handleSaveConnection = (newUrl: string) => {
    const clean = newUrl.trim().replace(/\/+$/, '');
    if (!clean) return;

    try {
      localStorage.setItem('instareelrag_api_base_url', clean);
    } catch {
      // storage unavailable
    }

    setApiUrl(clean);
    setInputUrl(clean);
    setIsSettingsOpen(false);
    setTestResult(null);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 4000);

    checkHealth(clean);
  };

  // Reset to default backend URL
  const handleResetDefault = () => {
    try {
      localStorage.removeItem('instareelrag_api_base_url');
    } catch {
      // ignore
    }
    setApiUrl(DEFAULT_API_BASE);
    setInputUrl(DEFAULT_API_BASE);
    setTestResult(null);
    setIsSettingsOpen(false);
    checkHealth(DEFAULT_API_BASE);
  };

  // Copy tunnel helper commands
  const copyCommand = (cmd: string, name: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedTunnelCmd(name);
      setTimeout(() => setCopiedTunnelCmd(null), 2500);
    }
  };

  // Display-friendly URL format
  const formatUrlDisplay = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.host;
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }
  };

  // Handle Reel Ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelUrl.trim()) return;

    setIsIngesting(true);
    setIngestError('');
    setIngestData(null);

    try {
      const res = await apiFetch('/api/v1/ingest', {
        method: 'POST',
        body: JSON.stringify({ url: reelUrl.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setIngestData(data);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Ingestion failed' }));
        setIngestError(err.detail || 'Ingestion failed');
      }
    } catch (err: any) {
      setIngestError(err.message || 'Connection error to backend');
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
      const res = await apiFetch('/api/v1/search', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), top_k: 5 }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchData(data);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Search failed' }));
        setSearchError(err.detail || 'Search failed');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Connection error to backend');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-butterBg text-darkText font-sans selection:bg-butterAccent selection:text-black">
      
      {/* TOP NEO-BRUTALIST NAVBAR */}
      <header className="border-b-[2.5px] border-black bg-white py-4 px-4 sm:px-8 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* LOGO & TITLE */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="font-black text-2xl tracking-tight text-black">
              InstaReel<span className="text-black">RAG</span>
            </span>
          </div>

          {/* NAVBAR RIGHT-ALIGNED CONTROLS */}
          <div className="flex items-center space-x-3 sm:space-x-6">
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
              href={`${apiUrl}/docs`}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-block font-black text-sm sm:text-base tracking-tight text-slate-800 hover:text-black hover:underline hover:underline-offset-8 transition-all"
            >
              API Docs
            </a>

            {/* DYNAMIC BACKEND / TUNNEL URL CONFIGURATION BUTTON */}
            <button
              onClick={() => {
                setInputUrl(apiUrl);
                setTestResult(null);
                setIsSettingsOpen(true);
              }}
              title={`Active Backend: ${apiUrl} (Click to change / attach tunnel link)`}
              className={`flex items-center space-x-1.5 text-xs font-black px-3 py-1.5 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] cursor-pointer transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] ${
                apiStatus === 'online'
                  ? 'bg-butterAccent text-black'
                  : apiStatus === 'offline'
                  ? 'bg-rose-200 text-black'
                  : 'bg-amber-100 text-black'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${apiStatus === 'online' ? 'text-black animate-pulse' : 'text-slate-700'}`} />
              <span className="hidden sm:inline font-black">API:</span>
              <span className="font-mono text-[11px] max-w-[110px] sm:max-w-[140px] truncate">
                {formatUrlDisplay(apiUrl)}
              </span>
              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded border border-black/20 ${
                apiStatus === 'online' ? 'bg-black text-butterAccent' : 'bg-black/10 text-black'
              }`}>
                {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : '...'}
              </span>
              <Settings className="w-3.5 h-3.5 text-black ml-0.5" />
            </button>

          </div>

        </div>
      </header>

      {/* SUCCESS TOAST FOR URL UPDATE */}
      {saveSuccessToast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="bg-emerald-300 border-2 border-black rounded-xl p-3 shadow-brutal-sm flex items-center justify-between text-black font-bold text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>Backend API URL updated to <strong className="font-mono">{apiUrl}</strong> and saved!</span>
            </div>
            <button onClick={() => setSaveSuccessToast(false)} className="text-black hover:opacity-75 font-black text-sm">✕</button>
          </div>
        </div>
      )}

      {/* MIXED CONTENT WARNING BANNER (CRITICAL FOR VERCEL + LOCAL Tunnels) */}
      {isMixedContent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="bg-amber-200 border-2 border-black rounded-2xl p-4 sm:p-5 shadow-brutal flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-black">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-black mt-0.5" />
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide">
                  Browser Mixed Content Warning (HTTPS to HTTP)
                </h4>
                <p className="text-xs font-semibold text-slate-800 mt-1 max-w-3xl">
                  This frontend is hosted on <strong>HTTPS (Vercel)</strong>, but your Backend URL is currently configured with insecure HTTP (<code className="bg-white/60 px-1 py-0.5 rounded font-mono font-bold">{apiUrl}</code>). Modern web browsers automatically block insecure HTTP requests on HTTPS websites.
                  Please launch an <strong>HTTPS tunnel</strong> (e.g. via Cloudflare Tunnel or ngrok) and attach the tunnel link below.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setInputUrl(apiUrl);
                setTestResult(null);
                setIsSettingsOpen(true);
              }}
              className="px-4 py-2 bg-black text-butterAccent rounded-xl border-2 border-black font-black text-xs uppercase tracking-wider shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all whitespace-nowrap flex items-center space-x-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Attach HTTPS Tunnel</span>
            </button>
          </div>
        </div>
      )}

      {/* OFFLINE HELPER BANNER */}
      {apiStatus === 'offline' && !isMixedContent && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="bg-rose-100 border-2 border-black rounded-2xl p-4 shadow-brutal-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-black">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-black" />
              <div>
                <span className="font-black text-xs uppercase tracking-wide block">
                  Backend Unreachable ({apiUrl})
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Running backend locally while viewing from Vercel? Attach an HTTPS tunnel link (ngrok or Cloudflare) to connect your local models.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setInputUrl(apiUrl);
                setTestResult(null);
                setIsSettingsOpen(true);
              }}
              className="px-3.5 py-1.5 bg-white hover:bg-butterAccent text-black rounded-xl border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all whitespace-nowrap"
            >
              Configure Tunnel Link
            </button>
          </div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b-2 border-black pb-4">
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

            <div className="flex items-center gap-2">
              <div className="text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
                <Cpu className="w-3.5 h-3.5 text-black" />
                <span>Ollama: {ollamaOnline ? 'Online (Qwen2-VL)' : 'Local Fallback'}</span>
              </div>

              {latencyMs !== null && (
                <div className="hidden sm:flex text-xs font-extrabold text-black uppercase tracking-wider items-center gap-1 bg-white border-2 border-black px-2.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{latencyMs}ms</span>
                </div>
              )}
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

            {/* RETRIEVED MULTIMODAL REELS LIST */}
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

      {/* ======================================================== */}
      {/* BACKEND API & TUNNEL CONFIGURATION MODAL */}
      {/* ======================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-butterCard border-[3px] border-black rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-brutal-lg relative my-8 max-h-[90vh] overflow-y-auto text-black">
            
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-butterAccent border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-black">
                    Backend &amp; Tunnel Connection
                  </h2>
                  <p className="text-xs font-bold text-slate-700">
                    Connect Vercel to your local FastAPI backend using a tunnel or custom cloud URL
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white hover:bg-rose-200 border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* CURRENT ACTIVE CONNECTION STATUS CARD */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-brutal-sm mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Active Backend URL
                </span>
                <span className="font-mono font-bold text-sm text-black break-all">
                  {apiUrl}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                  apiStatus === 'online'
                    ? 'bg-butterAccent text-black'
                    : apiStatus === 'offline'
                    ? 'bg-rose-200 text-black'
                    : 'bg-amber-100 text-black'
                }`}>
                  ● {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'}
                </span>

                <button
                  onClick={() => checkHealth(apiUrl)}
                  title="Ping Active Connection"
                  className="p-1.5 rounded-lg bg-butterMuted hover:bg-butterAccent border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            </div>

            {/* URL INPUT FORM */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">
                  Backend API Base URL (Tunnel / Localhost / Cloud)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Link2 className="h-4 w-4 text-black font-bold" />
                  </div>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="https://xxxx-xx.ngrok-free.app or https://xxx.trycloudflare.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-black text-black font-mono font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_#000] focus:shadow-brutal transition-all"
                  />
                </div>
              </div>

              {/* QUICK PRESET CHIPS */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase text-slate-700">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('http://127.0.0.1:8000');
                    setTestResult(null);
                  }}
                  className="text-xs font-bold font-mono bg-white hover:bg-butterAccent border border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] transition-all"
                >
                  127.0.0.1:8000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('http://localhost:8000');
                    setTestResult(null);
                  }}
                  className="text-xs font-bold font-mono bg-white hover:bg-butterAccent border border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] transition-all"
                >
                  localhost:8000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl(DEFAULT_API_BASE);
                    setTestResult(null);
                  }}
                  className="text-xs font-bold font-mono bg-white hover:bg-butterAccent border border-black px-2.5 py-1 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] transition-all"
                >
                  Default (.env)
                </button>
              </div>

              {/* TEST RESULT FEEDBACK BOX */}
              {testResult && (
                <div className={`p-4 rounded-xl border-2 border-black text-xs font-bold shadow-brutal-sm flex items-start space-x-3 ${
                  testResult.success ? 'bg-emerald-200' : 'bg-rose-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-black mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-black mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-extrabold uppercase block tracking-wider">
                      {testResult.success ? 'Connection Successful!' : 'Connection Test Failed'}
                    </span>
                    <p className="text-slate-900 leading-snug">{testResult.message}</p>
                    {testResult.details && (
                      <div className="mt-2 text-[11px] font-mono bg-white/70 p-2 rounded-lg border border-black/20 space-y-0.5">
                        <div>Whisper Loaded: {String(testResult.details.whisper_loaded)}</div>
                        <div>CLIP Loaded: {String(testResult.details.clip_loaded)}</div>
                        <div>Vector DB: {String(testResult.details.vector_db_connected)}</div>
                        <div>Ollama Online: {String(testResult.details.ollama_online)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS (TEST & SAVE) */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(inputUrl)}
                  disabled={isTestingConnection || !inputUrl.trim()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-butterAccent text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Testing Link...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black" />
                      <span>Test Ping (/health)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveConnection(inputUrl)}
                  disabled={!inputUrl.trim()}
                  className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-black hover:bg-slate-900 text-butterAccent font-black text-xs uppercase tracking-wider border-2 border-black shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4 text-butterAccent" />
                  <span>Save &amp; Connect URL</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-black font-extrabold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] transition-all"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* TUNNEL CREATION CHEAT SHEET (1-CLICK COPY COMMANDS) */}
            <div className="border-t-2 border-black pt-5 space-y-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-black" />
                <h3 className="font-black text-xs uppercase tracking-wider text-black">
                  How to Expose Local Backend via HTTPS Tunnel
                </h3>
              </div>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                When hosting this frontend on Vercel, browsers require an <strong>HTTPS</strong> tunnel URL so requests are not blocked by browser Mixed Content rules. Run any of these commands on your local machine:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                
                {/* 1. Cloudflare Tunnel */}
                <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutal-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-black flex items-center gap-1.5">
                      <span>Cloudflare Tunnel</span>
                      <span className="text-[10px] bg-emerald-200 px-1.5 py-0.2 rounded border border-black font-bold">100% Free / No Signup</span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 block truncate mt-0.5">
                      cloudflared tunnel --url http://localhost:8000
                    </code>
                  </div>
                  <button
                    onClick={() => copyCommand('cloudflared tunnel --url http://localhost:8000', 'cloudflare')}
                    className="p-2 rounded-lg bg-butterBg hover:bg-butterAccent border border-black shadow-[1.5px_1.5px_0px_0px_#000] text-black transition-all flex-shrink-0"
                    title="Copy command"
                  >
                    {copiedTunnelCmd === 'cloudflare' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                  </button>
                </div>

                {/* 2. ngrok */}
                <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutal-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-black flex items-center gap-1.5">
                      <span>ngrok</span>
                      <span className="text-[10px] bg-butterAccent px-1.5 py-0.2 rounded border border-black font-bold">Automatic Header Bypass</span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 block truncate mt-0.5">
                      ngrok http 8000
                    </code>
                  </div>
                  <button
                    onClick={() => copyCommand('ngrok http 8000', 'ngrok')}
                    className="p-2 rounded-lg bg-butterBg hover:bg-butterAccent border border-black shadow-[1.5px_1.5px_0px_0px_#000] text-black transition-all flex-shrink-0"
                    title="Copy command"
                  >
                    {copiedTunnelCmd === 'ngrok' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                  </button>
                </div>

                {/* 3. localtunnel */}
                <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutal-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-black flex items-center gap-1.5">
                      <span>Localtunnel (npx)</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded border border-black font-bold">No Install Required</span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 block truncate mt-0.5">
                      npx localtunnel --port 8000
                    </code>
                  </div>
                  <button
                    onClick={() => copyCommand('npx localtunnel --port 8000', 'localtunnel')}
                    className="p-2 rounded-lg bg-butterBg hover:bg-butterAccent border border-black shadow-[1.5px_1.5px_0px_0px_#000] text-black transition-all flex-shrink-0"
                    title="Copy command"
                  >
                    {copiedTunnelCmd === 'localtunnel' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                  </button>
                </div>

                {/* 4. Pinggy */}
                <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutal-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-black flex items-center gap-1.5">
                      <span>Pinggy (SSH One-Liner)</span>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded border border-black font-bold">Runs directly in terminal</span>
                    </div>
                    <code className="text-xs font-mono font-bold text-slate-800 block truncate mt-0.5">
                      ssh -p 443 -R0:localhost:8000 a.pinggy.io
                    </code>
                  </div>
                  <button
                    onClick={() => copyCommand('ssh -p 443 -R0:localhost:8000 a.pinggy.io', 'pinggy')}
                    className="p-2 rounded-lg bg-butterBg hover:bg-butterAccent border border-black shadow-[1.5px_1.5px_0px_0px_#000] text-black transition-all flex-shrink-0"
                    title="Copy command"
                  >
                    {copiedTunnelCmd === 'pinggy' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
