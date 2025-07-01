import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

export interface SpeechToTextOptions {
  language: string;
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

class SpeechToTextService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async startListening(options: SpeechToTextOptions) {
    try {
      // Mikrofon izni kontrolü
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        options.onError('Mikrofon izni reddedildi');
        return;
      }

      if (this.isRecording) {
        await this.stopListening();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Basit recording - minimum config
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      
      if (options.onStart) options.onStart();

      // 3 saniye sonra otomatik durdur ve sonuç döndür
      setTimeout(async () => {
        if (this.isRecording) {
          await this.stopListening();
          this.mockSpeechResult(options);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Speech recording error:', error);
      options.onError('Ses kaydı başlatılamadı');
    }
  }

  async stopListening() {
    if (this.recording && this.isRecording) {
      try {
        await this.recording.stopAndUnloadAsync();
        this.isRecording = false;
        this.recording = null;
      } catch (error) {
        console.error('Ses kaydı durdurulurken hata:', error);
      }
    }
  }

  // Web'deki gibi basit mock - gerçek hayatta ses tanıma yapmış gibi
  private mockSpeechResult(options: SpeechToTextOptions) {
    const mockResults = {
      tr: [
        "Son 3 aydaki satış raporu",
        "Müşteri memnuniyet oranları", 
        "Bu yılki toplam gelir",
        "En çok satan ürünler",
        "Departman performans analizi",
        "Aylık prim üretimi",
        "Acente başarı sıralaması",
        "Hasar oranları analizi"
      ],
      en: [
        "Sales report for last 3 months",
        "Customer satisfaction rates",
        "Total revenue this year", 
        "Best selling products",
        "Department performance analysis",
        "Monthly premium production",
        "Agent success ranking",
        "Loss ratio analysis"
      ],
      de: [
        "Verkaufsbericht der letzten 3 Monate",
        "Kundenzufriedenheitsraten",
        "Gesamtumsatz dieses Jahr",
        "Meistverkaufte Produkte", 
        "Abteilungsleistungsanalyse",
        "Monatliche Prämienproduktion",
        "Agenten-Erfolgsranking",
        "Schadenquoten-Analyse"
      ],
      es: [
        "Informe de ventas de los últimos 3 meses",
        "Tasas de satisfacción del cliente",
        "Ingresos totales este año",
        "Productos más vendidos",
        "Análisis de rendimiento del departamento", 
        "Producción mensual de primas",
        "Clasificación de éxito de agentes",
        "Análisis de índice de siniestralidad"
      ]
    };

    const currentLang = options.language as keyof typeof mockResults;
    const results = mockResults[currentLang] || mockResults.tr;
    const randomResult = results[Math.floor(Math.random() * results.length)];
    
    if (options.onEnd) options.onEnd();
    options.onResult(randomResult);
  }

  isListening() {
    return this.isRecording;
  }
}

export const speechToTextService = new SpeechToTextService();