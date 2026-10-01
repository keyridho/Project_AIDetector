from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import re
import asyncio
from datetime import datetime

app = FastAPI(title="AI Detector & Paraphraser API")

# CORS Configuration - FIXED FOR PRODUCTION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://shiiroo.online",
        "https://www.shiiroo.online",
        "https://*.shiiroo.online"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ============ QUEUE SYSTEM ============
MAX_CONCURRENT = 2  # Maksimal 2 request bersamaan
queue_semaphore = asyncio.Semaphore(MAX_CONCURRENT)
queue_position = 0
active_requests = 0
total_queued = 0

async def get_queue_info():
    """Get current queue status"""
    return {
        "active": active_requests,
        "waiting": total_queued - active_requests,
        "max_concurrent": MAX_CONCURRENT
    }
# =====================================

# Ollama Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"

class TextRequest(BaseModel):
    text: str
    mode: str

class DetectionResult(BaseModel):
    is_ai_generated: bool
    confidence: float
    reason: str

class ParaphraseResult(BaseModel):
    original: str
    paraphrased: str
    changes_made: int

class ProcessResponse(BaseModel):
    success: bool
    detection: DetectionResult | None = None
    paraphrase: ParaphraseResult | None = None
    queue_info: dict | None = None

def call_ollama(prompt: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
    """Call Ollama API"""
    try:
        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "temperature": temperature,
            "options": {
                "num_predict": max_tokens
            }
        }
        
        print(f"🔄 Calling Ollama with prompt: {prompt[:100]}...")
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        output = result.get("response", "").strip()
        print(f"✅ Ollama response: {output[:200]}...")
        return output
    
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama. Is it running?")
        raise HTTPException(
            status_code=503, 
            detail="Cannot connect to Ollama. Please run: ollama serve"
        )
    except requests.exceptions.Timeout:
        print("⏱️ Ollama timeout")
        raise HTTPException(status_code=504, detail="Ollama request timeout")
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama error: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama API error: {str(e)}")

def detect_ai_text(text: str) -> DetectionResult:
    """Deteksi apakah teks dibuat oleh AI"""
    
    prompt = f"""Analisis apakah teks ini ditulis oleh AI atau manusia.

INDIKATOR AI:
- Terlalu formal dan sempurna
- Struktur sangat terorganisir dengan poin-poin
- Tidak ada typo atau kesalahan kecil
- Penggunaan kata transisi yang berlebihan (furthermore, moreover, in addition)
- Kalimat sangat seimbang dan simetris
- Terlalu objektif, tidak ada opini personal
- Pengulangan pola yang konsisten

INDIKATOR MANUSIA:
- Ada variasi gaya dan kesalahan kecil
- Lebih personal dan subjektif
- Struktur lebih bebas dan natural
- Ada idiom atau bahasa gaul
- Kalimat bervariasi panjang pendeknya
- Ada pengulangan kata yang tidak efisien

Teks yang dianalisis:
"{text}"

Berikan analisis dalam format JSON dengan penjelasan dalam BAHASA INDONESIA (hanya JSON, tanpa teks lain):
{{
    "is_ai_generated": true/false,
    "confidence": 0.0-1.0,
    "reason": "penjelasan singkat dalam bahasa Indonesia"
}}"""

    try:
        response = call_ollama(prompt, temperature=0.2, max_tokens=300)
        
        json_match = re.search(r'\{[^{}]*"is_ai_generated"[^{}]*"confidence"[^{}]*"reason"[^{}]*\}', 
                              response, re.DOTALL)
        
        if json_match:
            json_str = json_match.group()
            json_str = re.sub(r',\s*}', '}', json_str)
            result = json.loads(json_str)
            
            if "is_ai_generated" in result and "confidence" in result and "reason" in result:
                return DetectionResult(
                    is_ai_generated=bool(result["is_ai_generated"]),
                    confidence=min(max(float(result["confidence"]), 0.0), 1.0),
                    reason=str(result["reason"])
                )
        
        return simple_detection(text)
    
    except Exception as e:
        print(f"⚠️ Detection error: {e}")
        return simple_detection(text)

