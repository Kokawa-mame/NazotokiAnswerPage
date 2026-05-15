// ここがホストのコード.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HostPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id);

      setMessages(data || []);
    };

    fetchData();

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Host View - Room {id}</h2>

      <table border={1}>
        <thead>
          <tr>
            <th>User</th>
            <th>Text</th>
            <th>Result</th>
          </tr>
        </thead>

        <tbody>
          {messages.map((m, i) => (
            <tr key={i}>
              <td>{m.username}</td>
              <td>{m.text}</td>
              <td>{m.is_correct ? "正解" : "不正解"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}