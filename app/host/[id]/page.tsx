"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 💡 プレイヤー別正解進捗ボードの比較用：表記揺れを完全に破壊する強力な正規化関数
function normalizeText(str: string): string {
  if (!str) return "";

  // 1. 全角英数字を半角に変換 + 大文字を小文字に統一
  let text = str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();

  // 2. カタカナをひらがなに変換
  text = text.replace(/[\u30a1-\u30f6]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));

  // 3. ひらがなをローマ字に一括変換するための辞書マップ
  const kanaToRomanMap: { [key: string]: string } = {
    あ: "a", い: "i", う: "u", え: "e", お: "o",
    か: "ka",き: "ki", く: "ku", け: "ke", こ: "ko",
    さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
    た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
    な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
    は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "mo",
    ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
    や: "ya", ゆ: "yu", よ: "yo",
    ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
    わ: "wa", を: "wo", ん: "n",
    gが: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
    ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
    だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
    ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
    ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
    きゃ: "kya", きゅ: "kyu", きょ: "kyo",
    しゃ: "sha", しゅ: "shu", しょ: "sho",
    ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
    にゃ: "nya", にゅ: "nyu", にょ: "nyo",
    ひゃ: "hya", ひゅ: "hyu", hょ: "hyo",
    みゃ: "mya", みゅ: "myu", みょ: "myo",
    りゃ: "rya", りゅ: "ryu", りょ: "ryo",
    ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
    じゃ: "ja", じゅ: "ju", じょ: "jo",
    びゃ: "bya", びゅ: "byu", びょ: "byo",
    ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "po",
    ー: "", っ: "tsu", ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o"
  };

  const doubleKeys = Object.keys(kanaToRomanMap).filter(k => k.length === 2);
  for (const key of doubleKeys) {
    text = text.replaceAll(key, kanaToRomanMap[key]);
  }

  const singleKeys = Object.keys(kanaToRomanMap).filter(k => k.length === 1);
  for (const key of singleKeys) {
    text = text.replaceAll(key, kanaToRomanMap[key]);
  }

  return text;
}

