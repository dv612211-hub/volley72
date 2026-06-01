"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CallbackInner() {
  const [status, setStatus] = useState("Авторизация...");
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const deviceId = searchParams.get("device_id");

    if (!code) {
      setStatus("Ошибка: код авторизации не получен");
      return;
    }

    fetch("/api/auth/vk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, device_id: deviceId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "/profile";
        } else {
          setStatus("Ошибка: " + (data.error || "Не удалось войти"));
        }
      })
      .catch(() => {
        setStatus("Ошибка соединения");
      });
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
