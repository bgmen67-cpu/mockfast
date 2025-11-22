'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { nanoid } from 'nanoid';
import { 
  Zap, LogOut, Settings, Shield, AlertTriangle, Lock, Copy, Rocket, 
  Clock, Code, X, FileJson, FileCode, Server, Activity, CreditCard 
} from 'lucide-react';

export default function Dashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  
  // Form States
  const [jsonInput, setJsonInput] = useState('{\n  "id": "{{uuid}}",\n  "name": "{{firstName}}",\n  "email": "{{email}}",\n  "role": "admin"\n}');
  const [method, setMethod] = useState('GET');
  const [statusCode, setStatusCode] = useState(200); // NEW: Status Code
  const [contentType, setContentType] = useState('application/json'); // NEW: Content Type
  const [token, setToken] = useState('');
  const [chaos, setChaos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  
  // PRO Feature States
  const [responseDelay, setResponseDelay] = useState(0); 
  const [customHeaders, setCustomHeaders] = useState('');
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); 

  // 1. Load User & Data
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
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
    
    // We bundle all the advanced settings into the JSON payload for simplicity
    // In a real app, you'd add columns for status_code, content_type etc.
    const { error } = await supabase.from('endpoints').insert({
      id,
      user_id: user.id,
      name: `Mock ${id}`,
      json_template: jsonInput,
      method,
      protected_token: isPro && token ? token : null,
      chaos_config: isPro ? { enabled: chaos, rate: 0.2 } : null,
      response_delay_ms: isPro && responseDelay > 0 ? responseDelay : null,
      custom_headers_json: isPro ? JSON.stringify({
         ...JSON.parse(customHeaders || '{}'),
         "X-MockFast-Status": statusCode, // We store status here for the demo logic
         "Content-Type": contentType
      }) : null
    });

    if (error) alert('Error creating mock');
    else loadMocks(user.id);
    setLoading(false);
  };

  // 3. Billing Handlers
  const handleUpgradeClick = () => {
    if (!user) return alert("Please login first!");
    setShowUpgradeModal(true);
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
        const res = await fetch('/api/stripe/portal', { method: 'POST' });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else alert("Could not access billing portal. " + (data.error || ""));
    } catch (e) {
        alert("Error connecting to Stripe.");
    }
    setManagingBilling(false);
  };

  const handleInitiateStripe = async () => {
    setShowUpgradeModal(false);
    const res = await fetch('/api/stripe/checkout', { 
        method: 'POST', 
        body: JSON.stringify({ userId: user.id })
    });
    const d = await res.json();
    if(d.url) window.location.href = d.url;
    else alert("Payment initiation failed. Check keys!");
  };

  // Helper to insert dynamic tags
  const insertTag = (tag: string) => {
    setJsonInput(prev => prev.replace('}', `  "newField": "{{${tag}}}"\n}`));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200 font-sans p-4 md:p-8">
      {/* MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 p-8 rounded-xl w-full max-w-lg border border-yellow-400 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2"><Zap className="fill-yellow-400"/> Go Pro!</h2>
              <button onClick={() => setShowUpgradeModal(false)}><X size={24} /></button>
            </div>
            <p className="text-gray-300 mb-6">Unlock Chaos Mode, 404 Simulations, Delays, and more.</p>
            <button onClick={handleInitiateStripe} className="w-full bg-yellow-500 text-black font-bold py-3 rounded-lg hover:bg-yellow-400">
              Confirm Upgrade ($1.99/mo)
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6 gap-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <div className="bg-yellow-500 p-1 rounded"><Zap className="text-black fill-black" size={24}/></div>
            MockFast <span className="text-sm text-gray-500 font-normal ml-2">v2.0</span>
          </h1>
          
          {user ? (
            <div className="flex items-center gap-3">
              {!isPro ? (
                <button onClick={handleUpgradeClick} className="bg-green-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-500 transition shadow-lg shadow-green-900/20">
                  Upgrade to Pro
                </button>
              ) : (
                <button 
                  onClick={handleManageBilling} 
                  disabled={managingBilling}
                  className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-neutral-700 transition"
                >
                  <CreditCard size={16} className="text-yellow-400"/>
                  {managingBilling ? 'Loading...' : 'Manage Subscription'}
                </button>
              )}
              <button onClick={() => supabase.auth.signOut().then(()=>window.location.reload())} className="p-2 bg-neutral-900 rounded-lg hover:text-white hover:bg-neutral-800 text-gray-500">
                <LogOut size={20}/>
              </button>
            </div>
          ) : (
            <button onClick={()=>supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } })} className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200">
              Login
            </button>
          )}
        </header>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Sidebar (Mocks List) - Col Span 3 */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Endpoints</h3>
                <span className="text-xs bg-neutral-800 px-2 py-1 rounded-full text-gray-400">{endpoints.length}</span>
            </div>
            
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {endpoints.map(ep => (
                <div key={ep.id} className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 hover:border-yellow-500/50 transition group cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                        ep.method === 'POST' ? 'bg-purple-500/20 text-purple-300' : 
                        ep.method === 'DELETE' ? 'bg-red-500/20 text-red-300' : 
                        'bg-blue-500/20 text-blue-300'
                    }`}>
                      {ep.method}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/m/${ep.id}`)} className="text-gray-600 hover:text-white">
                            <Copy size={12}/>
                        </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-gray-300 truncate mb-1">/api/m/{ep.id}</div>
                  <div className="flex gap-2 text-[10px] text-gray-500">
                     {/* Show icons based on features enabled */}
                     {ep.response_delay_ms && <Clock size={10} className="text-yellow-500"/>}
                     {ep.chaos_config?.enabled && <AlertTriangle size={10} className="text-red-500"/>}
                     {ep.protected_token && <Lock size={10} className="text-green-500"/>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content - Col Span 9 */}
          <div className="lg:col-span-9">
            
            {/* Main Tabs */}
            <div className="flex gap-6 mb-6 border-b border-gray-800">
                <button onClick={()=>setActiveTab('editor')} className={`pb-3 px-1 text-sm font-bold transition border-b-2 ${activeTab==='editor'?'text-white border-yellow-400':'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    Create Endpoint
                </button>
                <button onClick={()=>setActiveTab('logs')} className={`pb-3 px-1 text-sm font-bold transition border-b-2 ${activeTab==='logs'?'text-white border-yellow-400':'text-gray-500 border-transparent hover:text-gray-300'}`}>
                    Traffic Logs
                </button>
            </div>

            {activeTab === 'editor' ? (
                <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Left Column: Editor */}
                    <div className="space-y-4">
                        <div className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl shadow-lg flex flex-col h-[500px]">
                            <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900 rounded-t-xl">
                                <div className="flex gap-2">
                                    <select value={method} onChange={e=>setMethod(e.target.value)} className="bg-black border border-neutral-700 text-white rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-yellow-500">
                                        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                                    </select>
                                    <select value={statusCode} onChange={e=>setStatusCode(parseInt(e.target.value))} className="bg-black border border-neutral-700 text-yellow-400 rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-yellow-500">
                                        <option value="200">200 OK</option>
                                        <option value="201">201 Created</option>
                                        <option value="400">400 Bad Request</option>
                                        <option value="401">401 Unauthorized</option>
                                        <option value="403">403 Forbidden</option>
                                        <option value="404">404 Not Found</option>
                                        <option value="500">500 Server Error</option>
                                    </select>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={()=>insertTag('uuid')} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-gray-300">+ UUID</button>
                                    <button onClick={()=>insertTag('email')} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-gray-300">+ Email</button>
                                </div>
                            </div>
                            <textarea 
                              value={jsonInput} 
                              onChange={e=>setJsonInput(e.target.value)} 
                              className="flex-1 w-full bg-black text-green-400 font-mono text-sm p-4 outline-none resize-none rounded-b-xl"
                              spellCheck={false} 
                            />
                        </div>
                    </div>

                    {/* Right Column: Advanced Config */}
                    <div className="space-y-6">
                         {/* Deploy Button */}
                        <button 
                          onClick={handleCreate} 
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-4 rounded-xl text-lg shadow-lg shadow-yellow-500/20 transition flex items-center justify-center gap-2"
                        >
                          {loading ? 'Deploying...' : <><Rocket size={20}/> Launch Endpoint</>}
                        </button>

                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 space-y-6">
                            
                            {/* Content Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Response Content Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['application/json', 'text/xml', 'text/plain'].map(type => (
                                        <button 
                                            key={type} 
                                            onClick={()=>setContentType(type)}
                                            className={`text-xs py-2 px-1 rounded border ${contentType===type ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black border-neutral-800 text-gray-500 hover:border-gray-600'}`}
                                        >
                                            {type.split('/')[1]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-neutral-800 w-full"></div>

                            {/* Pro Features Block */}
                            <div className={!isPro ? "opacity-50 pointer-events-none relative" : ""}>
                                {!isPro && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                                        <div className="bg-black/90 border border-neutral-700 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                                            <Lock size={14} className="text-yellow-500"/>
                                            <span className="text-xs font-bold text-white">Pro Features Locked</span>
                                        </div>
                                    </div>
                                )}

                                {/* Delay */}
                                <div className="mb-6">
                                    <div className="flex justify-between mb-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-400"><Clock size={12}/> Response Delay</label>
                                        <span className="text-xs text-yellow-500 font-mono">{responseDelay}ms</span>
                                    </div>
                                    <input type="range" min="0" max="5000" step="100" value={responseDelay} onChange={e=>setResponseDelay(parseInt(e.target.value))} className="w-full accent-yellow-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"/>
                                </div>

                                {/* Chaos */}
                                <div className="flex items-center justify-between mb-6">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400"><AlertTriangle size={12}/> Chaos Mode (20% Failure)</label>
                                    <input type="checkbox" checked={chaos} onChange={e=>setChaos(e.target.checked)} className="w-4 h-4 accent-red-500 bg-black"/>
                                </div>
                                
                                {/* Token */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2"><Shield size={12}/> Bearer Token</label>
                                    <input placeholder="Enter secret token..." value={token} onChange={e=>setToken(e.target.value)} className="w-full bg-black border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:border-green-500 outline-none"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* LOGS TAB */
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center animate-in fade-in">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="text-gray-600" size={32}/>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Traffic Logs</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                        See the last 50 requests to your endpoints. Inspect headers, bodies, and response times in real-time.
                    </p>
                    {!isPro ? (
                        <button onClick={handleUpgradeClick} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm">
                            Upgrade to Unlock Logs
                        </button>
                    ) : (
                        <div className="text-yellow-500 font-mono text-xs">Waiting for traffic... (Log feature coming in v2.1)</div>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}