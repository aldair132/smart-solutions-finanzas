"use client";
import { MessageDialog } from "./MessageDialog";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import styles from "./CameraCapture.module.css";

export function CameraCapture({ onClose, onUsePhoto }: {
  onClose: () => void;
  onUsePhoto: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const activeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    activeRef.current = true;

    async function openCamera() {
      try {
        if (!window.isSecureContext) {
          throw new Error("Abre la aplicación con HTTPS para usar la cámara. En Windows también funciona con localhost.");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no permite abrir la cámara. Puedes subir una imagen desde tus archivos.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (failure) {
        if (cancelled) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (failure instanceof DOMException) {
          const messages: Record<string, string> = {
            NotAllowedError: "No se permitió el acceso a la cámara. Puedes habilitarlo en los permisos del navegador o subir una imagen.",
            NotFoundError: "No encontramos una cámara conectada. Puedes subir una imagen.",
            NotReadableError: "La cámara está ocupada o no se puede abrir. Cierra otras aplicaciones que la estén usando.",
          };
          setError(messages[failure.name] ?? "No pudimos iniciar la cámara. Puedes subir una imagen.");
        } else {
          setError(failure instanceof Error ? failure.message : "No pudimos iniciar la cámara.");
        }
      }
    }

    void openCamera();
    return () => {
      cancelled = true;
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!video || !context || !video.videoWidth || capturing) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    setCapturing(true);
    canvas.toBlob((blob) => {
      if (!activeRef.current) return;
      setCapturing(false);
      if (!blob) { setError("No pudimos capturar la foto. Intenta otra vez."); return; }
      setPhoto({
        file: new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }),
        preview: canvas.toDataURL("image/jpeg", 0.9),
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setReady(false);
    }, "image/jpeg", 0.9);
  }

  function retryCamera() {
    setPhoto(null);
    setError("");
    setReady(false);
    setAttempt((current) => current + 1);
  }

  return (
    <Dialog title="Tomar foto" className={styles.modal} onClose={onClose}>
      <p className="muted">{photo ? "Revisa que el texto se lea bien." : "Encuadra el comprobante con buena luz."}</p>
      <div className={styles.preview}>
        {photo ? (
          <Image src={photo.preview} alt="Foto capturada para revisar" width={640} height={480} unoptimized />
        ) : (
          <video ref={videoRef} autoPlay muted playsInline aria-label="Vista previa de la cámara" onCanPlay={() => setReady(true)} />
        )}
      </div>
      {!ready && !photo && !error && <p role="status" className="muted">Esperando acceso a la cámara…</p>}
      {error && <MessageDialog tone="error" message={error} />}
      <div className={styles.actions}>
        {photo ? <>
          <button type="button" className="button outline" onClick={retryCamera}>Repetir</button>
          <button type="button" className="button primary" onClick={() => onUsePhoto(photo.file)}>Usar foto</button>
        </> : <>
          {error ? <button type="button" className="button outline" onClick={retryCamera}>Reintentar</button> : null}
          <button type="button" className="button primary" disabled={!ready || capturing || Boolean(error)} onClick={capturePhoto}><Icon name="camera" />{capturing ? "Capturando…" : "Capturar"}</button>
        </>}
      </div>
      <button type="button" className={`button outline ${styles.fallback}`} onClick={onClose}>Volver a subir imágenes</button>
    </Dialog>
  );
}
