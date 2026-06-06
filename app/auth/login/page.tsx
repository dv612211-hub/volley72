"use client";

import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    import("@vkid/sdk").then((VKID) => {
      if (cancelled || !containerRef.current) return;

      VKID.Config.init({
        app: 54611008,
        redirectUrl: "https://volley72.ru/auth/callback",
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "",
      });

      const oneTap = new VKID.OneTap();

      oneTap
        .render({
          container: containerRef.current,
          showAlternativeLogin: true,
        })
        .on(VKID.WidgetEvents.ERROR, (e: any) => {
          console.error("VK ID error:", e);
          setError("Ошибка VK. Попробуйте ещё раз.");
        })
        .on(
          VKID.OneTapInternalEvents.LOGIN_SUCCESS,
          async (payload: any) => {
            try {
              const code = payload.code;
              const deviceId = payload.device_id;

              // Обмен кода на токены — на клиенте, SDK сам подставит code_verifier
              const tokens: any = await VKID.Auth.exchangeCode(code, deviceId);
              const accessToken = tokens.access_token;

              // Данные пользователя — тоже на клиенте
              const info: any = await VKID.Auth.userInfo(accessToken);
              const u = info.user || info;

              const res = await fetch("/api/auth/vk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vk_id: u.user_id || u.id,
                  first_name: u.first_name || "",
                  last_name: u.last_name || "",
                  photo_url: u.avatar || u.photo_200 || null,
                }),
              });
              const data = await res.json();
              if (data.success) {
                window.location.href = "/profile";
              } else {
                setError("Ошибка входа: " + (data.error || "неизвестная"));
              }
            } catch (err: any) {
              console.error("Auth flow error:", err);
              setError("Не удалось войти. Попробуйте ещё раз.");
            }
          }
        );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1535",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "sans-serif",
      }}
    >
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

      {error && (
        <p style={{ color: "#f87171", fontSize: 14, marginTop: 16, textAlign: "center", maxWidth: 320 }}>
          {error}
        </p>
      )}

      <a
        href="/"
        style={{ marginTop: 32, color: "#64748b", fontSize: 14, textDecoration: "none" }}
      >
        ← На главную
      </a>
    </div>
  );
}
