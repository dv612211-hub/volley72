"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl("https://id.vk.com/oauth2/authorize?client_id=54611008&redirect_uri=https%3A%2F%2Fvolley72.ru%2Fauth%2Fcallback&response_type=code&scope=vkid.personal_info");
  }, []);
  return (
    <div style={{minHeight:"100vh",background:"#0b1535",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",fontFamily:"sans-serif"}}>
      <div style={{marginBottom:40,textAlign:"center"}}>
        <h1 style={{fontSize:28,fontWeight:700,color:"#fff",marginBottom:8}}>Volley<span style={{color:"#f97316"}}>72</span></h1>
        <p style={{color:"#94a3b8",fontSize:16}}>Войдите чтобы продолжить</p>
      </div>
      <a href={url || "#"} style={{display:"block",width:"100%",maxWidth:360,padding:"14px 24px",background:"#0077FF",color:"#fff",borderRadius:12,fontWeight:700,fontSize:16,textDecoration:"none",textAlign:"center"}}>Войти через VK</a>
      <a href="/" style={{marginTop:24,color:"#64748b",fontSize:14,textDecoration:"none"}}>На главную</a>
    </div>
  );
}