export default function HostPage() {
  const { id } = useParams(); // id = 裏側の長〜いUUID
  const router = useRouter();
  
  const [roomName, setRoomName] = useState<string>("読み込み中...");
  const [displayRoomId, setDisplayRoomId] = useState<string>("------");
  const [roomPassword, setRoomPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);

  // 新しく追加したい正解単語を保存する状態
  const [newAnswer, setNewAnswer] = useState<string>("");
  const [isAddingAnswer, setIsAddingAnswer] = useState<boolean>(false);

  // ルームID（6桁）をクリップボードにコピーする関数
  const handleCopyId = async () => {
    if (!displayRoomId || displayRoomId === "------") return;
    try {
      await navigator.clipboard.writeText(displayRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピーに失敗しました", err);
    }
  };

  // 部屋を完全に解散（データ削除）する関数
  const handleDestroyRoom = async () => {
    const confirmDestroy = confirm("⚠️ 本当にこの部屋を解散しますか？\n参加中のプレイヤーは全員強制退室となり、ログは全て削除されます。");
    if (!confirmDestroy || isDestroying) return;

    try {
      setIsDestroying(true);
      await supabase.from("room_members").delete().eq("room_id", id);
      const { error } = await supabase.from("rooms").delete().eq("id", id);

      if (error) {
        console.error("解散エラー:", error);
        alert(`部屋の解散に失敗しました: ${error.message}`);
        return;
      }

      alert("部屋を解散しました。");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("予期せぬエラーが発生しました");
    } finally {
      setIsDestroying(false);
    }
  };

  // 正解単語を後から追加して保存する関数
  const handleAddAnswer = async () => {
    const targetAnswer = newAnswer.trim();
    if (!targetAnswer || isAddingAnswer) return;

    if (correctAnswers.includes(targetAnswer)) {
      alert("その単語はすでに登録されています！");
      return;
    }

    try {
      setIsAddingAnswer(true);

      const { error } = await supabase
        .from("correct_answers")
        .insert({
          room_id: id,
          answer: targetAnswer,
        });

      if (error) {
        console.error("正解単語の追加失敗:", error);
        alert(`単語の追加に失敗しました: ${error.message}`);
        return;
      }

      setCorrectAnswers((prev) => [...prev, targetAnswer]);
      setNewAnswer(""); 
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingAnswer(false);
    }
  };

  // 単語バッジをクリックしたときに削除する関数
  const handleRemoveAnswer = async (answerToRemove: string) => {
    const confirmDelete = confirm(`正解単語「${answerToRemove}」を削除しますか？`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("correct_answers")
        .delete()
        .eq("room_id", id)
        .eq("answer", answerToRemove);

      if (error) {
        console.error("正解単語の削除失敗:", error);
        alert(`単語の削除に失敗しました: ${error.message}`);
        return;
      }

      setCorrectAnswers((prev) => prev.filter((ans) => ans !== answerToRemove));
    } catch (err) {
      console.error(err);
      alert("削除中に予期せぬエラーが発生しました");
    }
  };

  // エンターキーでも単語を追加できるようにする
  const handleAnswerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddAnswer();
    }
  };

  // 💡 修正：表記揺れ対応の判定ヘルパー関数
  // ユーザーの回答ログ(m.text)と、進捗表のヘッダーにある登録単語(answerWord)を、両方正規化して比較する
  const checkUserAnswerStatus = (username: string, answerWord: string) => {
    const normalizedTarget = normalizeText(answerWord);
    return messages.some(
      (m) => m.username === username && normalizeText(m.text) === normalizedTarget && m.is_correct === true
    );
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    if (!id) return;

    const fetchCurrentMembers = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("*")
        .eq("room_id", id);
      setMembers(data || []);
    };

    const fetchInitialData = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("name, password, room_id")
        .eq("id", id)
        .single();
      
      if (roomData) {
        setRoomName(roomData.name);
        setRoomPassword(roomData.password || "なし");
        setDisplayRoomId(roomData.room_id || "未設定");
      }

      const { data: answersData } = await supabase
        .from("correct_answers")
        .select("answer")
        .eq("room_id", id);
      if (answersData) {
        setCorrectAnswers(answersData.map((item) => item.answer));
      }

      await fetchCurrentMembers();

      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id);
      setMessages(msgData || []);
    };

    fetchInitialData();

    // リアルタイム監視：新しい回答（メッセージ）の検知
    const messageChannel = supabase
      .channel(`room-messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    const memberChannel = supabase
      .channel(`room-members-changes-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members" },
        async () => {
          await fetchCurrentMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(memberChannel);
      document.head.removeChild(link);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* 👑 ヘッダーエリア */}
        <header className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-0.5">ホスト管理画面</p>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">{roomName}</h1>
            </div>

            <button
              onClick={handleDestroyRoom}
              disabled={isDestroying}
              className="text-xs md:text-sm font-black text-white bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/10 active:scale-95 whitespace-nowrap"
            >
              💥 {isDestroying ? "解散中..." : "部屋を解散する"}
            </button>
          </div>
          
          <div className="flex flex-col gap-2.5 w-full">
            {/* ルームID表示エリア */}
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
              <div className="font-mono text-xs md:text-sm">
                <span className="text-slate-400 select-none mr-2">ROOM ID:</span>
                <span className="font-bold text-slate-700 tracking-wider text-base">{displayRoomId}</span>
              </div>
              <button
                onClick={handleCopyId}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 whitespace-nowrap ${
                  copied 
                    ? "bg-emerald-500 text-white shadow-sm" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 shadow-sm"
                }`}
              >
                {copied ? "✓ コピー完了" : "📋 コピー"}
              </button>
            </div>

            {/* パスワード */}
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
              <div className="font-mono text-xs md:text-sm">
                <span className="text-slate-400 select-none mr-2">PASSWORD:</span>
                <span className="font-bold text-slate-700 tracking-wide">
                  {showPassword ? roomPassword : "•".repeat(roomPassword.length || 4)}
                </span>
              </div>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-95 whitespace-nowrap shadow-sm flex items-center gap-1"
              >
                {showPassword ? (
                  <span className="material-icons text-[18px] leading-none">visibility</span>
                ) : (
                  <span className="material-icons text-[18px] leading-none">visibility_off</span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* 🔑 折りたたみ式の正解単語確認・追加コンポーネント */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="w-full flex justify-between items-center px-5 py-4 font-extrabold text-slate-900 bg-white hover:bg-slate-50/80 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm md:text-base">
              🔑 設定された正解単語の確認
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md font-bold">
              {showAnswers ? "🔼 閉じる" : "🔽 開く"}
            </span>
          </button>
          
          <div className={`transition-all duration-200 ease-in-out border-t border-slate-100 ${
            showAnswers ? "max-h-[500px] p-5 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}>
            
            {/* インラインの正解単語追加フォームエリア（スマホ対応版） */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mb-5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <input
                type="text"
                placeholder="新しい正解単語を追加"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                onKeyDown={handleAnswerKeyDown}
                disabled={isAddingAnswer}
                className="w-full sm:flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold transition-all"
              />
              <button
                onClick={handleAddAnswer}
                disabled={isAddingAnswer || !newAnswer.trim()}
                className={`w-full sm:w-auto px-5 py-2 font-black text-sm rounded-lg shadow-sm transition-all active:scale-95 text-center flex justify-center items-center ${
                  !newAnswer.trim() || isAddingAnswer
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isAddingAnswer ? "追加中..." : "➕ 追加"}
              </button>
            </div>

            {/* 単語一覧ラベル */}
            {correctAnswers.length === 0 ? (
              <p className="text-xs md:text-sm text-slate-400">設定された正解がありません。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {correctAnswers.map((ans, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleRemoveAnswer(ans)}
                    title="クリックして削除"
                    className="bg-blue-50 text-blue-700 border border-blue-200/60 font-mono font-bold text-xs md:text-sm px-3 py-1.5 rounded-xl shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all duration-150 cursor-pointer flex items-center gap-1 group"
                  >
                    <span>{ans}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-rose-400 transition-colors font-sans font-normal ml-0.5">✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 🎯 正解進捗状況マトリックス表 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 w-full">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-base md:text-lg text-slate-900 flex items-center gap-2">
              <span>🎯</span> プレイヤー別 正解進捗状況ボード
            </h2>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">登録中の正解単語を誰がクリアしているかが一目で分かります（表記揺れ対応済）</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full border-collapse bg-white text-left text-xs md:text-sm text-slate-600 min-w-[500px]">
              <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200 select-none">
                <tr>
                  <th className="px-4 py-3 bg-slate-100/80 text-slate-700 font-black w-[180px]">プレイヤー名</th>
                  {correctAnswers.length === 0 ? (
                    <th className="px-4 py-3 text-slate-400 italic font-normal">正解単語が未設定です</th>
                  ) : (
                    correctAnswers.map((ans, i) => (
                      <th key={i} className="px-4 py-3 text-center font-mono font-bold text-slate-600 bg-slate-50 max-w-[120px] truncate" title={ans}>
                        {ans}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(2, correctAnswers.length + 1)} className="px-4 py-10 text-center text-slate-400 font-medium">
                      プレイヤーが入室するとここに表が生成されます
                    </td>
                  </tr>
                ) : (
                  members.map((member, mIdx) => (
                    <tr key={mIdx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 bg-slate-50/40 truncate max-w-[180px]">
                        {member.username}
                      </td>
                      {correctAnswers.length === 0 ? (
                        <td className="px-4 py-3.5 text-slate-400">ー</td>
                      ) : (
                        correctAnswers.map((ans, aIdx) => {
                          // 💡 新しいヘルパー関数で比較。これによって表記揺れ送信でも「🟢 正解」になります
                          const isCleared = checkUserAnswerStatus(member.username, ans);
                          return (
                            <td key={aIdx} className="px-4 py-3.5 text-center whitespace-nowrap">
                              {isCleared ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-2.5 py-0.5 shadow-sm animate-fade-in">
                                  🟢 正解
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal select-none">ー</span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 📊 メインコンテンツ（下段グリッド） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* 📝 回答一覧 */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 md:col-span-2">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-base md:text-lg text-slate-900">
                📝 回答ログ
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full border-collapse bg-white text-left text-xs md:text-sm text-slate-600 min-w-[320px]">
                <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">プレイヤー</th>
                    <th className="px-4 py-3">回答</th>
                    <th className="px-4 py-3 text-center">判定</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                        まだ回答が送信されていません
                      </td>
                    </tr>
                  ) : (
                    [...messages].reverse().map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 truncate max-w-[100px]">{m.username}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 break-all">{m.text}</td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black shadow-sm ${
                            m.is_correct 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {m.is_correct ? "✓ 正解" : "✗ 不正解"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 👥 ユーザー一覧 */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 md:col-span-1">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-base md:text-lg text-slate-900">
                👥 参加プレイヤー
              </h2>
              <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-full">
                {members.length} 人
              </span>
            </div>
            
            <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <p className="text-xs md:text-sm text-slate-400 text-center py-6">まだ誰も入室していません</p>
              ) : (
                <ul className="space-y-1.5">
                  {members.map((m, i) => (
                    <li 
                      key={i} 
                      className="bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      {m.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* 📋 クレジットフッター */}
      <footer className="w-full text-center text-[11px] text-slate-400 font-semibold pt-12 pb-4 tracking-wider">
        Nazotoki Answer Site 2026 Created by mamemema
      </footer>
    </div>
  );
}