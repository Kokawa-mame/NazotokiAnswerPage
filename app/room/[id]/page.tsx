"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 💡 表記揺れを完全に破壊する強力な正規化関数
function normalizeText(str: string): string {
  if (!str) return "";

  // 1. 全角英数字を半角に変換 + 大文字を小文字に統一
  let text = str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();

  // 2. カタカナをひらがなに変換
  text = text.replace(/[\u30a1-\u30f6]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60));

  // 3. ひらがなをローマ字に一括変換するための辞書マップ (主要なブレをカバー)
  const kanaToRomanMap: { [key: string]: string } = {
    あ: "a", い: "i", う: "u", え: "e", お: "o",
    か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
    さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
    た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
    な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
    は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "mo",
    ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
    や: "ya", ゆ: "yu", よ: "yo",
    ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
    わ: "wa", を: "wo", ん: "n",
    が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
    ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
    だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
    ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
    ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
    きゃ: "kya", きゅ: "kyu", きょ: "kyo",
    しゃ: "sha", しゅ: "shu", しょ: "sho",
    ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
    にゃ: "nya", にゅ: "nyu", にょ: "nyo",
    ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
    みゃ: "mya", みゅ: "myu", みょ: "myo",
    りゃ: "rya", りゅ: "ryu", りょ: "ryo",
    ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
    じゃ: "ja", じゅ: "ju", じょ: "jo",
    びゃ: "bya", びゅ: "byu", びょ: "byo",
    ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
    ー: "", っ: "tsu", ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o"
  };

  // 2文字の拗音（きゃ、しゅ 等）を先に置換
  const doubleKeys = Object.keys(kanaToRomanMap).filter(k => k.length === 2);
  for (const key of doubleKeys) {
    text = text.replaceAll(key, kanaToRomanMap[key]);
  }

  // 1文字の通常音（あ、か 等）を置換
  const singleKeys = Object.keys(kanaToRomanMap).filter(k => k.length === 1);
  for (const key of singleKeys) {
    text = text.replaceAll(key, kanaToRomanMap[key]);
  }

  return text;
}

