"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type UIState =
  | "hidden"      // already installed or not installable
  | "installable" // Chrome/Edge: beforeinstallprompt fired
  | "ios"         // Safari on iOS: manual instruction
  | "installing"  // waiting for userChoice
  | "installed";  // accepted

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallPWAButton() {
  const [uiState, setUiState] = useState<UIState>("hidden");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSToast, setShowIOSToast] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Mencegah Hydration Mismatch Error

    // Already installed → never show
    if (isInStandaloneMode()) return;

    if (isIOS()) {
      setUiState("ios");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setUiState("installable");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install (hides button)
    const onAppInstalled = () => setUiState("installed");
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (uiState === "ios") {
      setShowIOSToast(true);
      setTimeout(() => setShowIOSToast(false), 5000);
      return;
    }

    if (!deferredPrompt) return;

    setUiState("installing");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setUiState("installed");
    } else {
      setUiState("installable"); // dismissed → allow retry
    }
    setDeferredPrompt(null);
  };

  // Jangan render di server atau jika state disembunyikan
  if (!isMounted || uiState === "hidden" || uiState === "installed") return null;

  const isIOSDevice = uiState === "ios";

  return (
    <>
      {/* ── MAIN BUTTON (Sudah disesuaikan warnanya) ── */}
      <button
        onClick={handleInstallClick}
        disabled={uiState === "installing"}
        aria-label="Install Chōgō Coffee App"
        className="
          group relative inline-flex items-center gap-2.5
          bg-transparent 
          border-2 border-[#3A2A1A]
          text-[#3A2A1A]
          px-5 py-2 py-2.5
          rounded-full
          text-[10px] font-black uppercase tracking-widest
          hover:bg-[#3A2A1A] hover:text-white
          active:scale-95
          transition-all duration-300
          disabled:opacity-60 disabled:cursor-wait
        "
      >
        {/* Icon */}
        <span className="relative flex h-4 w-4 shrink-0">
          {uiState === "installing" ? (
            <span className="animate-spin border-2 border-current border-t-transparent rounded-full w-4 h-4 inline-block" />
          ) : (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              {isIOSDevice ? (
                /* Share icon for iOS */
                <path
                  d="M10 2v10M6 6l4-4 4 4M4 14v2a2 2 0 002 2h8a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                /* Download icon for standard */
                <>
                  <path
                    d="M10 2v9M6 7l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          )}
        </span>

        <span>
          {uiState === "installing"
            ? "Installing..."
            : isIOSDevice
            ? "Add to Home"
            : "Install App"}
        </span>
      </button>

      {/* ── iOS TOAST ── */}
      {showIOSToast && (
        <div className="fixed bottom-6 left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none">
          <div
            role="status"
            aria-live="polite"
            className="
              pointer-events-auto
              bg-[#3A2A1A] text-white
              px-6 py-4
              rounded-2xl shadow-2xl
              flex items-start gap-3
              w-full max-w-[320px]
              animate-fade-in-up
            "
          >
            {/* Share icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 shrink-0 mt-0.5 text-[#C69C6D]"
            >
              <path
                d="M12 2v12M8 6l4-4 4 4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="font-black text-xs uppercase tracking-widest mb-1 text-[#C69C6D]">
                Install on iPhone
              </p>
              <p className="text-xs text-white/80 leading-relaxed">
                Tap the <span className="font-bold text-white">Share</span>{" "}
                button in Safari, then select{" "}
                <span className="font-bold text-white">
                  &quot;Add to Home Screen&quot;
                </span>
                .
              </p>
            </div>
            <button
              onClick={() => setShowIOSToast(false)}
              aria-label="Close"
              className="ml-auto shrink-0 text-white/50 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* inline keyframe for toast (Animasi diperbarui agar tidak geser ke kiri) */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out both; }
      `}</style>
    </>
  );
}