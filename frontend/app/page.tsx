"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, FileText, Crown, X, Star, TrendingUp, Shield, Rocket, Upload, File } from "lucide-react";

interface DetectionResult {
  is_ai_generated: boolean;
  confidence: number;
  reason: string;
}

interface ParaphraseResult {
  original: string;
  paraphrased: string;
  changes_made: number;
}

interface Result {
  success: boolean;
  detection: DetectionResult | null;
  paraphrase: ParaphraseResult | null;
}

export default function Home() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("detect");
  const [showResult, setShowResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [fileName, setFileName] = useState("");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [apiUrl, setApiUrl] = useState("");

  // API Configuration - Smart Detection
  useEffect(() => {
    const getApiUrl = () => {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:8000";
      }
      if (window.location.hostname.includes("shiiroo.online")) {
        return "https://api.shiiroo.online";
      }
      return "http://localhost:8000";
    };

    const url = getApiUrl();
    setApiUrl(url);
    console.log("🌐 API URL:", url);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setError("");
    setIsProcessing(true);
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = async () => {
          try {
            const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }
            
            setText(fullText.trim());
            setIsProcessing(false);
          } catch (err) {
            console.error(err);
            setError("Gagal membaca file PDF. Pastikan file PDF valid.");
            setFileName("");
            setIsProcessing(false);
          }
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error(err);
        setError("Gagal membaca file PDF. Pastikan file PDF valid.");
        setFileName("");
        setIsProcessing(false);
      }
    } else {
      setError("Hanya file PDF yang didukung. Untuk Word, copy-paste manual.");
      setFileName("");
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!apiUrl) {
      setError("API URL belum siap, tunggu sebentar...");
      return;
    }

    if (text.trim().length < 10) {
      setError("Teks minimal 10 karakter");
      return;
    }

    if (mode === "paraphrase" && !isVip) {
      setUpgradeReason("paraphrase");
      setShowUpgradeModal(true);
      return;
    }

    if (mode === "detect" && !isVip && usageCount >= 3) {
      setUpgradeReason("limit");
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    setError("");
    setShowResult(false);
    
    try {
      const response = await fetch(`${apiUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          text: text,
          mode: mode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setResult(data);
      setShowResult(true);
      setIsProcessing(false);
      
      if (mode === "detect" && !isVip) {
        setUsageCount(usageCount + 1);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError(`Gagal terhubung ke server. Pastikan: 
      1. Backend berjalan di ${apiUrl}
      2. Ollama sudah running (ollama serve)
      3. Model llama3 sudah terinstall (ollama pull llama3)
      4. Jika dari HP: pastikan dalam WiFi yang sama dengan laptop`);
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.paraphrase?.paraphrased) {
      navigator.clipboard.writeText(result.paraphrase.paraphrased);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTryVip = () => {
    setIsVip(true);
    setShowUpgradeModal(false);
    alert('🎉 Selamat! VIP Trial Active!');
  };

  const remainingUses = Math.max(0, 3 - usageCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg px-6 py-2 rounded-full border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">Powered by AI</span>
            </div>
            
            <div className="flex items-center gap-4">
              {!isVip && (
                <div className="bg-white/10 backdrop-blur-lg px-4 py-2 rounded-full border border-white/20">
                  <span className="text-white/90 text-sm font-semibold">
                    Deteksi: <span className={remainingUses === 0 ? 'text-red-400' : 'text-cyan-400'}>{usageCount}/3</span>
                  </span>
                </div>
              )}
              
              {isVip ? (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 rounded-full flex items-center gap-2">
                  <Crown className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">VIP</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setUpgradeReason("button");
                    setShowUpgradeModal(true);
                  }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 rounded-full flex items-center gap-2 hover:from-yellow-500 hover:to-orange-600 transition-all"
                >
                  <Crown className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">Upgrade VIP</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-4">
              AI Text Detector
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                & Paraphraser
              </span>
            </h1>
            <p className="text-white/80 text-xl max-w-2xl mx-auto">
              Deteksi teks AI dan ubah menjadi natural
            </p>
          </div>

          <div className="bg-white/95 rounded-3xl shadow-2xl p-8 mb-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <label className="block text-gray-800 font-bold text-lg">
                  Input Teks atau Upload File
                </label>
              </div>

              <div className="mb-4">
                <label className="w-full flex flex-col items-center px-6 py-8 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-colors">
                  <Upload className="w-12 h-12 text-indigo-500 mb-3" />
                  <span className="text-indigo-700 font-semibold">Upload File PDF</span>
                  <span className="text-xs text-gray-500 mt-1">(Max 10MB)</span>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                </label>
                {fileName && (
                  <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                    <File className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium text-sm">{fileName}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-gray-500 text-sm my-4">ATAU</div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-56 p-5 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:outline-none text-gray-700 resize-none"
                placeholder="Ketik atau paste teks di sini..."
              />
              <div className="flex justify-between mt-3">
                <span className="text-sm text-gray-500">{text.length} karakter</span>
                {text.length > 0 && (
                  <button onClick={() => { setText(""); setFileName(""); }} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear</button>
                )}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-gray-800 font-bold mb-4">Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${mode === "detect" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" value="detect" checked={mode === "detect"} onChange={(e) => setMode(e.target.value)} className="mr-3" />
                  <span className="font-bold text-gray-900">🔍 Deteksi AI</span>
                  <div className="text-sm text-gray-500">Gratis 3x</div>
                </label>

                <label className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${mode === "paraphrase" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                  {!isVip && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">VIP</div>
                  )}
                  <input type="radio" value="paraphrase" checked={mode === "paraphrase"} onChange={(e) => setMode(e.target.value)} className="mr-3" />
                  <span className="font-bold text-gray-900">✍️ Paraphrase</span>
                  <div className="text-sm text-gray-500">{!isVip ? "Butuh VIP" : "Natural & Smooth"}</div>
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={text.trim().length < 10 || isProcessing || !apiUrl}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{mode === "detect" ? "🔍 Mulai Deteksi" : "✍️ Paraphrase Sekarang"}</span>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-8">
              <div className="font-bold mb-1">Error:</div>
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}

          {showResult && result && result.detection && mode === "detect" && (
            <div className="bg-white/95 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Hasil Deteksi AI</h2>
              <div className={`p-6 rounded-2xl mb-4 ${result.detection.is_ai_generated ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <div className="font-bold text-xl text-gray-900">{result.detection.is_ai_generated ? "⚠️ Terdeteksi AI" : "✅ Kemungkinan Manusia"}</div>
                <div className="mt-2 text-gray-900">Confidence: {(result.detection.confidence * 100).toFixed(1)}%</div>
              </div>
              <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <div className="font-bold mb-2 text-gray-900">Analisis:</div>
                <div className="text-gray-900">{result.detection.reason}</div>
              </div>
              {result.detection.is_ai_generated && !isVip && (
                <div className="mt-6 bg-purple-500 text-white p-6 rounded-2xl text-center">
                  <h3 className="font-bold text-xl mb-2">Butuh Paraphrase?</h3>
                  <p className="mb-4 text-sm">Ubah teks AI menjadi natural dengan fitur Paraphrase VIP</p>
                  <button onClick={() => { setUpgradeReason("paraphrase"); setShowUpgradeModal(true); }} className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                    Upgrade VIP
                  </button>
                </div>
              )}
            </div>
          )}

          {showResult && result && result.paraphrase && mode === "paraphrase" && (
            <div className="bg-white/95 rounded-3xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Hasil Paraphrase</h2>
              <div className="mb-6 p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
                <div className="text-xs font-bold mb-3 text-gray-900">ORIGINAL</div>
                <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">{result.paraphrase.original}</div>
              </div>
              <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-gray-900">HASIL NATURAL</div>
                  <button onClick={handleCopy} className="text-sm font-bold text-green-600 hover:text-green-700 px-4 py-2 bg-white rounded-lg hover:bg-green-50 transition-colors">
                    {copied ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <div className="text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">{result.paraphrase.paraphrased}</div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                <span className="bg-blue-100 px-4 py-2 rounded-full">
                  ✨ {result.paraphrase.changes_made} perubahan dilakukan
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-10 text-center relative">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <Crown className="w-16 h-16 text-white mx-auto mb-4" />
              <h2 className="text-4xl font-black text-white mb-2">Upgrade VIP</h2>
              <p className="text-white text-lg">
                {upgradeReason === "paraphrase" ? "Paraphrase Butuh VIP" : upgradeReason === "limit" ? "Batas Gratis Tercapai" : "Unlimited Access"}
              </p>
            </div>

            <div className="p-8">
              <div className="bg-purple-500 rounded-2xl p-6 mb-6 text-center text-white">
                <Rocket className="w-10 h-10 mx-auto mb-2" />
                <h3 className="text-2xl font-black mb-2">COMING SOON!</h3>
                <p>Fitur pembayaran sedang dikembangkan</p>
                <p className="text-sm mt-2">Coba VIP gratis dulu! 🎉</p>
              </div>

              {upgradeReason === "paraphrase" && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 mb-6">
                  <p className="font-bold text-purple-800">Paraphrase Khusus VIP!</p>
                  <p className="text-sm text-purple-700 mt-2">Ubah teks AI jadi natural dengan VIP</p>
                </div>
              )}

              {upgradeReason === "limit" && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6">
                  <p className="font-bold text-red-800">Batas 3x Tercapai!</p>
                  <p className="text-sm text-red-700 mt-2">Upgrade untuk unlimited deteksi</p>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl p-8 inline-block">
                  <div className="text-white/90 text-sm mb-2">Harga</div>
                  <div className="text-5xl font-black text-white">
                    <span className="text-2xl">Rp</span>
                    <span className="line-through opacity-50">100K</span>
                  </div>
                  <div className="text-white">per bulan</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: TrendingUp, title: "Unlimited Deteksi" },
                  { icon: Sparkles, title: "Paraphrase Premium" },
                  { icon: Shield, title: "Akurasi 99%" },
                  { icon: Star, title: "Support 24/7" }
                ].map((b, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl">
                    <b.icon className="w-6 h-6 text-indigo-600 mb-2" />
                    <div className="font-bold text-sm text-gray-900">{b.title}</div>
                  </div>
                ))}
              </div>

              <button onClick={handleTryVip} className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl mb-3 hover:bg-green-600 transition-colors">
                🎁 Coba VIP Gratis
              </button>
              <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-4 rounded-2xl mb-3 cursor-not-allowed">
                💳 Coming Soon
              </button>
              <button onClick={() => setShowUpgradeModal(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl hover:bg-gray-200 transition-colors">
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}