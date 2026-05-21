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
      if (!text.trim()) return;

      try {
        // Supabaseから正解リストを取得.
        const { data: correctAnswers, error: fetchError } = await supabase
          .from("correct_answers")
          .select("answer")
          .eq("room_id", id); // 今の部屋IDでしっかり絞り込む.

        if (fetchError) {
          console.error(fetchError);
          alert("正解データの取得に失敗しました");
          return;
        }

        // 取得した正解の配列の中に、入力した文字（text）が含まれているかチェック.
        // correctAnswers は [{answer: "りんご"}, {answer: "ごりら"}] のような形なので、mapで文字の配列にする.
        const answerList = correctAnswers?.map((item) => item.answer) || [];
        const isCorrect = answerList.includes(text.trim());

        // 判定結果（isCorrect）を含めてメッセージを保存.
        await supabase.from("messages").insert({
          room_id: id,
          username,
          text: text.trim(),
          is_correct: isCorrect,
        });

        // 画面に結果を表示
        setResult(isCorrect ? "正解！" : "不正解...");
        setText("");
      } catch (err) {
        console.error(err);
        alert("送信中にエラーが発生しました");
      }
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

      <p style={{ fontWeight: "bold", fontSize: "1.2rem", color: result === "正解！" ? "green" : "red" }}>
        {result}
      </p>
    </div>
  );
}