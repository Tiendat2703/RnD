# Checklist nhất quán: tài liệu ↔ frontend ↔ code extension

Ngày: 02/11/2026. Dùng trước khi nộp và sau mỗi lần sửa bất kỳ một trong ba phía.

Ba phía phải khớp nhau, không phải hai:
**TÀI LIỆU** (`RTS2026 - Bản Mô tả - MeetMateAI ….docx`, sau khi dán `2026-11-02-chapter-III-vi.md`) · **UI** (`app/dashboard`, `app/meeting` trong repo này) · **CODE** (`extension/` — chưa tồn tại).

## 0. Trạng thái xuất phát của cả ba phía

| Phía | Hôm nay là gì | Hệ quả |
|---|---|---|
| TÀI LIỆU | Mô tả hệ 6 thành phần / 5 lớp, thì hiện tại, `Bảng 1` ✓ cả 8 dòng, `Hình 3` là placeholder `[CHÈN ẢNH]`, không có ảnh prototype nào | Over-claim; mất điểm 20% + phản biện |
| UI | Bản clone UI **đối thủ** cho sản phẩm **luyện phỏng vấn**, tiếng Anh, thương hiệu **Sidekick**, dữ liệu mẫu, 9 toast `Demo only —` — chi tiết trong `2026-11-02-frontend-conflict-register.md` (**818** chuỗi hiển thị, **5** route, **7** surface mount trên mọi route) | Không dùng làm prototype được; và nếu ảnh chụp lọt vào tài liệu thì mất cả 25% đổi mới |
| CODE | **0 dòng code extension.** `blaze` chỉ xuất hiện trong file kế hoạch; STT thật trong repo là OpenAI `gpt-live-transcribe` 24 kHz qua LiveKit | Mọi hàng `Đã kiểm thử tự động` và ảnh Hình 3–9 đều là **tương lai** |

## 1. Tuyên bố cấp chương — ba cột

`✓` khớp · `△` một phần · `✗` lệch · `—` chưa tồn tại

| # | Tuyên bố trong TÀI LIỆU (sau khi dán) | UI | CODE | Việc phải làm để ba phía khớp |
|---|---|---|---|---|
| 1 | Hệ thống phục vụ **mọi loại cuộc họp** (sản phẩm, nghiên cứu, đào tạo, bán lẻ) | ✗ UI khóa vào interview: `SessionType "interview"\|"regular"\|"mock"`, 8 session mẫu đều là phỏng vấn, nav "Interview Assistant" | — | Stage 2 của `2026-11-02-frontend-replatform.md`: `MeetingKind`, bỏ `role/company` khỏi tên miền |
| 2 | Không có **phân biệt người nói**, và đó là bất khả thi về tín hiệu | ✗ `TranscriptLine.who = "Interviewer"\|"You"\|"Sidekick"` gán sẵn vai; `lib/types.ts` có `speakerId`; `ParticipantGrid.tsx:18` hardcode "p-04" là "Bạn" | — | Bỏ `who`/`speakerId` khỏi UI; **xóa** ô `phân biệt người nói` khỏi `Bảng 4` (đã chốt BỎ HẲN) |
| 3 | Đầu ra là **chuỗi tin chat có cấu trúc**, không phải artifact | △ `components/meeting` có tab "Ghi chú"; `lib/types.ts` `AIArtifact{document\|slide\|spreadsheet}` với comment "mock link, không cần trỏ đến file thật" | — | Stage 7: tab "Ghi chú" → "Nguồn"; `AIArtifact` → `ResearchResult` |
| 4 | **Không có web workspace** trong demo | ✗ repo **là** web workspace, 5 route, mount 7 surface trên mọi route | — | Không đưa ảnh dashboard vào III.3.3 (đã chốt); nếu vẫn dựng, dựng thành **popup demo**, không thành workspace |
| 5 | Thương hiệu **MeetMate** | ✗ **Sidekick** ở `brand-word`, fallback `Sidekick workspace`, `localStorage "sidekick-theme"`, `package.json name "ai-meeting-sidekick"`, `IconLogo` = mark của đối thủ | — | Stage 1: đổi toàn bộ thương hiệu; Stage 8: suite kiểm chứng chạy theo tên mới |
| 6 | Toàn bộ chữ hiển thị **tiếng Việt** | ✗ **818** chuỗi tiếng Anh trong `components/dashboard/*.tsx` + `lib/dashboardData.ts`, 100% | — | Stage 6 (L). **Chỉ bắt buộc với surface xuất hiện trong ảnh** nếu gấp |
| 7 | Nhà cung cấp STT/LLM là **Blaze** | ✗ `MODELS` liệt kê `Gemini 3.5 Flash Lite`, `GPT-5.2 mini`; `defaultPrefs.model "Gemini 3.5 Flash Lite"` | ✗ chưa có | Stage 3–4: `MODELS` → Blaze. **Đừng sửa tài liệu trước khi Task 1 xong** |
| 8 | Khóa ở `chrome.storage.local`, **không** trong web app | ✗ `SettingsPanel` hiện **không** có ô key (tốt), nhưng cũng không có nơi nào nói khóa đi đâu | — | Thêm khối "Cài MeetMate" 3 bước (Stage 3). **Không** thêm ô key vào web |
| 9 | `Bảng 7`: 9 hàng `Đã kiểm thử tự động` | — | — (chưa có test file nào) | Chỉ hợp lệ sau khi `vitest extension/src/*.test.ts` chạy xanh. Nếu nộp trước → đổi cột thành `Kế hoạch kiểm chứng` |
| 10 | `Hình 3…9` = 7 ảnh prototype thật | ✗ ảnh hiện tại nếu chụp sẽ là Sidekick-interview | — | Chụp sau Stage 1 + 4 + 6 (ít nhất là các surface bị cắt) |
| 11 | `Hình 1`/`Hình 2` tiếng Việt, nét liền/nét đứt | — | — | Vẽ lại; ảnh cũ nhãn tiếng Anh, tự mâu thuẫn với tuyên bố Vietnamese-first |
| 12 | Chi phí/đơn vị = **cuộc họp**, không phải credit/phỏng vấn | ✗ `FREE_CREDITS = 9`, `creditsUsed` mọi session, "0.5 Credit = 1 headshot", toast `rejoinLive … 0.5 credits` | — | Stage 5: `PRICING` theo phút họp + số nguồn; xóa `spendCredits` khi rejoin |

