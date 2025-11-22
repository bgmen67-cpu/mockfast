'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { nanoid } from 'nanoid';
import { Zap, LogOut, Settings, Shield, AlertTriangle, Activity, Lock, Copy, Rocket, Clock, Code, X } from 'lucide-react';

export default function Dashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  
  // Form States
  const [jsonInput, setJsonInput] = useState('{\n  "id": "{{string.uuid}}",\n  "name": "{{person.firstName}}"\n}');
  const [method, setMethod] = useState('GET');
  const [token, setToken] = useState('');
  const [chaos, setChaos] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // PRO Feature States
  const [responseDelay, setResponseDelay] = useState(0); 
  const [customHeaders, setCustomHeaders] = useState('');
  
  // NEW Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); 

  // 1. Load User & Data on Mount
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        // Check if they are Pro
        const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', data.user.id).single();
        setIsPro(profile?.is_pro || false);
        loadMocks(data.user.id);
      }
    };
    init();
  }, []);

  const loadMocks = async (uid: string) => {
    const { data } = await supabase.from('endpoints').select('*').order('created_at', { ascending: false });
    if (data) setEndpoints(data);
  };

  // 2. Create Mock
  const handleCreate = async () => {
    if (!user) return alert('Please Login first!');
    setLoading(true);
    const id = nanoid(6); 
    
    const { error } = await supabase.from('endpoints').insert({
      id,
      user_id: user.id,
      name: `Mock ${id}`,
      json_template: jsonInput,
      method,
      protected_token: isPro && token ? token : null,
      chaos_config: isPro ? { enabled: chaos, rate: 0.2 } : null,
      response_delay_ms: isPro && responseDelay > 0 ? responseDelay : null,
      custom_headers_json: isPro && customHeaders ? customHeaders : null
    });

    if (error) alert('Error creating mock');
    else loadMocks(user.id);
    setLoading(false);
  };
  
  // New handler to just open the modal
  const handleUpgradeClick = () => {
    if (!user) return alert("Please login first to upgrade!");
    setShowUpgradeModal(true);
  };

  // 3. Payments & Auth
  const handleLogin = () => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } });
  
  // Renamed to be explicitly the action that starts Stripe checkout
  const handleInitiateStripe = async () => {
    setShowUpgradeModal(false); // Close modal before redirect
    
    const res = await fetch('/api/stripe/checkout', { 
        method: 'POST', 
        body: JSON.stringify({ userId: user.id })
    });
    const d = await res.json();
    
    if(d.url) {
        window.location.href = d.url;
    } else {
        // --- NEW ERROR ALERT ---
        alert("Payment initiation failed. Please check your Stripe keys in .env.local!");
        console.error("Stripe Error Response:", d);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 font-sans p-4 md:p-8">
      {/* MODAL OVERLAY */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="bg-neutral-900 p-8 rounded-xl w-full max-w-lg border border-yellow-400 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex justify-between items-start mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
                <Zap className="fill-yellow-400" size={24}/> Go Pro!
              </h2>
              <button onClick={() => setShowUpgradeModal(false)} className="text-gray-500 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">Unlock all advanced simulation features to create truly realistic mock APIs for just **$1.99/mo**.</p>
            
            <ul className="space-y-3 mb-8 text-sm text-gray-200">
              <li className="flex items-center gap-3"><Lock className="text-green-500" size={16}/> **Bearer Token Security:** Protect your endpoints from unauthorized access.</li>
              <li className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={16}/> **Chaos Failure Mode:** Simulate real-world failures by randomly returning 500 errors.</li>
              <li className="flex items-center gap-3"><Clock className="text-yellow-500" size={16}/> **Custom Response Delay:** Fine-tune response times (0ms-5000ms) to simulate slow APIs.</li>
              <li className="flex items-center gap-3"><Code className="text-blue-500" size={16}/> **Custom HTTP Headers:** Add specific headers for caching, rate limits, or custom data.</li>
            </ul>
            
            <button 
              onClick={handleInitiateStripe}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg text-lg transition"
            >
              Confirm Upgrade to PRO ($1.99/mo)
            </button>
          </div>
        </div>
      )}
      {/* END MODAL OVERLAY */}
      
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
            <Zap className="fill-yellow-400" /> MockFast
          </h1>
          {user ? (
            <div className="flex items-center gap-4">
              {!isPro ? (
                <button onClick={handleUpgradeClick} className="bg-green-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition">
                  Upgrade $1.99
                </button>
              ) : <span className="text-xs font-bold bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full">PRO ACCOUNT</span>}
              
              <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())} className="text-gray-500 hover:text-white">
                <LogOut size={20}/>
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
              Login with GitHub
            </button>
          )}
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar: List of Mocks */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Your Mocks</h3>
            {endpoints.length === 0 && <p className="text-sm text-gray-600 italic">No mocks yet. Create one!</p>}
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {endpoints.map(ep => (
                <div key={ep.id} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 hover:border-gray-600 transition group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ep.method === 'POST' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm text-gray-300">/api/m/{ep.id}</span>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/m/${ep.id}`)} className="text-gray-500 hover:text-white">
                      <Copy size={14}/>
                    </button>
                  </div>
                  <div className="flex gap-2 text-[10px] text-gray-500">
                      {ep.protected_token && <span className="flex items-center gap-1"><Lock size={10}/> Secured</span>}
                      {ep.chaos_config?.enabled && <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10}/> Chaos</span>}
                      {ep.response_delay_ms && <span className="flex items-center gap-1 text-yellow-400"><Clock size={10}/> {ep.response_delay_ms}ms Delay</span>}
                      {ep.custom_headers_json && <span className="flex items-center gap-1 text-gray-400"><Code size={10}/> Headers</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content: Editor & Settings */}
          <div className="lg:col-span-2">
            
            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-gray-800">
                <button onClick={()=>setActiveTab('editor')} className={`pb-2 text-sm font-bold transition ${activeTab==='editor'?'text-yellow-400 border-b-2 border-yellow-400':'text-gray-500'}`}>JSON Editor</button>
                <button onClick={()=>setActiveTab('settings')} className={`pb-2 text-sm font-bold flex items-center gap-2 transition ${activeTab==='settings'?'text-yellow-400 border-b-2 border-yellow-400':'text-gray-500'}`}>
                  <Settings size={14}/> Advanced Settings {isPro ? '' : '(Locked)'}
                </button>
            </div>

            {activeTab === 'editor' ? (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg">
                        <div className="flex justify-between mb-2">
                            <select value={method} onChange={e=>setMethod(e.target.value)} className="bg-black border border-gray-700 text-white rounded px-3 py-1 text-xs">
                                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                            </select>
                            <span className="text-xs text-gray-500">Faker.js Supported</span>
                        </div>
                        <textarea 
                          value={jsonInput} 
                          onChange={e=>setJsonInput(e.target.value)} 
                          className="w-full h-80 bg-black text-green-400 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none resize-none"
                          spellCheck={false} 
                        />
                    </div>
                    <button 
                      onClick={handleCreate} 
                      disabled={loading}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl text-lg transition flex items-center justify-center gap-2"
                    >
                      {loading ? 'Deploying...' : <><Rocket size={20}/> Launch Endpoint</>}
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in">
                    {/* Upsell Banner */}
                    {!isPro && (
                      <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-xl flex items-start gap-3">
                        <Shield className="text-blue-400 mt-1" size={20}/>
                        <div>
                          <h4 className="font-bold text-blue-100 text-sm">Pro Features Locked</h4>
                          <p className="text-xs text-blue-300 mt-1">Upgrade to enable all advanced simulation features.</p>
                        </div>
                        <button onClick={handleUpgradeClick} className="ml-auto bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs font-bold text-white">Upgrade</button>
                      </div>
                    )}
                    
                    {/* Security Setting */}
                    <div className={`p-6 bg-neutral-900 border border-neutral-800 rounded-xl ${!isPro && 'opacity-50 pointer-events-none'}`}>
                        <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-300"><Lock size={16}/> Bearer Token Security</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 bg-black px-2 py-2 rounded border border-gray-700">Authorization: Bearer</span>
                          <input placeholder="my-secret-token" value={token} onChange={e=>setToken(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-blue-500"/>
                        </div>
                    </div>

                    {/* Delay Setting (NEW) */}
                    <div className={`p-6 bg-neutral-900 border border-neutral-800 rounded-xl ${!isPro && 'opacity-50 pointer-events-none'}`}>
                        <h4 className="font-bold mb-3 flex items-center gap-2 text-yellow-400"><Clock size={16}/> Response Delay (ms)</h4>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0" 
                            max="5000"
                            placeholder="500" 
                            value={responseDelay} 
                            onChange={e=>setResponseDelay(parseInt(e.target.value) || 0)} 
                            className="w-24 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                          />
                          <span className="text-xs text-gray-500">Milliseconds (0ms - 5000ms)</span>
                        </div>
                    </div>

                    {/* Headers Setting (NEW) */}
                    <div className={`p-6 bg-neutral-900 border border-neutral-800 rounded-xl ${!isPro && 'opacity-50 pointer-events-none'}`}>
                        <h4 className="font-bold mb-3 flex items-center gap-2 text-blue-400"><Code size={16}/> Custom Response Headers (JSON)</h4>
                        <textarea 
                          placeholder='{"Cache-Control": "max-age=3600", "X-Custom-ID": "12345"}' 
                          value={customHeaders} 
                          onChange={e=>setCustomHeaders(e.target.value)} 
                          className="w-full h-24 bg-black text-gray-300 font-mono text-sm p-3 rounded-lg border border-gray-700 focus:border-blue-500 outline-none resize-none"
                          spellCheck={false} 
                        />
                        <p className="text-xs text-gray-500 mt-2">Must be valid JSON (key/value pairs).</p>
                    </div>

                    {/* Chaos Setting */}
                    <div className={`p-6 bg-neutral-900 border border-neutral-800 rounded-xl ${!isPro && 'opacity-50 pointer-events-none'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold mb-1 flex items-center gap-2 text-red-400"><AlertTriangle size={16}/> Chaos Mode</h4>
                              <p className="text-xs text-gray-500">Randomly fails 20% of requests with HTTP 500.</p>
                            </div>
                            <input type="checkbox" className="w-5 h-5 accent-red-500" checked={chaos} onChange={e=>setChaos(e.target.checked)} />
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}