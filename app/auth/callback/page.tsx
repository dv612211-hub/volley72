"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CallbackInner() {
  const [status, setStatus] = useState("Завершаем вход...");
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get("code");
    const deviceId = searchParams.get("device_id");

    if (!code) {
      setStatus("Ошибка: код не получен");
      return;
    }

    let cancelled = false;

    import("@vkid/sdk").then(async (VKID) => {
      if (cancelled) return;
      try {
        // Заново инициализируем конфиг, чтобы SDK подхватил code_verifier из кук
        VKID.Config.init({
          app: 54611008,
          redirectUrl: "https://volley72.ru/auth/callback",
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "",
        });

        const tokens: any = await VKID.Auth.exchangeCode(code, deviceId || "");
        const accessToken = tokens.access_token;

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
          setStatus("Ошибка входа: " + (data.error || "неизвестная"));
        }
      } catch (err: any) {
        console.error("Callback error:", err);
        setStatus("Не удалось войти. Попробуйте ещё раз.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1535",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 18,
      padding: "0 16px",
      textAlign: "center",
    }}>
      {status}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "#0b1535",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 18,
      }}>
        Загрузка...
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