## 2. Chín hàng bắt buộc phải grep trước khi nộp

```bash
cd /e/meetmate
grep -rniE "sidekick"        app components lib package.json        # kỳ vọng: 0 (trừ DESIGN.md, agents/)
grep -rniE "interview|resume|headshot|mock interview" app components lib   # kỳ vọng: 0
grep -rniE "gemini|gpt-5|openai|anthropic"            components lib       # kỳ vọng: 0 (trừ agents/)
grep -rn "speakerId\|Interviewer\|who:"               lib components       # kỳ vọng: 0
grep -rn "Demo only —"                                components           # kỳ vọng: 0
grep -rn "subsets"                                    app/dashboard/layout.tsx   # kỳ vọng: 3 dòng có "vietnamese"
```

Trong tài liệu (bản Word, dùng Find):

| Chuỗi | Kỳ vọng |
|---|---|
| `[CHÈN ẢNH` | **0** |
| `Nhóm xác nhận` | **0** (đã thay bằng cột `Căn cứ kiểm chứng`) |
| `Độ chính xác kiểm chứng` ở thì hiện tại | **0** — 3 lần hiện tại phải thành "chỉ số mục tiêu" hoặc bị thay |
| `phân biệt người nói` | **0** |
| `pgvector`, `DOCX/PPTX/XLSX` với tư cách cam kết | **0** (chỉ được xuất hiện trong ô "Lớp mục tiêu") |
| `Phạm vi bản demo:` | đúng **số mục con của III.1 + III.2**, mỗi mục **đúng một** dòng |
| `Sidekick` | **0** |
| Khối bìa thứ hai ("Tháng 9/2026") | **0** |

## 3. Năm chỗ tự mâu thuẫn nội tài liệu — phải hết sau khi dán

1. `III.2.8` thừa "gán người nói có giới hạn" ↔ `III.3.1` claim "phân biệt người nói". → BỎ HẲN ô đó.
2. `III.2.6` gọi bNote là đối thủ "(Blaze)" ↔ demo chạy trên API của Blaze. → thêm câu minh bạch đã soạn (PHẦN 4.6).
3. `Bảng 1` ✓ "fact-check có trạng thái bằng chứng" ↔ không tồn tại trường evidence-state trong dữ liệu (`Source = {title,url,text}`). → `○` + cột tách.
4. `III.2.4` tuyên bố Vietnamese-first ↔ `Hình 1` và `Hình 2` hiện tại **nhãn tiếng Anh**. → vẽ lại, mọi chữ trong ảnh tiếng Việt.
5. `III.3.1` "không có backend riêng" ↔ `IV.3.1` mô hình SaaS và `V.2.2` bảng chi phí server. → nêu là thay đổi kiến trúc có chủ đích, backend proxy nằm ở V.4 (PHẦN 4.8.d).

