// ここがホストのページのコード.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HostPage() {
  const { id } = useParams(); // id = ルームID
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    // 1. 画面を開いた瞬間に、すでに存在するデータを一度だけ取得する
    const fetchInitialData = async () => {
      // 既存のメッセージ（回答）を取得
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id);
      setMessages(msgData || []);

      // 既存の参加者（メンバー）を取得
      const { data: memberData } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", id);
      setMembers(memberData || []);
    };

    fetchInitialData();

    // 2. 💡 メッセージ（回答）のリアルタイム監視設定
    const messageChannel = supabase
      .channel(`room-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${id}`, // この部屋のメッセージだけを狙い撃ち
        },
        (payload) => {
          // 新しい回答が来たら、自動でリストの末尾に追加
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // 3. 💡 参加者ユーザー（メンバー）のリアルタイム監視設定
    const memberChannel = supabase
      .channel(`room-members-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${id}`, // この部屋に入室した人だけを狙い撃ち
        },
        (payload) => {
          // 新しいプレイヤーが入室したら、自動でリストに追加
          setMembers((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // 4. 画面を閉じたら、すべてのリアルタイム接続をキレイに切断する
    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [id]);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Host View - Room {id}</h2>

      {/* 🟢 セクション1: 参加者ユーザー一覧 */}
      <div style={{ marginBottom: 30 }}>
        <h3>👥 参加中のユーザー一覧 ({members.length}人)</h3>
        <table border={1} style={{ borderCollapse: "collapse", width: "100%", maxWidth: "300px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>ユーザー名</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td style={{ padding: "10px", color: "#9ca3af", textAlign: "center" }}>
                  まだ誰も入室していません
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px" }}>{m.username}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <hr />

      {/* 🔵 セクション2: 回答メッセージ一覧 */}
      <div style={{ marginTop: 20 }}>
        <h3>📝 届いた回答一覧</h3>
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
    </div>
  );
}