"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HostPage() {
  const { id } = useParams(); // id = ルームID
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    // 最初にすでに保存されている過去のメッセージを読み込む
    const fetchData = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id);

      setMessages(data || []);
    };

    fetchData();

    // 💡 リアルタイムの接続設定を修正
    const channel = supabase
      .channel(`realtime-messages-${id}`) // 部屋ごとにチャンネル名をユニーク（一意）にします
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages",
          filter: `room_id=eq.${id}` // ⭐超重要！この部屋のメッセージだけをリアルタイム受信するフィルターです
        },
        (payload) => {
          // 新しいメッセージが届いたらリストの末尾に追加する
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // 画面を閉じたり移動したときに接続を切断する
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Host View - Room {id}</h2>

      <table border={1} style={{ borderCollapse: "collapse", width: "100%", maxWidth: "500px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th style={{ padding: "8px" }}>User</th>
            <th style={{ padding: "8px" }}>Text</th>
            <th style={{ padding: "8px" }}>Result</th>
          </tr>
        </thead>

        <tbody>
          {messages.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: "10px", color: "#9ca3af" }}>
                まだ回答がありません
              </td>
            </tr>
          ) : (
            messages.map((m, i) => (
              <tr key={i} style={{ textAlign: "center" }}>
                <td style={{ padding: "8px" }}>{m.username}</td>
                <td style={{ padding: "8px" }}>{m.text}</td>
                <td style={{ 
                  padding: "8px", 
                  fontWeight: "bold", 
                  color: m.is_correct ? "green" : "red" 
                }}>
                  {m.is_correct ? "正解" : "不正解"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}