## 4. Ba đồng hồ khác nhau — một trong UI, hai trong dữ liệu

Tài liệu sau khi dán chỉ nói **một** loại mốc: `chủ đề → tin nhắn`. Repo hiện có ba nguồn thì giờ không khớp nhau, và ảnh chụp sẽ lộ cái thứ ba:

| Nguồn | Giá trị | Vấn đề |
|---|---|---|
| `MeetingRoom.tsx:42` | timer hardcode `24*60+18` | đồng hồ treo, không chạy |
| `useTranscriptStream.ts:20-22` | cadence giả `text.length*34`, kẹp 3.4–5.6 s → tổng **95.7 s** | trong khi `mocks/transcript.json` ghi timestamp cho **207 s** |
| `mocks/transcript.json` `at` | timestamp thật trong fixture | không được dùng để render |

Stage 7 chốt **một đồng hồ duy nhất** lấy từ fixture. Nếu không, ảnh "đang chạy 24 phút" cạnh transcript 95 giây là một chỗ hỏi miễn phí.

## 5. Ba bẫy code khiến UI nói sai dù tài liệu đã đúng

| Bẫy | Hệ quả nếu bỏ qua |
|---|---|
| `TranscriptPanel.tsx:115-116` — `const person = people.get(entry.speakerId); if (!person) return null;` | Xóa roster (đúng theo hàng #2) làm **transcript trống trơn im lặng**. Ảnh chụp sẽ là một khung rỗng. |
| `ParticipantTile.tsx:41` — palette = `Number(id.replace(/\D/g,"")) % palettes.length` | ID không chữ số → `NaN` → crash. Bỏ participant thì phải bỏ cả component, không phải chỉ dữ liệu. |
| `lib/mockApi.ts:13-18` — `analyzeQuestion()` ném `"Not implemented — see CLAUDE.md mục 6"` | Nếu UI còn nút "Ask AI", click là lỗi runtime. Xóa cả nút lẫn hàm, đừng để stub. |

## 6. Hàng đợi quyết định (chưa chốt)

| # | Quyết định | Ai | Mặc định nếu không quyết |
|---|---|---|---|
| 1 | Tách cột `Bảng 1` (thiết bị B) | PM | Không tách = để nguyên mặt tấn công #1 |
| 2 | Dashboard có vào II/III.2.6 với 1 câu "bản khảo sát mẫu tương tác" không | PM | Không nhắc |
| 3 | Đường cắt Stage 6: dịch **toàn bộ** hay chỉ surface có trong ảnh | người viết + designer | Chỉ surface bị cắt |
| 4 | Nộp trước hay sau Task 8 | PM | Nếu trước: `Bảng 7` đổi nhãn `Kế hoạch kiểm chứng`, `Hình 3–9` bỏ, và III.3.3 mất phần lớn sức mạnh ở tiêu chí 20% |
| 5 | `Bảng 10` (ràng buộc 2.8) có tabulate không hay để dạng đoạn | người viết | Đoạn văn |

## 7. Trạng thái hiện tại của bộ deliverable

| File | Trạng thái |
|---|---|
| `2026-11-02-frontend-conflict-register.md` | xong — 14 nhóm xung đột, `file:line` + chuỗi literal + hành động + size |
| `2026-11-02-frontend-replatform.md` | xong — IA mới, data model, 8 stage, chính sách trung thực |
| `2026-11-02-design-chapter-audit.md` | xong — phân loại từng mục III, 10 điểm tấn công, 12 chỉ số, ripple, map đánh số |
| `2026-11-02-chapter-III-vi.md` | xong — toàn văn dán, 9 phần |
| file này | xong |
| Stage 0–5 + 7 + 8 trên frontend | **chưa làm** |
| `extension/` Task 1–8 | **chưa làm** — vẫn là ưu tiên tuyệt đối, vì không có nó thì `Bảng 7` và Hình 3–9 không tồn tại được |
