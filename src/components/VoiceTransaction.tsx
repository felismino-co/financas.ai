import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseAudioTransaction } from '@/lib/gemini';
import type { ParsedTransaction } from '@/lib/gemini';

interface VoiceTransactionProps {
  onParsed: (data: ParsedTransaction) => void;
  disabled?: boolean;
}

export function VoiceTransaction({ onParsed, disabled }: VoiceTransactionProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stopRecording = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript?.trim()) return;
      setProcessing(true);
      try {
        const parsed = await parseAudioTransaction(transcript);
        onParsed(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao processar áudio.');
      } finally {
        setProcessing(false);
        stopRecording();
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microfone negado. Permita o acesso nas configurações do navegador.');
      } else {
        setError('Erro no reconhecimento de voz. Tente novamente.');
      }
      setRecording(false);
      setProcessing(false);
    };
    recognition.onend = () => {
      if (!processing) setRecording(false);
    };
    try {
      recognition.start();
      setRecording(true);
    } catch {
      setError('Não foi possível iniciar o microfone.');
    }
  }, [onParsed, processing, stopRecording]);

  const handleClick = () => {
    if (disabled || processing) return;
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <>
      <Button
        data-tour="voice-button"
        size="icon"
        onClick={handleClick}
        disabled={disabled || processing}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-20 w-14 h-14 rounded-full shadow-lg z-50 transition-all ${
          recording ? 'animate-pulse bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
        }`}
        title={recording ? 'Parar gravação' : 'Nova transação por voz'}
      >
        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : recording ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
      {error && (
        <div className="fixed bottom-24 right-4 md:bottom-14 md:right-20 max-w-xs px-3 py-2 bg-destructive/90 text-destructive-foreground text-xs rounded-lg shadow z-50">
          {error}
        </div>
      )}
    </>
  );
}
