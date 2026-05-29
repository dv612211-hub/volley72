"use client";

import { useEffect, useRef } from "react";

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@vkid/sdk@3.0.0/dist-sdk/umd/index.js";
    script.onload = () => {
      const VKID = (window as any).VKIDSDK;
      if (!VKID) return;

      VKID.Config.init({
        app: 54611008,
        redirectUrl: "https://volley72.ru/auth/callback",
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "",
      });

      const oneTap = new VKID.OneTap();
      if (containerRef.current) {
        oneTap.render({
          container: containerRef.current,
          showAlternativeLogin: true,
        })
        .on(VKID.WidgetEvents.ERROR, (error: any) => {
          console.error("VK ID error:", error);
        })
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload: any) => {
          const code = payload.code;
          const deviceId = payload.device_id;
          try {
            const res = await fetch("/api/auth/vk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, device_id: deviceId }),
            });
            const data = await res.json();
            if (data.success) {
              window.location.href = "/profile";
            } else {
              alert("Ошибка входа: " + (data.error || "Неизвестная ошибка"));
            }
          } catch (e) {
            console.error("Auth error:", e);
            alert("Ошибка соединения");
          }
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1535",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          Volley<span style={{ color: "#f97316" }}>72</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16 }}>Войдите чтобы продолжить</p>
      </div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: 360,
          minHeight: 44,
          display: "flex",
          justifyContent: "center",
        }}
      />
      <a
        href="/"
        style={{
          marginTop: 32,
          color: "#64748b",
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        ← На главную
      </a>
    </div>
  );
}
