// ここが部屋のコード.

"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RoomPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();

  const username = searchParams.get("name") || "anonymous";

  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");

  const send = async () => {
    // 仮の正解ロジック（後でDB化）
    const isCorrect = text === "apple";

    await supabase.from("messages").insert({
      room_id: id,
      username,
      text,
      is_correct: isCorrect,
    });

    setResult(isCorrect ? "正解" : "不正解");
    setText("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Room: {id}</h2>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="入力"
      />

      <button onClick={send}>送信</button>

      <p>{result}</p>
    </div>
  );
}