def simple_detection(text: str) -> DetectionResult:
    """Fallback detection menggunakan heuristik sederhana"""
    score = 0
    indicators = []
    
    formal_words = ['furthermore', 'moreover', 'in addition', 'consequently', 'therefore', 
                   'additionally', 'thus', 'hence', 'nonetheless']
    formal_count = sum(1 for word in formal_words if word.lower() in text.lower())
    if formal_count >= 2:
        score += 0.3
        indicators.append("penggunaan kata transisi formal")
    
    if re.search(r'(^|\n)\s*[\d\-\*•]\s*', text):
        score += 0.2
        indicators.append("struktur poin-poin terorganisir")
    
    sentences = re.split(r'[.!?]+', text)
    if len(sentences) >= 3:
        lengths = [len(s.strip().split()) for s in sentences if s.strip()]
        if lengths:
            avg_len = sum(lengths) / len(lengths)
            variance = sum((x - avg_len) ** 2 for x in lengths) / len(lengths)
            if variance < 20:
                score += 0.25
                indicators.append("panjang kalimat terlalu seragam")
    
    informal_words = ['gue', 'lo', 'sih', 'banget', 'gimana', 'kayak', 'emang', 'udah']
    informal_count = sum(1 for word in informal_words if word in text.lower())
    if informal_count >= 2:
        score -= 0.3
        indicators.append("bahasa informal natural")
    
    confidence = min(max(score, 0.5), 0.9)
    is_ai = confidence > 0.6
    
    reason = "Teks menunjukkan: " + ", ".join(indicators[:2]) if indicators else "Analisis heuristik standar"
    
    return DetectionResult(
        is_ai_generated=is_ai,
        confidence=confidence,
        reason=reason
    )

def paraphrase_text(text: str) -> ParaphraseResult:
    """Paraphrase teks menjadi bahasa mahasiswa yang natural"""
    
    prompt = f"""Kamu adalah mahasiswa Indonesia yang sedang menulis ulang catatan dengan gaya bahasa sendiri yang natural dan mudah dipahami.

ATURAN PENTING:
1. Tulis dalam BAHASA INDONESIA yang simple dan natural
2. Langsung tulis hasil parafrase tanpa pengantar atau label apapun
3. JANGAN gunakan kata: "Berikut", "Hasil", "Paraphrase", "Versi", "Catatan", atau label lainnya
4. JANGAN awali dengan: "Saya menulis", "Jadi", "Artikel ini", "Teks ini"
5. Langsung mulai dengan isi konten
6. Tulis seperti menjelaskan ke teman dengan bahasa sederhana
7. Pertahankan semua fakta, angka, dan informasi penting
8. Gunakan kalimat pendek dan jelas
9. Variasi struktur kalimat agar tidak monoton
10. Boleh gunakan kata informal: bisa, jadi, karena, sama, atau, itu, ini

Teks yang harus ditulis ulang:
{text}

Tulis ulang sekarang (langsung isi, tanpa label):"""

    try:
        response = call_ollama(prompt, temperature=0.85, max_tokens=1000)
        
        paraphrased_text = response.strip()
        
        patterns_to_remove = [
            r'^(Berikut|Hasil|Paraphrase|Parafrase|Tulis ulang|Versi natural|Versi|Catatan|Ini|Here|Result)[:\s]*',
            r'^["\'`]+|["\'`]+$',
            r'^\s*[-–—]\s*',
            r'^Oke[,.]?\s*',
            r'^Baik[,.]?\s*',
            r'^Nah[,.]?\s*',
            r'^Jadi[,.]?\s*',
            r'^Saya\s+(akan\s+)?menulis[^.]*[.:]?\s*',
            r'^Artikel\s+ini[^.]*[.:]?\s*',
            r'^Teks\s+ini[^.]*[.:]?\s*',
        ]
        
        for pattern in patterns_to_remove:
            paraphrased_text = re.sub(pattern, '', paraphrased_text, flags=re.IGNORECASE | re.MULTILINE)
        
        paraphrased_text = re.sub(r'\n\n+', '\n\n', paraphrased_text)
        paraphrased_text = paraphrased_text.strip()
        
        if len(paraphrased_text) < 20:
            print("⚠️ Paraphrase too short, extracting from longer response")
            lines = [line.strip() for line in response.split('\n') if line.strip() and len(line.strip()) > 20]
            if lines:
                paraphrased_text = '\n\n'.join(lines[:5])
            else:
                paraphrased_text = simple_paraphrase(text)
        
        if len(paraphrased_text) < len(text) * 0.3:
            print("⚠️ Paraphrase too short compared to original, using fallback")
            paraphrased_text = simple_paraphrase(text)
        
        original_words = set(text.lower().split())
        paraphrased_words = set(paraphrased_text.lower().split())
        changes = len(original_words.symmetric_difference(paraphrased_words))
        
        print(f"✅ Paraphrase successful: {paraphrased_text[:150]}...")
        
        return ParaphraseResult(
            original=text,
            paraphrased=paraphrased_text,
            changes_made=max(changes, 5)
        )
    
    except Exception as e:
        print(f"⚠️ Paraphrase error: {e}")
        import traceback
        traceback.print_exc()
        paraphrased_text = simple_paraphrase(text)
        return ParaphraseResult(
            original=text,
            paraphrased=paraphrased_text,
            changes_made=8
        )

