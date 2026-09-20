import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../lib/api";
import {
  LoaderCircle,
  Mic,
  Square,
} from "lucide-react";

export type VoiceReportResult = {
  original_text: string;

  extraction: {
    summary: string;

    asset_id:
      | "substation-n4"
      | "hospital-north"
      | "tower-c7"
      | "pump-w2"
      | "traffic-t4"
      | "fire-f2"
      | "unknown";

    incident_type:
      | "power_failure"
      | "communications_failure"
      | "flooding"
      | "road_blockage"
      | "water_disruption"
      | "medical_disruption"
      | "other";

    evidence_description: string;
    uncertainty: string;

    simulation_eligibility:
      | "confirmed_failure"
      | "evidence_only";

    simulation_reason: string;
  };

  verification_status: "unverified";
  applied_to_simulation: false;
  note: string;
};

type Props = {
  onResult: (result: VoiceReportResult) => void;
};

type RecordingStatus =
  | "idle"
  | "recording"
  | "processing";

const MAX_SECONDS = 45;
const MAX_BYTES = 5 * 1024 * 1024;

export default function VoiceRecorder({
  onResult,
}: Props) {
  const [status, setStatus] =
    useState<RecordingStatus>("idle");

  const [seconds, setSeconds] =
    useState(0);

  const [error, setError] =
    useState<string | null>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const requestRef =
    useRef<AbortController | null>(null);

  const cancelledRef = useRef(false);

  function stopTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function releaseMicrophone() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
  }

  useEffect(() => {
    cancelledRef.current = false;

    return () => {
      cancelledRef.current = true;

      stopTimer();

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }

      releaseMicrophone();
      requestRef.current?.abort();
    };
  }, []);

  async function startRecording() {
    setError(null);

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Microphone recording is not supported here. Use Chrome or Edge on localhost or HTTPS."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      if (cancelledRef.current) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const selectedType = supportedTypes.find(
        (type) => MediaRecorder.isTypeSupported(type)
      );

      if (!selectedType) {
        releaseMicrophone();

        setError(
          "This browser does not provide a supported recording format. Try Chrome or Edge."
        );

        return;
      }

      const recorder = new MediaRecorder(
        stream,
        { mimeType: selectedType }
      );

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopTimer();
        releaseMicrophone();

        if (!cancelledRef.current) {
          setStatus("idle");

          setError(
            "The recording was interrupted. Please try again."
          );
        }
      };

      recorder.onstop = async () => {
        stopTimer();
        releaseMicrophone();

        if (cancelledRef.current) {
          return;
        }

        setStatus("processing");

        const mimeType = recorder.mimeType.split(";")[0];

        const audioBlob = new Blob(
          chunksRef.current,
          { type: mimeType }
        );

        if (audioBlob.size === 0) {
          setError("The recording is empty. Please try again.");
          setStatus("idle");
          return;
        }

        if (audioBlob.size > MAX_BYTES) {
          setError(
            "The recording is too large. Please record a shorter report."
          );
          setStatus("idle");
          return;
        }

        const extension =
          mimeType === "audio/mp4" ? "m4a" : "webm";

        const formData = new FormData();

        formData.append(
          "audio",
          audioBlob,
          `field-report.${extension}`
        );

        const controller = new AbortController();
        requestRef.current = controller;

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/reports/interpret-voice`,
            {
              method: "POST",
              body: formData,
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            const payload = await response
              .json()
              .catch(() => null);

            throw new Error(
              payload?.detail ??
                `Voice analysis failed: ${response.status}`
            );
          }

          const result =
            (await response.json()) as VoiceReportResult;

          if (!cancelledRef.current) {
            onResult(result);
          }
        } catch (requestError) {
          if (
            !cancelledRef.current &&
            !controller.signal.aborted
          ) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "The voice report could not be analyzed."
            );
          }
        } finally {
          if (!cancelledRef.current) {
            setStatus("idle");
          }

          requestRef.current = null;
        }
      };

      recorder.start();

      setSeconds(0);
      setStatus("recording");

      const startedAt = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startedAt) / 1000
        );

        setSeconds(elapsed);

        if (elapsed >= MAX_SECONDS) {
          stopTimer();

          if (recorder.state === "recording") {
            recorder.stop();
          }
        }
      }, 250);
    } catch (recordingError) {
      releaseMicrophone();
      setStatus("idle");

      setError(
        recordingError instanceof Error &&
          recordingError.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser and try again."
          : "Could not start the microphone. Check that it is connected and try again."
      );
    }
  }

  function stopRecording() {
    stopTimer();

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  return (
    <div
      style={{
        marginBottom: 20,
        padding: 14,
        border: "1px solid rgba(129,190,174,0.28)",
        background: "rgba(83,143,127,0.09)",
        color: "#dcece8",
      }}
    >
      <div
        style={{
          marginBottom: 10,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "#9bbdb4",
        }}
      >
        VOICE FIELD REPORT
      </div>

      {status === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            width: "100%",
            minHeight: 42,
            border: "1px solid rgba(132,196,178,0.5)",
            background: "rgba(88,155,135,0.18)",
            color: "#e3f3ee",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Mic size={16} />
          RECORD VOICE REPORT
        </button>
      )}

      {status === "recording" && (
        <button
          type="button"
          onClick={stopRecording}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            width: "100%",
            minHeight: 42,
            border: "1px solid rgba(235,124,113,0.55)",
            background: "rgba(165,67,61,0.22)",
            color: "#ffdcd7",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Square size={14} />
          STOP &amp; ANALYZE · {seconds}s
        </button>
      )}

      {status === "processing" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 11,
            color: "#b8d5cc",
          }}
        >
          <LoaderCircle
            size={16}
            style={{ animation: "livetruth-spin 0.8s linear infinite" }}
          />
          Gemini is analyzing your recording...
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{
            margin: "12px 0 0",
            fontSize: 11,
            lineHeight: 1.5,
            color: "#f0a49b",
          }}
        >
          {error}
        </p>
      )}

      <p
        style={{
          margin: "10px 0 0",
          fontSize: 10,
          lineHeight: 1.5,
          color: "#92a9a2",
        }}
      >
        Maximum 45 seconds. The recording is analyzed,
        not automatically approved.
      </p>
    </div>
  );
}