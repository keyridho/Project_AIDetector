"use client";

import { useState } from "react";
import { Sparkles, Brain, FileText, Copy, CheckCircle, AlertCircle, TrendingUp, Zap } from "lucide-react";

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

interface ProcessResponse {
  success: boolean;
  detection: DetectionResult | null;
  paraphrase: ParaphraseResult | null;
}

export default function UIPreview() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("both");
  const [showResult, setShowResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleSubmit = async () => {
    if (text.trim().length >= 10) {
      setIsProcessing(true);
      setError("");
      setShowResult(false);
      
      try {
        const response = await fetch(`${API_URL}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, mode })
        });

        if (!response.ok) {
          throw new Error('Gagal memproses teks');
        }

        const data: ProcessResponse = await response.json();
        setResult(data);
        setShowResult(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan. Pastikan backend running.';
        setError(errorMessage);
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCopy = () => {
    if (result?.paraphrase?.paraphrased) {
      navigator.clipboard.writeText(result.paraphrase.paraphrased);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Header */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg px-6 py-2 rounded-full mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">Powered by Advanced AI</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-white mb-4 tracking-tight">
              AI Text Detector
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                & Paraphraser
              </span>
            </h1>
            <p className="text-white/80 text-xl max-w-2xl mx-auto leading-relaxed">
              Deteksi teks AI dengan akurasi tinggi dan ubah menjadi bahasa mahasiswa yang natural & autentik
            </p>
          </div>

          {/* Main Input Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-white/50">
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <label className="block text-gray-800 font-bold text-lg">
                    Masukkan Teks Anda
                  </label>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-56 p-5 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 focus:outline-none resize-none transition-all text-gray-700 text-base"
                  placeholder="Paste teks yang ingin Anda analisis di sini... 

Contoh: Hasil essay, artikel, atau tulisan lainnya yang ingin dicek keasliannya."
                />
                <div className="flex justify-between items-center mt-3">
                  <div className="text-sm text-gray-500">
                    <span className={`font-semibold ${text.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                      {text.length}
                    </span> karakter
                    {text.length < 10 && <span className="ml-2 text-amber-600">• Minimal 10 karakter</span>}
                  </div>
                  {text.length > 0 && (
                    <button
                      onClick={() => setText("")}
                      className="text-sm text-red-500 hover:text-red-700 font-medium transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-gray-800 font-bold mb-4 text-lg">
                  🎯 Pilih Mode Proses
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`flex items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    mode === "detect" 
                      ? "border-indigo-500 bg-indigo-50 shadow-lg" 
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                  }`}>
                    <input
                      type="radio"
                      value="detect"
                      checked={mode === "detect"}
                      onChange={(e) => setMode(e.target.value)}
                      className="mr-3 w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold text-gray-800">🔍 Deteksi Saja</div>
                      <div className="text-xs text-gray-500 mt-1">Cek keaslian teks</div>
                    </div>
                  </label>
                  <label className={`flex items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    mode === "paraphrase" 
                      ? "border-indigo-500 bg-indigo-50 shadow-lg" 
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                  }`}>
                    <input
                      type="radio"
                      value="paraphrase"
                      checked={mode === "paraphrase"}
                      onChange={(e) => setMode(e.target.value)}
                      className="mr-3 w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold text-gray-800">✍️ Paraphrase Saja</div>
                      <div className="text-xs text-gray-500 mt-1">Ubah ke natural</div>
                    </div>
                  </label>
                  <label className={`flex items-center justify-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    mode === "both" 
                      ? "border-indigo-500 bg-indigo-50 shadow-lg" 
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                  }`}>
                    <input
                      type="radio"
                      value="both"
                      checked={mode === "both"}
                      onChange={(e) => setMode(e.target.value)}
                      className="mr-3 w-5 h-5"
                    />
                    <div>
                      <div className="font-semibold text-gray-800">⚡ Keduanya</div>
                      <div className="text-xs text-gray-500 mt-1">Deteksi + Paraphrase</div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={text.trim().length < 10 || isProcessing}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-5 rounded-2xl transition duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 text-lg"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sedang Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Mulai Analisis Teks
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Results */}
          {showResult && result && (
            <div className="space-y-8 animate-fade-in">
              {/* Detection Result */}
              {result.detection && (
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Brain className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-3xl font-bold text-gray-800">
                      Hasil Deteksi AI
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className={`relative p-6 bg-gradient-to-br rounded-2xl border-2 overflow-hidden ${
                      result.detection.is_ai_generated 
                        ? 'from-red-50 to-red-100 border-red-200' 
                        : 'from-green-50 to-green-100 border-green-200'
                    }`}>
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 opacity-50 ${
                        result.detection.is_ai_generated ? 'bg-red-200' : 'bg-green-200'
                      }`}></div>
                      <div className="relative">
                        <div className={`text-sm mb-2 font-semibold ${
                          result.detection.is_ai_generated ? 'text-red-700' : 'text-green-700'
                        }`}>Status Deteksi</div>
                        <div className={`text-2xl font-black flex items-center gap-2 ${
                          result.detection.is_ai_generated ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {result.detection.is_ai_generated ? (
                            <>
                              <AlertCircle className="w-6 h-6" />
                              Terdeteksi AI
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-6 h-6" />
                              Kemungkinan Manusia
                            </>
                          )}
                        </div>
                        <div className={`text-xs mt-2 ${
                          result.detection.is_ai_generated ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {result.detection.is_ai_generated ? 'Perlu diparaphrase' : 'Aman digunakan'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border-2 border-indigo-200 overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
                      <div className="relative">
                        <div className="text-sm text-indigo-700 mb-2 font-semibold">Tingkat Keyakinan</div>
                        <div className="text-2xl font-black text-indigo-600">
                          {(result.detection.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="w-full bg-indigo-200 rounded-full h-2 mt-3">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${result.detection.confidence * 100}%`}}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border-2 border-amber-200 overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
                      <div className="relative">
                        <div className="text-sm text-amber-700 mb-2 font-semibold">Rekomendasi</div>
                        <div className="text-2xl font-black text-amber-600 flex items-center gap-2">
                          <Zap className="w-6 h-6" />
                          {result.detection.is_ai_generated ? 'Paraphrase' : 'Sudah Aman'}
                        </div>
                        <div className="text-xs text-amber-600 mt-2">
                          {result.detection.is_ai_generated ? 'Untuk keamanan' : 'Tidak perlu diubah'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-700 mb-2">
                          📋 Analisis Detail:
                        </div>
                        <div className="text-gray-700 leading-relaxed">
                          {result.detection.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paraphrase Result */}
              {result.paraphrase && (
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                    <h2 className="text-3xl font-bold text-gray-800">
                      Hasil Paraphrase
                    </h2>
                  </div>
                  
                  <div className="mb-6 p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-yellow-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                        ORIGINAL
                      </div>
                    </div>
                    <div className="text-gray-700 leading-relaxed">
                      {result.paraphrase.original}
                    </div>
                  </div>

                  <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 relative">
                    <div className="flex justify-between items-center mb-3">
                      <div className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full">
                        ✨ HASIL NATURAL
                      </div>
                      <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold rounded-xl transition transform hover:scale-105 flex items-center gap-2 shadow-lg"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Text
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-gray-700 leading-relaxed font-medium">
                      {result.paraphrase.paraphrased}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-gray-700 font-semibold">
                        <span className="text-2xl font-black text-purple-600">{result.paraphrase.changes_made}</span> perubahan kata berhasil dilakukan
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 bg-white px-4 py-2 rounded-full">
                      100% Natural
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}