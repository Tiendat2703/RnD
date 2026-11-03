"use client";

// components/dashboard/MmPost.tsx — chữ ký của sản phẩm: một tin "MeetMate: [i/4]".
//
// Đây là khối duy nhất vẽ định dạng mà extension gõ vào chat Meet, nên web
// console, dialog tùy chọn và panel chi tiết đều nhìn vào nó. Vẽ lại ở nơi khác
// là vẽ một thứ người dùng sẽ không bao giờ nhận được.
//
// Hai thứ luôn hiện trên thẻ, vì đó là hai lời hứa của sản phẩm:
//   - số ký tự thật / trần 450: để người đọc thấy tin nằm trong giới hạn,
//     không phải thấy một khối chữ rồi đoán.
//   - URL nguyên vẹn: `clipKeepUrl` thà bỏ cả tin còn hơn cắt một đường dẫn.
import { cn } from "../../lib/utils";
import { LIMITS, type ResearchResult } from "../../lib/types";
import { toChatPosts, type ChatPost } from "../../lib/formatChat";
import { IconCheck, IconLink, IconX } from "./icons";

export function MmPost({
  post,
  cancelled = false,
  at,
}: {
  post: ChatPost;
  /** chủ đề bị ngắt giữa chừng vì chủ đề mới đến trước khi gửi xong */
  cancelled?: boolean;
  /** mm:ss phiên, nếu thẻ nằm trong dòng thời gian của một phiên */
  at?: string;
}) {
  const over = post.chars > LIMITS.chatMaxChars;
  return (
    <article className={cn("mm-post", cancelled && "mm-post--cancelled")}>
      <p className="mm-post__eyebrow">{post.eyebrow}</p>
      <h4 className="mm-post__title">{post.title}</h4>
      {post.url ? (
        <a
          className="mm-post__url"
          href={post.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          <IconLink />
          {post.url}
        </a>
      ) : null}
      <p className="mm-post__why">{post.why}</p>
      <p className="mm-post__foot">
        {cancelled ? (
          <>
            <IconX />
            <span>Chưa gửi — chủ đề mới đã đến trước khi xong</span>
          </>
        ) : (
          <>
            <IconCheck />
            <span>{over ? "Vượt trần 450" : "Đã gửi vào chat Meet"}</span>
          </>
        )}
        <span className="mm-post__count">
          {post.chars}/{LIMITS.chatMaxChars} ký tự
        </span>
        {at ? <time className="mm-post__at">{at}</time> : null}
      </p>
    </article>
  );
}

/**
 * Toàn bộ kết quả của một chủ đề.
 *
 * `posted` là số tin thật sự đến được chat Meet. Một chủ đề có thể bị ngắt giữa
 * chừng — `mocks/meetmate-output.json` mô tả đúng ca này: "[3/4]" chưa kịp gõ thì
 * chủ đề mới đã đến, nên 3 tin đầu là "đã gửi" và tin thứ 4 là "chưa gửi". Đánh
 * dấu cả chủ đề là một hay không sẽ nói dối về phần đã tới nơi.
 */
export function MmPostList({
  result,
  posted,
  sources = LIMITS.maxSources,
  at,
}: {
  result: ResearchResult;
  /** số tin đã gửi; mặc định = gửi hết */
  posted?: number;
  /** số nguồn người dùng chọn — phần bị trần kỹ thuật cắt sẽ hiện ra thật */
  sources?: number;
  at?: string;
}) {
  const posts = toChatPosts({ ...result, sources: result.sources.slice(0, sources) });
  const limit = posted ?? posts.length;
  return (
    <div className="mpreview__posts">
      {posts.map((p, i) => (
        <MmPost key={i} post={p} cancelled={i >= limit} at={at} />
      ))}
    </div>
  );
}