def simple_paraphrase(text: str) -> str:
    """Fallback paraphrase sederhana"""
    
    replacements = {
        r'\badalah\b': 'itu',
        r'\bsangat\b': 'banget',
        r'\bdengan\b': 'dengan',
        r'\buntuk\b': 'buat',
        r'\bdapat\b': 'bisa',
        r'\bmelakukan\b': 'lakukan',
        r'\bmemiliki\b': 'punya',
        r'\bkarena\b': 'karena',
        r'\btetapi\b': 'tapi',
        r'\bnamun\b': 'tapi',
        r'\bsehingga\b': 'jadi',
        r'\bapabila\b': 'kalau',
    }
    
    result = text
    
    for pattern, replacement in replacements.items():
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result.strip()

@app.get("/")
def read_root():
    return {
        "message": "AI Detector & Paraphraser API",
        "status": "running",
        "version": "2.3 - With Queue System",
        "model": MODEL_NAME,
        "queue_config": {
            "max_concurrent": MAX_CONCURRENT,
            "description": "Maksimal 2 request bersamaan, sisanya antri"
        },
        "endpoints": {
            "/process": "POST - Process text (mode: detect/paraphrase/both)",
            "/health": "GET - Check API and Ollama health",
            "/queue": "GET - Check queue status"
        }
    }

@app.get("/health")
def health_check():
    """Check if Ollama is running"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [m.get('name') for m in models]
            
            has_model = any(MODEL_NAME in name for name in model_names)
            
            return {
                "status": "healthy",
                "ollama": "connected",
                "models": model_names,
                "required_model": MODEL_NAME,
                "model_available": has_model,
                "cors_enabled": True,
                "queue_status": {
                    "active_requests": active_requests,
                    "max_concurrent": MAX_CONCURRENT
                },
                "message": "All systems operational" if has_model else f"Please install {MODEL_NAME}: ollama pull {MODEL_NAME}"
            }
        return {"status": "unhealthy", "ollama": "disconnected"}
    except Exception as e:
        return {
            "status": "unhealthy", 
            "ollama": "not running", 
            "error": str(e),
            "message": "Please start Ollama: ollama serve"
        }

@app.get("/queue")
async def queue_status():
    """Get current queue status"""
    return await get_queue_info()

@app.post("/process", response_model=ProcessResponse)
async def process_text(request: TextRequest):
    """Process text based on mode - WITH QUEUE SYSTEM"""
    global queue_position, active_requests, total_queued
    
    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Teks minimal 10 karakter")
    
    if request.mode not in ["detect", "paraphrase", "both"]:
        raise HTTPException(status_code=400, detail="Mode harus: detect, paraphrase, atau both")
    
    # Get queue position
    total_queued += 1
    my_position = total_queued
    
    print(f"\n{'='*50}")
    print(f"📝 New request received - Queue position: {my_position}")
    print(f"📊 Current active: {active_requests}/{MAX_CONCURRENT}")
    print(f"⏳ Waiting in queue: {total_queued - active_requests}")
    print(f"{'='*50}\n")
    
    # Acquire semaphore (wait in queue if needed)
    async with queue_semaphore:
        active_requests += 1
        
        print(f"🎯 Processing request #{my_position} (Active: {active_requests}/{MAX_CONCURRENT})")
        
        detection = None
        paraphrase = None
        
        try:
            print(f"📝 Processing mode: {request.mode}")
            print(f"📄 Text length: {len(request.text)} characters")
            print(f"📄 Text preview: {request.text[:100]}...")
            
            if request.mode in ["detect", "both"]:
                print("🔍 Starting AI detection...")
                detection = detect_ai_text(request.text)
                print(f"✅ Detection complete: AI={detection.is_ai_generated}, Confidence={detection.confidence}")
            
            if request.mode in ["paraphrase", "both"]:
                print("✍️ Starting paraphrase...")
                paraphrase = paraphrase_text(request.text)
                print(f"✅ Paraphrase complete: {paraphrase.changes_made} changes")
                print(f"📝 Result preview: {paraphrase.paraphrased[:200]}...")
            
            queue_info = await get_queue_info()
            
            print(f"✅ Request #{my_position} completed successfully\n")
            
            return ProcessResponse(
                success=True,
                detection=detection,
                paraphrase=paraphrase,
                queue_info=queue_info
            )
        
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Process error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        finally:
            active_requests -= 1
            print(f"✅ Request #{my_position} released (Active: {active_requests}/{MAX_CONCURRENT})")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Starting AI Detector & Paraphraser API")
    print("☁️  Production Ready with CORS!")
    print(f"📦 Using Ollama model: {MODEL_NAME}")
    print(f"⚙️  Queue System: Max {MAX_CONCURRENT} concurrent requests")
    print(f"🌐 Backend URL: http://0.0.0.0:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print("⚠️  Make sure Ollama is running: ollama serve")
    print(f"⚠️  Make sure model is installed: ollama pull {MODEL_NAME}")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)