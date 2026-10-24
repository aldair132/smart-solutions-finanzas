"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Icon, type IconName } from "./Icon";

type GuideStep = {
  icon: IconName;
  title: string;
  text: string;
  action: string;
  href: string;
};
const dismissedStorageKey = "smart-solutions-welcome-hidden";
const guideSteps: GuideStep[] = [
  {
    icon: "mic",
    title: "1. Habla",
    text: "«Vendí 3 menús a 12 y compré gas a 50». La IA separa cada venta y gasto.",
    action: "Probar con voz",
    href: "/espacios/comida?capturar=voz",
  },
  {
    icon: "camera",
    title: "2. Toma una foto",
    text: "Boleta, captura de Yape o la página del cuaderno. La IA lee los montos.",
    action: "Probar con foto",
    href: "/espacios/bodega?capturar=foto",
  },
  {
    icon: "chart",
    title: "3. Tu perfil para crédito",
    text: "90 días de registros se vuelven un puntaje explicable y un reporte PDF.",
    action: "Ver perfil",
    href: "/espacios/bodega/credito",
  },
];

function readIsHidden() {
  try {
    return window.localStorage.getItem(dismissedStorageKey) === "yes";
  } catch {
    return false;
  }
}

export function WelcomeGuide() {
  const [isHidden, setIsHidden] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  useEffect(() => {
    const hidden = readIsHidden();
    queueMicrotask(() => setIsHidden(hidden));
  }, []);
  function updateHidden(hidden: boolean) {
    setIsHidden(hidden);
    try {
      window.localStorage.setItem(dismissedStorageKey, hidden ? "yes" : "no");
    } catch {
      // Sin almacenamiento la guía vuelve a mostrarse al recargar.
    }
  }
  if (isHidden)
    return (
      <button
        className="text-button guide-reopen"
        onClick={() => updateHidden(false)}
      >
        <Icon name="help" />
        Ver la guía de 2 minutos
      </button>
    );
  return (
    <section className="welcome-guide" aria-labelledby="welcome-guide-title">
      <div className="welcome-guide-top">
        <div className="welcome-guide-heading">
          <p className="eyebrow">PRUÉBALO EN 2 MINUTOS · DATOS DE EJEMPLO</p>
          <h2 id="welcome-guide-title">
            Habla o toma una foto: la IA ordena tu negocio y arma tu historial
            para pedir un crédito.
          </h2>
          <p className="muted">
            Para bodegas, puestos de comida y negocios que hoy anotan en un
            cuaderno o de memoria. Sin instalar nada y sin saber de
            contabilidad.
          </p>
        </div>
        <button
          type="button"
          className="video-thumb"
          onClick={() => setIsVideoOpen(true)}
          aria-label="Ver el video de cómo usar la app (1 minuto)"
        >
          <Image
            src="/video/guia-smart-solutions-poster.jpg"
            alt=""
            width={320}
            height={180}
          />
          <span className="video-play" aria-hidden="true">
            ▶
          </span>
          <span className="video-caption">Ver cómo funciona · 1 min</span>
        </button>
      </div>
      <div className="guide-steps">
        {guideSteps.map((step) => (
          <Link className="guide-step" href={step.href} key={step.title}>
            <span className="guide-icon">
              <Icon name={step.icon} />
            </span>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
            <span className="guide-action">
              {step.action}
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
      </div>
      <div className="welcome-guide-foot">
        <p className="muted small">
          ¿Dudas? Toca «Pregúntale a Smart» dentro de cualquier negocio: te
          responde con tus números, también en voz alta.
        </p>
        <button className="text-button" onClick={() => updateHidden(true)}>
          Ocultar guía
        </button>
      </div>
      {isVideoOpen && (
        <Dialog
          size="large"
          title="Cómo usar Smart Solutions"
          onClose={() => setIsVideoOpen(false)}
        >
          <video
            className="guide-video"
            src="/video/guia-smart-solutions.mp4"
            poster="/video/guia-smart-solutions-poster.jpg"
            controls
            autoPlay
            playsInline
          >
            Tu navegador no puede reproducir el video.
          </video>
          <p className="muted small">
            Video de 1 minuto con narración y capturas reales de la app. Sube el volumen para escuchar a Smart.
          </p>
        </Dialog>
      )}
    </section>
  );
}