export default function RoomPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawUsername = searchParams.get("name") || "anonymous";
  const username = rawUsername.trim();

  const [roomName, setRoomName] = useState<string>("読み込み中...");
  const [displayRoomId, setDisplayRoomId] = useState<string>("------");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRoomDestroyed, setIsRoomDestroyed] = useState<boolean>(false);

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

  const handleLeaveRoom = async () => {
    const confirmLeave = confirm("本当にルームから退室しますか？");
    if (!confirmLeave || isLeaving) return;

    try {
      setIsLeaving(true);
      const { error, count } = await supabase
        .from("room_members")
        .delete({ count: "exact" })
        .eq("room_id", id)
        .eq("username", username);

      if (error) {
        console.error("Supabaseエラー詳細:", error);
        alert(`退室処理に失敗しました: ${error.message}`);
        return;
      }

      if (count === 0) {
        await supabase
          .from("room_members")
          .delete()
          .eq("room_id", id)
          .ilike("username", username);
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      alert("退室中に予期せぬエラーが発生しました");
    } finally {
      setIsLeaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchRoomInfo = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("name, room_id")
        .eq("id", id)
        .single();

      if (error) {
        console.error("ルーム情報の取得失敗:", error);
        setRoomName("エラー: ルームが見つかりません");
        return;
      }

      if (data) {
        setRoomName(data.name);
        setDisplayRoomId(data.room_id || "------");
      }
    };
    
    fetchRoomInfo();

    const roomDestroyChannel = supabase
      .channel(`room-destroy-monitor-${id}`)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rooms" },
        (payload) => {
          if (!payload.old || payload.old.id === id) {
            setIsRoomDestroyed(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomDestroyChannel);
    };
  }, [id]);

  const send = async () => {
    const inputWord = text.trim();
    if (!inputWord || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // 💡 今回の入力単語を正規化 (例:「リンゴ」「ＲＩＮＧＯ」➔「ringo」に変換)
      const normalizedInput = normalizeText(inputWord);

      // ⚡ 重複チェック用の全ログ取得
      // (入力した言葉そのものだけでなく、表記揺れも検知するため、ユーザーの過去メッセージを全件走査)
      const { data: userHistory, error: checkError } = await supabase
        .from("messages")
        .select("text, is_correct")
        .eq("room_id", id)
        .eq("username", username)
        .eq("is_correct", true);

      if (checkError) console.error("履歴チェックエラー:", checkError);

      // 過去に正解した単語の中に、今回入力した単語と「正規化データが一致するもの」があるか調べる
      const isAlreadyCleared = userHistory?.some(
        (msg) => normalizeText(msg.text) === normalizedInput
      );

      if (isAlreadyCleared) {
        setResult("すでに正解しています");
        setText("");
        return;
      }

      // --- 通常の判定ロジック ---

      // Supabaseから正解リストを取得
      const { data: correctAnswers, error: fetchError } = await supabase
        .from("correct_answers")
        .select("answer")
        .eq("room_id", id);

      if (fetchError) {
        console.error("正解データのフェッチエラー:", fetchError);
        alert(`正解データの取得に失敗しました: ${fetchError.message}`);
        return;
      }

      // 正解リストもすべて正規化して配列にする
      const normalizedAnswerList = correctAnswers?.map((item) => normalizeText(item.answer)) || [];
      
      // 正規化した状態同士で安全に比較
      const isCorrect = normalizedAnswerList.includes(normalizedInput);

      // 判定結果（isCorrect）を含めてメッセージを保存
      // 💡 あとからホストがログを見返せるよう、送信した生のテキスト(inputWord)のまま保存します
      const { error: insertError } = await supabase.from("messages").insert({
        room_id: id,
        username,
        text: inputWord,
        is_correct: isCorrect,
      });

      if (insertError) {
        console.error("メッセージ保存エラー:", insertError);
        alert(`回答の送信に失敗しました: ${insertError.message}`);
        return;
      }

      setResult(isCorrect ? "正解！" : "不正解...");
      setText("");
    } catch (err) {
      console.error(err);
      alert("送信中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      send();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-800 flex flex-col justify-between relative">
      <div className="max-w-md mx-auto w-full space-y-6">
        
        {/* 👑 ヘッダーエリア */}
        <header className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">参加中のルーム</p>
              </div>
              <h1 className="text-xl font-black text-slate-900 truncate max-w-[180px] sm:max-w-none">{roomName}</h1>
            </div>

            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100/80 px-3 py-2 rounded-xl transition-all border border-rose-200/30 active:scale-95 whitespace-nowrap"
            >
              🚪 {isLeaving ? "退室中..." : "退室する"}
            </button>
          </div>

          {/* ルームIDコピー部分 */}
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
            <div className="font-mono text-xs">
              <span className="text-slate-400 mr-1.5 select-none">ROOM ID:</span>
              <span className="font-bold text-slate-700 tracking-wider text-sm">{displayRoomId}</span>
            </div>
            <button
              onClick={handleCopyId}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all duration-150 active:scale-95 whitespace-nowrap ${
                copied 
                  ? "bg-emerald-500 text-white shadow-sm" 
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 shadow-sm"
              }`}
            >
              {copied ? "✓ 完了" : "📋 コピー"}
            </button>
          </div>

          {/* 👤 プレイヤー名表示 */}
          <div className="text-xs text-slate-500 pl-1 font-semibold flex items-center gap-1">
            <span>あなた:</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{username}</span>
          </div>
        </header>

        {/* 📝 クイズ回答カード */}
        <main className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider pl-1">
              回答を入力
            </label>
            
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ここに答えを入力"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all text-base"
                disabled={isSubmitting}
              />
              
              <button 
                onClick={send}
                disabled={isSubmitting || !text.trim()}
                className={`w-full py-3.5 rounded-xl font-black text-base shadow-sm transition-all duration-150 active:scale-[0.98] ${
                  !text.trim() || isSubmitting
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
                }`}
              >
                {isSubmitting ? "判定中..." : "回答を送信する"}
              </button>
            </div>
          </div>

          {/* 🎯 正誤判定エリア */}
          {result && (
            <div className={`mt-4 rounded-xl p-4 border text-center transition-all animate-fade-in ${
              result === "正解！"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : result === "すでに正解しています"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">直前の結果</p>
              <p className="text-2xl font-black tracking-wide">
                {result === "正解！" ? "🎉 正解！" : result === "すでに正解しています" ? "🤔 すでに正解しています" : "👻 不正解..."}
              </p>
            </div>
          )}
        </main>

      </div>
      
      <footer className="text-center text-[10px] text-slate-400 font-semibold py-4">
        Nazotoki Answer Site 2026 Created by mamemema
      </footer>

      {/* 部屋が解散された時のフルスクリーン・ポップアップUI */}
      {isRoomDestroyed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 space-y-5 transform scale-100 transition-all">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">部屋が解散されました</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                ホストによって部屋が解散されました。<br />これ以上回答を入力することはできません。
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.97] transition-all text-sm"
            >
              最初の画面に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}