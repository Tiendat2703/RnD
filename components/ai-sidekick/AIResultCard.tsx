"use client";

// components/ai-sidekick/AIResultCard.tsx — một chủ đề + các tin của nó.
//
// Nội dung do `toChatPosts()` sinh ra, tức là ĐÚNG chuỗi mà extension gõ vào ô
// chat Meet: số thứ tự [i/4], "Vì sao chọn:", trần 450 ký tự, URL không bao giờ
// bị cắt. Card vẽ lại một nội dung khác tin thật là vẽ một lời hứa mà người
// dùng sẽ không bao giờ nhận được.
//
// Phần CSS của card này sống trong app/globals.css (chrome của trang `/`), còn
// thẻ trong web console sống trong app/dashboard/dashboard.css — stylesheet
// dashboard khai token trên `.dash`, nên `.mm-post` ở đó không thể dùng cho
// route ngoài dashboard. Hai bản vẽ, một nguồn chữ.
import { LIMITS } from "../../lib/types";
import { toChatPosts } from "../../lib/formatChat";
import type { SessionCard } from "../../hooks/useMeetMateSession";
import { IconCheck, IconLink, IconSearch, IconX } from "../dashboard/icons";

function stateOf(card: SessionCard): { label: string; tone: string } {
  if (card.stage) return { label: "đang chạy", tone: "is-running" };
  if (card.killed) return { label: "đã ngắt", tone: "is-killed" };
  if (card.revealed === 0) return { label: "chưa gửi", tone: "is-off" };
  return { label: "xong", tone: "is-done" };
}

export default function AIResultCard({ card }: { card: SessionCard }) {
  const posts = card.result ? toChatPosts(card.result) : [];
  const state = stateOf(card);
  const noSource = card.result ? card.result.sources.length === 0 : false;

  return (
    <article className="mmk-topic">
      <header className="mmk-topic__head">
        <h3 className="mmk-topic__name">{card.topic.topic}</h3>
        <span className={`mmk-topic__state ${state.tone}`}>{state.label}</span>
      </header>

      <p className="mmk-topic__query">
        <IconSearch width={12} height={12} />
        <span>{card.topic.query}</span>
      </p>

      {posts.length === 0 ? (
        <p className="mmk-topic__waiting">Đang tìm nguồn…</p>
      ) : (
        <ul className="mmk-posts">
          {posts.map((post, i) => {
            const sent = i < card.revealed;
            const cancelled = !sent && card.killed;
            return (
              <li
                key={post.text}
                className={`mmk-post${sent ? " is-sent" : ""}${cancelled ? " is-cancelled" : ""}`}
              >
                <p className="mmk-post__eyebrow">{post.eyebrow}</p>
                <p className="mmk-post__title">{post.title}</p>
                {post.url ? (
                  <a
                    className="mmk-post__url"
                    href={post.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <IconLink width={12} height={12} />
                    <span>{post.url}</span>
                  </a>
                ) : null}
                <p className="mmk-post__why">{post.why}</p>
                <p className="mmk-post__foot">
                  {cancelled ? (
                    <span className="mmk-post__flag">
                      <IconX width={11} height={11} />
                      Chưa gửi — chủ đề mới đã đến trước khi xong
                    </span>
                  ) : sent ? (
                    <span className="mmk-post__flag">
                      <IconCheck width={11} height={11} />
                      Đã gửi vào chat Meet
                    </span>
                  ) : (
                    <span className="mmk-post__flag">Đang soạn…</span>
                  )}
                  <span className="mmk-post__count">
                    {post.chars}/{LIMITS.chatMaxChars}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {noSource ? (
        <p className="mmk-topic__empty">
          Không có nguồn nào cho chủ đề này. MeetMate ghi thẳng "chưa đủ căn cứ"
          thay vì đoán — đó là lý do sản phẩm không thể chỉ hiện "đã xong".
        </p>
      ) : null}
    </article>
  );
}
