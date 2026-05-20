"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  // --- 状態（State）の定義 ---
  const [roomId, setRoomId] = useState(""); // 既存：部屋に参加する際に使う想定
  const [roomName, setRoomName] = useState(""); // 追加：部屋を作成する時の名前
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // 修正：小文字のusernameに統一
  const [answers, setAnswers] = useState(""); // 追加：クイズの正解（カンマ区切り文字列）

  const router = useRouter();

  // --- 部屋に参加する処理 ---
  const joinRoom = async () => {
    try {
      const res = await fetch("/api/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // 追加：JSONを送る際のマナー
        body: JSON.stringify({
          roomId,
          password,
          username, // 修正：定義と一致させました
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "エラーが発生しました");
        return;
      }

      router.push(`/room/${roomId}?name=${username}`);
    } catch (error) {
      console.error(error);
      alert("通信に失敗しました");
    }
  };

  // --- 部屋を作成する処理 ---
  const createRoom = async () => {
    try {
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // 追加
        body: JSON.stringify({
          name: roomName,
          password: password,
          answers: answers.split(",").map((ans) => ans.trim()), // 改善：前後の余計な空白を削除
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "部屋の作成に失敗しました");
        return;
      }

      router.push(`/host/${data.roomId}`);
    } catch (error) {
      console.error(error);
      alert("通信に失敗しました");
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
      <h1>Room Create</h1>

      <input
        placeholder="部屋名"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />

       <input
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />


      <input
        placeholder="正解（カンマ区切り）"
        value={answers}
        onChange={(e) => setAnswers(e.target.value)}
      />

      <button onClick={createRoom}>部屋作成</button>


      {/* 
        補足：現在のHTMLには「部屋に参加する（joinRoom）」ためのUI（roomIdやusernameの入力欄）がありません。
        もし同じ画面に参加機能もつける場合は、以下のような入力欄とボタンが必要です。
      */}
      <hr />
      <h1>Room Join</h1>
      <input placeholder="ユーザー名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="ルームID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={joinRoom}>部屋に参加</button>

    </div>
  );
}