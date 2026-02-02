import * as React from "react";

/**
 * Custom hook for browser-based speech-to-text using the Web Speech API.
 * 
 * @returns {Object} { isListening, transcript, start, stop, error }
 */
export default function useSpeechToText() {
    const [isListening, setIsListening] = React.useState(false);
    const [transcript, setTranscript] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const recognitionRef = React.useRef<any>(null);

    React.useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US"; // Default, could be made configurable

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    setTranscript((prev) => prev + event.results[i][0].transcript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
        };

        recognition.onerror = (event: any) => {
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const start = React.useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript("");
            recognitionRef.current.start();
        }
    }, [isListening]);

    const stop = React.useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    return { isListening, transcript, start, stop, error };
}
