# Sổ theo dõi xung đột — frontend hiện tại ↔ hướng MeetMateAI ↔ bản mô tả RTS2026

Ngày kiểm tra: 02/11/2026 · Phạm vi quét: `app/`, `components/`, `hooks/`, `lib/`, `mocks/`, `tests/`, `scripts/`, `package.json` (loại trừ `agents/sidekick`, `node_modules`) · Nguồn thẩm quyền về phạm vi: [`2026-11-01-meetmate-extension.md`](/E:/RnD/2026-11-01-meetmate-extension.md) · Nguồn tuyên bố: `RTS2026 - Bản Mô tả - MeetMateAI ….docx`

## Cách đọc

`Xung đột = một chuỗi/tính năng trong UI hoặc một câu trong tài liệu khẳng định điều mà bản demo (tiện ích Chrome MV3) không thể hoặc không làm.` Cột **Hành động** chỉ một trong bốn giá trị: `SỬA-CHUỖI` (đổi text), `SỬA-HÀNH-VI` (đổi code/logic), `XÓA` (bỏ hẳn feature), `GIỮ` (đúng, chỉ cần dịch). Cột **Size**: S ≤ 30 phút, M ≤ nửa buổi, L ≥ một buổi.

## Thống kê

| Chỉ số | Giá trị đo được |
|---|---|
| Chuỗi hiển thị trong `components/dashboard/*.tsx` + `lib/dashboardData.ts` | **818** (distinct), **100% tiếng Anh** |
| Call `pushToast` | **41**, trong đó **9** chuỗi bắt đầu bằng `Demo only —` |
| Route dashboard | `callSessions`, `cv`, `documents`, `settings`, `profile` |
| Surface mount trên **mọi** route (`DashboardShell.tsx:576-582`) | wizard, connect, live overlay, answer prefs, detail panel, upgrade, support (**7**) |
| Tham chiếu domain cũ trong `scripts/*.mjs` + `tests/*.ts` | **60** |
| Component `return null` không file nào import | **4** (`components/ai-sidekick/*`) |
| Hàm AI duy nhất trong `lib/` | `analyzeQuestion()` → **throw `"Not implemented — see CLAUDE.md mục 6"`** |
| Dòng code extension trong repo | **0** · Blaze chưa được cài ở đâu cả (STT thật vẫn là OpenAI `gpt-live-transcribe` 24 kHz) |

---

## A. Thương hiệu chết: "Sidekick" ≠ MeetMateAI

| file:line | Chuỗi / feature | Xung đột với | Hành động | Size |
|---|---|---|---|---|
| `app/layout.tsx:4` | `title: "Product weekly — Sidekick"` | phạm vi extension + brand | SỬA-CHUỖI → `MeetMateAI — Trợ lý nghiên cứu trong cuộc họp` | S |
| `app/layout.tsx:5` | `description: "A frontend-only AI meeting sidekick demo"` | "frontend-only" phủ nhận đây là tiện ích | SỬA-CHUỖI | S |
| `app/dashboard/layout.tsx:32` | `title: "Dashboard — Sidekick"` | brand | SỬA-CHUỖI | S |
| `app/dashboard/layout.tsx:33` | `description: "Session dashboard clone built from the DESIGN.md reference capture"` | chữ **clone** nhìn thấy trong metadata/source — cực kỳ bất lợi nếu hội đồng xem page-source | XÓA (viết mô tả sản phẩm) | S |
| `MeetingRoom.tsx:65,78` | monogram `"S"` | brand | SỬA-CHUỖI | S |
| `MeetingRoom.tsx:66` | `"Sidekick Meeting"` | brand | SỬA-CHUỖI | S |
| `MeetingRoom.tsx:79` | `"sidekick"` (wordmark) | brand | SỬA-CHUỖI | S |
| `DashboardShell.tsx:415-418` | `brand-mark` + `<span className="brand-word">Sidekick</span>` | brand, hiển thị cố định trên mọi trang | SỬA-CHUỖI | S |
| `DashboardShell.tsx:351` | fallback `{ title: "Dashboard", note: "Sidekick workspace." }` | brand | SỬA-CHUỖI | S |
| `DashboardShell.tsx:91-103` | `TITLES` mọi `note` có "…with Sidekick", "Sidekick tailors answers to the CV you pick", "Job descriptions, prep notes and stories Sidekick can reference" | brand + domain | SỬA-CHUỖI (xem B, C) | S |
| `LiveOverlay.tsx:486` | toast `"Sidekick read your screen."` | brand + capability (extension không đọc màn hình) | XÓA | S |
| `SessionList.tsx:391` | `"How did Sidekick do on this call?"` | brand + domain | XÓA (xem B) | S |
| `SupportWidget.tsx:12,49` | `thong@sidekick.demo`, "A human replies to …" | brand + SLA bịa | XÓA (surface) | S |
| `mocks/transcript.json:6,38,158` | người trong cuộc họp nói chữ "Sidekick" | brand + fixture tự bóc trần | XÓA (fixture mới) | M |
| `DashboardShell.tsx:171,186` | `localStorage` key `"sidekick-theme"` | brand | SỬA-HÀNH-VI (`meetmate-theme`, chấp nhận reset theme) | S |
| `package.json:2,5` | `"ai-meeting-sidekick"`, `"AI Meeting Sidekick — frontend-only MVP (see CLAUDE.md)"` | brand + surface | SỬA-CHUỖI | S |
| `lib/mockApi.ts:1`, `lib/types.ts:1`, `components/ai-sidekick/*.tsx:1-3` | comment dẫn "CLAUDE.md Mục 4/5/6/7" | spec cũ | SỬA-CHUỖI (comment tiếng Việt) | S |
| `icons.tsx` `IconLogo` | logo dựng theo đối thủ | thương hiệu bên khác | SỬA-HÀNH-VI (mark riêng cho MeetMate) | S |

** Ranh giới thương hiệu (nói một lần, áp dụng cho cả repo):** `E:\RnD\DESIGN.md` tự mô tả là *capture tham khảo từ CSS production của một bên khác, không phải giấy phép thương hiệu*. Cơ chế tương tác được tái sử dụng; **logo, tên sản phẩm, copy marketing, minh họa, phông chữ thì không.**

## A2. Khung shell: nút/chip/phím tắt nhìn thấy trên **mọi** route

| file:line | Chuỗi / feature | Xung đột với | Hành động | Size |
|---|---|---|---|---|
| `DashboardShell.tsx:413,421` | `aria-label="Dashboard navigation"`, `aria-label="Primary"` | tiếng Anh | SỬA-CHUỖI | S |
| `DashboardShell.tsx:457-466` | credit card: `Free`, `{credits} free sessions left`, `Buy credits for full usage.` | đơn vị tính = "session" phỏng vấn + mua bán (xem F) | SỬA-CHUỖI + SỬA-HÀNH-VI | M |
| `DashboardShell.tsx:468` | nút **Upgrade** | thương mại hóa UI demo | GIỮ có nhãn "lớp mục tiêu" hoặc XÓA | S |
| `DashboardShell.tsx:483` | hàng sidebar **"Support chat"** | surface support không tồn tại | XÓA | S |
| `DashboardShell.tsx:523,534` | `aria-label="Notifications (Alt+T)"` + chip `Alt+T` (`:321` comment "matching the captured shortcut") | phím tắt copy từ sản phẩm gốc, mở `NOTIFICATIONS` bịa (G) | XÓA | S |
| `DashboardShell.tsx:560,567` | toast host `aria-label="Notifications alt+T"`, `aria-label="Dismiss notification"` | tiếng Anh + trùng tên với bell | SỬA-CHUỖI (`aria-label="Thông báo"`) | S |
| `DashboardShell.tsx:493,500,514` | `aria-label`: "Open navigation", "Expand/Collapse sidebar", "Switch to dark/light theme" | tiếng Anh | SỬA-CHUỖI | S |
| `SessionActionsMenu.tsx:57-77` | menu item **Details / Edit session / Feedback / Delete session**, `aria-label="Actions for {role}"` | "Feedback" = chấm điểm AI cho ứng viên; "session" | SỬA-CHUỖI + XÓA item Feedback | S |
| `CreditMenu.tsx:41,50-60` | `aria-label="Credit options"` + **Invoices** (`/dashboard/profile?tab=billing`), **Buy credits**, **Buy subscription** | hóa đơn bịa + credit | XÓA (surface) | S |
| `UserMenu.tsx:28-30,137-144` | theme `Light/Dark/Auto` + "Always light"/"Follow the system", badge "Tutorials — 1 new" | tiếng Anh + tutorial không tồn tại | SỬA-CHUỖI, XÓA tutorials | S |
| `UserMenu.tsx:151,158,167` | "Feedback Hub — share what the **answers** got wrong.", `Demo only — the desktop app is not installed here.`, `Demo only — sign-out is not wired up.` | "answers" + desktop app + sign-out | XÓA | S |
| `NewSessionButton.tsx:41-47` | 2 nút `aria-label="Create session"` + "Create session of a specific type" | MeetMate không "tạo phiên" từ web | SỬA-HÀNH-VI | M |
| `controls.tsx:70-229` | `Switch`/`Segmented`/`RadioCard`/`DarkMenu`, glyph `"✓"` | **không có literal sai domain** → tái sử dụng nguyên vẹn; chỉ option set chúng render là sai | GIỮ | — |
| `icons.tsx` (65 glyph) | `IconBriefcase` (dùng cho "Interview"), `IconHeadset`, `IconGauge`, `IconNotePencil`, `IconCamera`, `IconReceipt`, `IconCoin` | icon mang nghĩa nghề nghiệp/hỗ trợ/thanh toán | SỬA-HÀNH-VI (đổi glyph theo nghĩa mới) | S |

## B. Xung đột domain lớn nhất: "họp để phỏng vấn" → "họp cho mọi đối tượng"

`lib/dashboardData.ts` là nguồn của đa số xung đột này; enum `SessionType = "interview" | "regular" | "mock"` (`:3`) rò ra UI ở **9** nơi.

| file:line | Chuỗi / feature | Vì sao xung đột | Hành động | Size |
|---|---|---|---|---|
| `DashboardShell.tsx:66-78` | nav group **"Interview Assistant"** | MeetMate phục vụ họp sản phẩm/nghiên cứu/đào tạo/y tế | SỬA-CHUỖI → "Trợ lý cuộc họp" | S |
| `DashboardShell.tsx:73` | nav **"Create session"** | người dùng bấm Bắt đầu ở popup, không tạo phiên từ web | XÓA item | S |
| `DashboardShell.tsx:74` | **"Call Sessions"** + note "Every live call, mock drill and meeting you ran with Sidekick" | "call"/"drill" | SỬA-CHUỖI → "Cuộc họp" | S |
| `dashboardData.ts:6-18` | `CallSession.role` = **tên công việc**, `company` = nhà tuyển dụng, `creditsUsed` | chỉ có nghĩa khi đang ứng tuyển | SỬA-HÀNH-VI → `MeetingRecord{title, kind}` | M |
| `dashboardData.ts:43-129` | 8 phiên seed: "Senior Frontend Engineer / Nordwind Labs", "System design round", "Hiring manager screen / Fjord Analytics", "Behavioral practice / Solo drill", "React deep-dive practice" | lịch phỏng vấn của một ứng viên | XÓA + fixture mới (họp đa đối tượng) | M |
| `dashboardData.ts:242-246` | `SESSION_OPENERS`: "…your %role% application", "Mock drill for %role%. Keep each answer to the balanced length — **I'm timing you.**" | máy chủ chấm điểm ứng viên | XÓA | S |
| `dashboardData.ts:530-562` | `buildNotes()`: "interview preparation for the %role% role", "Behavioural stories followed the **STAR** structure", "**Salary expectations were not reached**", "Filler words dropped", branch `regular`: "the **callee** discussed personal matters, including financial concerns… inability to pay a fee" | notes bịa theo hướng phỏng vấn + một branch mô tả cuộc gọi cá nhân | XÓA hàm; thay bằng `ResearchResult` | M |
| `dashboardData.ts:336-345` | `QUESTION_TYPES` 8 loại: Behavioral, Coding (algorithm problems), Experience check, How-do-you, Situational, System design, Technical knowledge, **Tell me about yourself** | taxonomy câu hỏi phỏng vấn | XÓA | S |
| `dashboardData.ts:347-487` | `ANSWER_LIBRARY`: 8 loại × (question, core, formalCore, 3–4 bullets, STAR 4 trường) ≈ **140 dòng văn xuôi ngôi thứ nhất của ứng viên** | khối dữ liệu lớn nhất và vô dụng nhất; không có gì là "nguồn + lý do" | XÓA (140 dòng) | S |
| `dashboardData.ts:489-518` | `composeAnswer(format, length, tone, star, filler)` | sinh **câu trả lời mẫu để đọc theo** = sản phẩm khác | XÓA | S |
| `dashboardData.ts:564` | `ASK_AI_SUGGESTIONS = ["Follow-up email", "Grade the call", "How was the vibe?"]` | email cảm ơn sau phỏng vấn + chấm điểm | XÓA | S |
| `dashboardData.ts:566-581` | `askAiReply()`: "**Grade: 7.5 / 10**", "the interviewer leaned in on your caching story", "Top improvement: close every behavioural answer with the result sentence", "…those are wired up in this demo" | AI chấm điểm ứng viên | XÓA | S |
| `CreateSessionWizard.tsx:35-42,185` | `TYPE_OPTIONS` Interview/Regular/Mock + `ariaLabel="Session type"` | enum lộ ra UI | SỬA-CHUỖI → loại cuộc họp tiếng Việt | S |
| `CreateSessionWizard.tsx:207-241` | fields **Job post link** (`placeholder="https://jobs.example.com/senior-frontend"`), **Company name**, **Job description**; toasts "Paste a job-post link first.", "Job details imported." | wizard nhập tin tuyển dụng | XÓA 3 field; thay bằng Tên cuộc họp | M |
| `CreateSessionWizard.tsx:99,127` | "Save changes", toast "Session updated." | "session" | SỬA-CHUỖI | S |
| `CreateSessionWizard.tsx:134` | `company: company.trim() || "Practice"` | mặc định "Practice" = luyện tập | XÓA | S |
| `NewSessionButton.tsx:12-14` | notes "Job post, company and rounds" / "A standing meeting you want **answered**" / "Scored drill with feedback at the end" | "answered"/"scored" | SỬA-CHUỖI | S |
| `LiveOverlay.tsx:38-52` | `SCRIPT` 6 câu hỏi phỏng vấn + `SCRIPT_TYPE` map sang Behavioral/System design | vòng lặp câu hỏi phỏng vấn | XÓA | S |
| `LiveOverlay.tsx:92` | `scriptIndex` round-robin over `SCRIPT` | hỏi mãi 6 câu | XÓA hành vi → theo chủ đề phát hiện | M |
| `LiveOverlay.tsx:131-132` | `pushLiveLine({ who: "Interviewer", text: q })` | "Interviewer" không tồn tại | SỬA-HÀNH-VI (xem D) | M |
| `LiveOverlay.tsx:171-172` | `answers = lines.filter(l => l.who === "Sidekick")`, `questions = …!== "Sidekick"` | phân tách question/answer = mô hình phỏng vấn | SỬA-HÀNH-VI → chủ đề/nguồn | M |
| `LiveOverlay.tsx:197-198` | `"On your question — " + answerText(...)` | câu trả lời mẫu | XÓA | S |
| `LiveOverlay.tsx:258-264` | "Auto Answer on — answers arrive with each question." | auto-answer ≠ auto-research | SỬA-CHUỖI | S |
| `LiveOverlay.tsx:408-410` | panel `aria-label="Answers"` + `<h3>Answers</h3>` | panel câu trả lời | SỬA-CHUỖI → "Nguồn đã tìm" | S |
| `AnswerPreferencesDialog.tsx:28-137` | sections **Format** (Full script / Script + bullets / Bullet points), **Length**, **Tone**, **"Use STAR method"**, **"Use filler words"** ("Opens with 'Basically —' so the first line sounds spoken"), **Answer language** | bảng tùy chọn để trả lời phỏng vấn tốt hơn | XÓA dialog; thay bằng "Tùy chọn nghiên cứu" (số nguồn, ngôn ngữ truy vấn, tự động gửi) | M |
| `dashboardData.ts:271-301` | `AnswerFormat/AnswerLength/AnswerTone`, `AnswerPrefs`, `defaultPrefs{format:"script-bullets", star, filler, questionType:"Behavioral", model:"Gemini 3.5 Flash Lite"}` | model sở thích phỏng vấn | XÓA/SỬA | M |
| `SessionList.tsx:49-61` | tab filter Interview/Regular/Mock (`.tabs role="tablist" aria-label="Filter sessions by type"`) | | SỬA-CHUỖI | S |
| `SessionList.tsx:159` | `"Free Session"` | | SỬA-CHUỖI | S |
| `SessionList.tsx:190-191` | `placeholder="Search by role or company"` + `aria-label` | tìm theo nghề ứng tuyển | SỬA-CHUỖI → "Tìm theo tên cuộc họp" | S |
| `SessionList.tsx:232` | empty state "Start a live call or run a **mock interview** and it will show up here." | | SỬA-CHUỖI | S |
| `SessionList.tsx:296-303` | "View transcript" / "Rejoin" / **"Start"** | "Start" từ web | SỬA-CHUỖI | S |
| `SessionList.tsx:318-325` | cột bảng: Status / **Duration** / **Credits** / Actions | Credits | SỬA (F) | S |
| `SessionList.tsx:387-441` | dialog **Feedback**: title "Feedback — {role}", description "How did Sidekick do on this call? **It stays in this demo.**", 5 sao (`aria-label="4 stars"`), textarea placeholder "The **answers** were too long for a phone call…", toast "Thanks — {n}/5 recorded for this session." | chấm điểm câu trả lời cho ứng viên | XÓA dialog | S |
| `SessionDetailPanel.tsx:33-35` | tabs Transcript / **Ask AI** / **Call details** | Ask AI = grading | SỬA → Bản ghi / Nguồn / Chi tiết | M |
| `SessionDetailPanel.tsx:152-158` | hints "Generated from the call audio when the session ended.", "Ask about this call — Sidekick reads the transcript.", "Everything Sidekick knows about this session." | tuyên bố xử lý audio đã kết thúc + brand | XÓA/SỬA | S |
| `SessionDetailPanel.tsx:168-179` | "AI notes cleared.", "Notes regenerated from the transcript." | notes bịa | XÓA | S |
| `SessionList.tsx:444-472` | dialog "Delete this session?" + "Credits spent on this session are not refunded." | credit | SỬA-CHUỖI | S |
| `DashboardShell.tsx:291-316` | toasts "Session ended. Transcript saved to the session details.", "Timer keeps running — rejoin before it runs out." | "saved", timer tính tiền | SỬA-CHUỖI + SỬA-HÀNH-VI | M |
| `DashboardShell.tsx:202-210` | `renameSession/deleteSession/clearSessions/addSession/updateSession` | CRUD phiên phỏng vấn | GIỮ (đổi tên kiểu) | M |
| `DashboardShell.tsx:249-252` | `requestConnect(draft)` (web-app gate trước khi "vào call") | MeetMate chỉ cần tab Meet | SỬA-HÀNH-VI | M |
| `lib/types.ts:15` | comment "ms từ lúc bắt đầu **mock**" | | SỬA-CHUỖI | S |

## C. Resumes → Docs, và nhóm "Prepare" phải biến mất

| file:line | Chuỗi / feature | Vì sao xung đột | Hành động | Size |
|---|---|---|---|---|
| `DashboardShell.tsx:75` | nav **"Resumes"** → `/dashboard/cv` | MeetMate không có tính năng resume; `Documents` (`:76`) đã tồn tại | **XÓA** item + route; `Documents` → **"Tài liệu"** | S |
| `DashboardShell.tsx:64,79-86` | group **"Prepare"**: `Mock Interview` (action), `Resume Maker` (action), `Headshots` (action) | ba tính năng không thuộc sản phẩm, hai trong số đó chỉ toast `Demo only` | **XÓA cả nhóm** | S |
| `CvLibrary.tsx:40-41` | "Drop a new CV here — **PDF works best**", `Choose file` | upload CV + gợi ý PDF (artifact/KB chưa có) | XÓA file | S |
| `CvLibrary.tsx:19-31,70` | fake upload: `status:"processing"` → `Parsing "…"` → `"…" is ready to use in sessions.` | trạng thái "parse xong" không tồn tại | XÓA | S |
| `CvLibrary.tsx:62,76-87` | `toLocaleString("en-GB")`, `disabled={cv.status !== "ready"}`, `"CV removed."` | gate bằng evidence state bịa | XÓA | S |
| `app/dashboard/cv/page.tsx` (4 dòng) | route | | XÓA | S |
| `dashboardData.ts:20-26,131-146` | `CvFile`, `initialCvs`: "Frontend-Engineer-2026.pdf", "Product-Frontend-Hybrid.pdf" | | XÓA | S |
| `dashboard.css:38-39,65-66,147-148` | `--cv-background-raw`, `--cv-border-raw` | token đặt tên theo CV | XÓA | S |
| `dashboard.css:1067,1072-1135` | section comment "9. CV / Documents / Settings surfaces", `.cv-card*`, `.is-processing::after`, `.drop-hint` | style cho surface đã bỏ | XÓA ~70 dòng | S |
| `CreateSessionWizard.tsx:246-247` | `aria-label="Attach CV"` + option "Choose a CV" / "No **resumes** found" | | XÓA field | S |
| `DocumentsLibrary.tsx:86-87,106,118` | "Add document", "Paste a **job description** or prep notes. Stored locally in this demo.", placeholder "e.g. Nordwind Labs — Senior Frontend JD" | tài liệu = JD ứng tuyển | **GIỮ surface, SỬA nội dung** + nhãn "lớp mục tiêu" | M |
| `dashboardData.ts:148-170` | `initialDocs`: "Nordwind Labs — Senior Frontend **JD**", "Helios Systems — **interview loop notes**", "**STAR stories** — leadership" | | SỬA fixture | M |
| `ProfilePanel.tsx:94` | Row "Workspace" note "Sessions, **CVs** and documents live in this workspace." | | SỬA-CHUỖI | S |
| `UpgradeDialog.tsx` + `dashboardData.ts:628-629` | tool **Resume Maker** $22.90, **Headshots** $22.90, "Unlimited resume PDF downloads", "Unlimited AI headshots" | bán tính năng không thuộc sản phẩm | XÓA (xem F) | S |
| `scripts/dash-smoke.mjs:135`, `scripts/dash-shots.mjs:47`, `scripts/probe-net.mjs:11` | visit `/dashboard/cv`, shot `08-cv` | route bị xóa → suite đỏ | SỬA-HÀNH-VI | S |

## D. "Phân biệt người nói" — frontend và **tài liệu** cùng mắc một lỗi

Extension **không thể** tách người nói: audio tới MeetMate đã là stream tab đã trộn (`III.2.8` của bản mô tả cũng đã thừa nhận). Mọi UI gán dòng nói cho một con người là tuyên bố sai và là điểm hội đồng sẽ bấm.

| file:line | Chuỗi / feature | Hành vi | Hành động | Size |
|---|---|---|---|---|
| `lib/types.ts:11-18` | `TranscriptEntry.speakerId` **bắt buộc** trên mọi dòng | mô hình hóa người nói | SỬA-HÀNH-VI: bỏ field | M |
| `dashboardData.ts:35-39` | `TranscriptLine.who: "Interviewer" \| "You" \| "Sidekick"` | | SỬA → `MeetingLine{…, source:"tab"\|"mic"}` | M |
| `dashboardData.ts:172-203` | `sampleTranscript` 6 dòng gắn "Interviewer/You/Sidekick" | | XÓA fixture | S |
| `TranscriptPanel.tsx:115-116` | `const person = people.get(entry.speakerId); if (!person) return null;` | **BẪY CHẾT**: bỏ roster → transcript **rỗng không báo lỗi** | SỬA-HÀNH-VI (path render mới) | M |
| `TranscriptPanel.tsx:57-59,66,121-127` | `participantInitials`, Map `id→person`, avatar mỗi dòng, `<strong>{person.name}</strong>` | mỗi dòng in tên + viết tắt tên | SỬA | M |
| `TranscriptPanel.tsx:101-104`(`MeetingRoom`) | caption `participants.find(...)?.name` + `aria-live="polite"` | screen reader đọc "Minh Anh: …" | SỬA → "Đang có giọng nói trong cuộc họp" | M |
| `MeetingRoom.tsx:60` | `activeSpeakerId = entries.at(-1)?.speakerId` | người đang nói dẫn toàn bộ video wall | SỬA | M |
| `ParticipantGrid.tsx:12,17-19` | `aria-label="Người tham gia cuộc họp"`, `isSpeaking`, **hardcode `"p-04"` là "Bạn"**, camera chỉ cho `p-04` | | XÓA component / đổi thành tile **nguồn âm** | M |
| `ParticipantTile.tsx:11-25,41` | 4 bảng màu danh tính; palette chọn bằng `Number(id.replace(/\D/g,"")) % palettes.length` | **BẪY**: id không chứa số → `NaN` → destructuring throw | XÓA hoặc đổi | M |
| `ParticipantTile.tsx:53,61,67-72` | `aria-label="{name}, đang nói"`, `"Đang nói"` + 3 vạch, `"Bạn"`, `aria-label="Đã tắt mic"` | | XÓA/SỬA | M |
| `mocks/participants.json` | 4 người: **Minh Anh, Linh Nguyễn, Daniel Kim, Thảo Phạm**; `p-03 isMuted:true`; `isSpeaking` static bị ghi đè vĩnh viễn | roster bịa | XÓA file | S |
| `hooks/useTranscriptStream.ts` | import `TranscriptEntry[]` có `speakerId` | | SỬA theo kiểu mới | M |
| `globals.css:189,254,335` | Georgia cho **chữ cái đầu tên người**, badge intent 7px uppercase, `.participant-grid` 1 cột × 4 hàng mobile | | SỬA | S |
| `.docx` III.3.1 `Bảng 4` (cũ) | ô **"phân biệt người nói"** trong lớp Thu nhận | đúng một lỗi với UI | **DELETE** trong bản mô tả (xem deliverable 3) | — |

## E. Mô hình AI và ngôn ngữ: UI nói Gemini/GPT, demo chạy Blaze

| file:line | Chuỗi / feature | Xung đột | Hành động | Size |
|---|---|---|---|---|
| `dashboardData.ts:322-326` | `MODELS = [Gemini 3.5 Flash Lite — "Fastest, lowest cost", Gemini 3.5 Flash, GPT-5.2 mini — "Stronger reasoning"]` | demo chạy **Blaze** (`blaze-stt-1.5-realtime` + Blaze LLM) | SỬA → Blaze | S |
| `dashboardData.ts:297` | `defaultPrefs.model = "Gemini 3.5 Flash Lite"` | | SỬA | S |
| `dashboardData.ts:320` | `LANGUAGES = [English, Vietnamese, Japanese, Korean, German]` | Global Constraint: `language=vi` | SỬA → 1 giá trị `Tiếng Việt` (đa ngôn ngữ = lớp mục tiêu) | S |
| `CreateSessionWizard.tsx:324-351` | "Select language / Call language", "Select model / Speed and accuracy" + 2 picker | | SỬA | M |
| `AnswerPreferencesDialog.tsx:132-137` | "Answer language", note "Transcription stays in the call language." | | XÓA | S |
| `LiveOverlay.tsx:248,304,368` | menu "Language", `aria-label="Transcript language"` | | SỬA | S |
| `UpgradeDialog.tsx:389-390` | trust footer **"Top Models — From OpenAI, Anthropic & Google"** | phản chứng minh bạch: hạ tầng demo là Blaze; trong tài liệu `Blaze` đang xuất hiện đúng **1 lần** và ở vai nhà cung cấp của đối thủ bNote | SỬA-CHUỖI | S |

## F. Tiền: đơn vị tính là resume/headshot, không phải cuộc họp + nguồn

| file:line | Chuỗi / feature | Xung đột | Hành động | Size |
|---|---|---|---|---|
| `dashboardData.ts:41` | `FREE_CREDITS = 9` | đơn vị = phiên phỏng vấn | SỬA: đơn vị = **cuộc họp**, khớp V.2.2 | M |
| `dashboardData.ts:595-608` | `PRICING.unlimited`: tagline, monthly $74.95 / yearly $25.00 / weekly $39.00, features "Unlimited call sessions (& mock)", "**Unlimited resume PDF downloads**", "**Unlimited headshots**", `perCallEstimate: 60` | bán artifact + headshot | SỬA (rewrite theo phút họp/nguồn) | M |
| `dashboardData.ts:609-624` | packs 3/8/15 credit, "+2 free", rules "**0.5 Credit = 30 min call session (& mock)**", "**0.5 Credit = 1 resume PDF download**", "**0.5 Credit = 1 headshot**", single $19.00 | | SỬA | M |
| `dashboardData.ts:625-637` | `custom.tools` = **Resume Maker**, **Headshots**; `excluded: "Call sessions & mock interviews"`; `quarterly` "Save 50%"; `fine` "No lock-in. Cancel anytime." | | XÓA tab Custom | M |
| `dashboardData.ts:589-591` | `OFFER = 0.5` + `DEAL50` (`UpgradeDialog.tsx:164,242` "Code DEAL50 copied.") | khuyến mãi copy từ đối thủ | XÓA | S |
| `UpgradeDialog.tsx:31-44,92,394,406-407` | tabs Unlimited/Credits/Custom, "Per month / Per call / Per credit", `buy()` → toast `"Demo only — ${what} checkout is not wired up in this clone."`, "Demo only — no policy page in this clone", payment brands `Visa, Mastercard, Amex, Apple Pay, Google Pay, UPI, PhonePe` | bán hàng giả + thương hiệu thanh toán | XÓA dialog **hoặc** giữ 1 tab "Dự kiến" có nhãn mock | M |
| `DashboardShell.tsx:220-222,274-291` | `spendCredits(n)`, `rejoinLive` → `spendCredits(0.5)` + toast "Resumed the warm session — **0.5 credits used**." | thu tiền trong lúc demo không tính tiền | XÓA | S |
| `LiveOverlay.tsx:106-107,225` | `elapsed`/`stamp`, pill `title="Time on this call — free while on the free tier"` | đồng hồ tính tiền | SỬA (timer thường) | S |
| `ProfilePanel.tsx:109-125` | `aria-label="{credits} credits left"`, `plan-strip__meter` = `(credits/10)*100` (cap 10 không khai báo), "Payment method: **None on file**" | | SỬA/XÓA | M |
| `dashboardData.ts:656-661` | `INVOICES`: "8-credit pack $59.00 Paid", "3-credit pack $29.50", "Single credit $19.00 **Refunded**" | hóa đơn bịa | **XÓA** (rẻ hơn dịch) | S |
| `SessionDetailPanel.tsx:361` | `<dd>{creditsUsed} credit</dd>` / "Free Session" | | SỬA | S |
| `SessionList.tsx:323` | cột **Credits** | | SỬA → "Thời lượng" | S |
| `CreditMenu.tsx` (66) | "Credit options" | | XÓA | S |
| `dashboardData.ts:643-654` | `ACCOUNT`: `email:"thong@sidekick.demo"`, `team:"**Job hunt · 2026**"`, `plan:"Free"`, `planNote:"Upgrade to stop counting credits."` | domain + brand + credit | SỬA-CHUỖI | S |

## G. Tuyên bố lưu trữ / bảo mật / hỗ trợ không có cơ sở

| file:line | Chuỗi | Vấn đề | Hành động | Size |
|---|---|---|---|---|
| `dashboardData.ts:663-685` `PRIVACY_ROWS` | "Privacy mode — Audio is transcribed then discarded — **nothing is stored on our servers**", "Improve the model with my sessions", "**Keep transcripts for 90 days** … deleted automatically" | extension **không có server**, không lưu gì sau khi bấm Dừng; ba chế độ riêng tư trong tài liệu cũng chưa build | SỬA → một khối "Dữ liệu của bạn" khớp `III.2.8` mới | M |
| `ProfilePanel.tsx:171-174` | "Export everything" → toast "**Export queued — we email the link.**" | không có export, không có email | XÓA | S |
| `ProfilePanel.tsx:179-182` | "Delete account" / "Removes the workspace, every session and every transcript" → `Demo only — account deletion is not wired up.` | | XÓA | S |
| `ProfilePanel.tsx:89` | `Demo only — the sign-in email is fixed.` | đăng nhập không tồn tại | XÓA | S |
| `SupportWidget.tsx` (119) | "Hi Thong — what went wrong with **the answers**?", "The answer came too late", "It went off-script", "**I need a refund on a session**", "**Logged as a support ticket. A human replies to thong@sidekick.demo within a day.**", "Typically replies in a day" | hứa SLA con người + hoàn tiền, sai domain | **XÓA file** | S |
| `ReviewPrompt.tsx` (101) | "Leave a review", "Help us out", 5 `promo__star`, `Demo only — the review never leaves this browser.` | xin review app store cho UI web | **XÓA file** | S |
| `DashboardShell.tsx:105-118` `NOTIFICATIONS` | "Transcript ready for 'System design round' at Helios Systems.", "Your **mock session was scored 8/10**. Review the feedback." | thông báo bịa + chấm điểm | SỬA fixture hoặc XÓA bell | S |
| `MeetingRoom.tsx:84-85` + `:28-35` | `"Bảo mật"` + `ShieldIcon` (khiên có dấu ✓) | bảo đảm an ninh không có mã hóa/auth | SỬA → bỏ icon + label | S |
| `MeetingRoom.tsx:93` | `"Đang ghi bản họp"` + chấm đỏ pulse | sản phẩm **không ghi** gì | SỬA → "Đang lắng nghe" | S |
| `MeetingRoom.tsx:95` | `"Kết nối tốt"` + 3 vạch | không đo network | XÓA | S |
| `TranscriptPanel.tsx:164` | "Chỉ người trong cuộc họp có thể xem bản ghi" + `.privacy-icon ✓` | kiểm soát truy cập không có thật | XÓA | S |
| `UserMenu.tsx:144-145` | badge "Tutorials — 1 new", "Tutorial walkthrough opens in the app." | | XÓA | S |
| `CreateSessionWizard.tsx:162,166` | "Demo only — tutorial video is not wired up.", "Demo only — **mock presets** library is not wired up." | | XÓA | S |

## H. Cách "kết nối" sai hoàn toàn so với kiến trúc

| file:line | Chuỗi / feature | Xung đột | Hành động | Size |
|---|---|---|---|---|
| `ConnectSessionDialog.tsx:28-33` | tiles **Zoom / Teams / Meet / Outlook / Phone** | demo chỉ Meet + `chrome.tabCapture` | SỬA → một khối "Google Meet" | S |
| `ConnectSessionDialog.tsx:39-51` | methods "**Browser tab**", "**System audio**", "**Phone speaker**" | MV3 offscreen chỉ lấy stream tab + mic; hai method kia bất khả thi | SỬA | M |
| `ConnectSessionDialog.tsx:119-143` | "Where is the call?", "How should **Sidekick** hear the call?" | bot không vào phòng | SỬA | S |
| `ConnectSessionDialog.tsx:161-163` | "Muted — your voice stays out of the transcript." / "Your answers are captured." | MeetMate **có** thu micro của bạn | XÓA toggle | S |
| `ConnectSessionDialog.tsx:209-214` | **"Join session"**, "Connecting to the call" | Join = vào phòng; popup chỉ gửi `meetmate.start` | SỬA-HÀNH-VI | M |
| `ConnectSessionDialog.tsx:183` | "Answer style" | | SỬA → "Tùy chọn nghiên cứu" | S |
| `MeetingControls.tsx:39-43` | "Tắt/Bật mic", "Tắt/**Bật camera**" + 4 SVG | MeetMate không sở hữu mic/cam của Meet | XÓA camera, đổi nhãn mic | S |
| `MeetingControls.tsx:45,47` | **"Chia sẻ"** và **"Thêm"** — **không có `onClick`** | 2 nút chết trong trang demo | XÓA | S |
| `MeetingControls.tsx:49` | "Rời cuộc họp" (danger, đỏ) | trang không ở trong cuộc họp | XÓA | S |
| `MeetingRoom.tsx:67-69` | "Bạn đã rời cuộc họp", "Product weekly vẫn đang diễn ra.", **"Tham gia lại"** | | XÓA | S |
| `MeetingRoom.tsx:38-40` | `useState(true)` mic / camera / panel | | SỬA | S |

## I. thứ MeetMate sinh ra **chưa có chỗ hiển thị nào**

grep `source|evidence|citation|url|research|verify` trong `app/ components/ hooks/ lib/ mocks/` → **0 component, 0 type, 0 mock, 0 route**.

| file:line | Hiện trạng | Hệ lụy | Hành động | Size |
|---|---|---|---|---|
| `ai-sidekick/AIResultCard.tsx:1-4` | `return null`, 0 props, **không file nào import** | đầu ra chính của sản phẩm không có chỗ render | SỬA → component thật theo `ResearchResult` | L |
| `ai-sidekick/AISidekickPanel.tsx:1-4` | `return null`; comment "(tuỳ chọn) panel lịch sử các **câu hỏi** đã hỏi" | sai mô hình (không có "hỏi") | SỬA → dòng thời gian chủ đề | M |
| `ai-sidekick/AskSidekickButton.tsx:1-4` | `return null`; comment 'nút kích hoạt **"Ask Sidekick"**' | mâu thuẫn luồng tự động theo chủ đề | **XÓA** | S |
| `ai-sidekick/AIAnalyzingPopup.tsx:1-4` | `return null`; các step dự kiến "Đang đọc câu hỏi… → Đang tìm kiếm… → Đang tổng hợp…" | thiếu trạng thái Exa + viết lý do | SỬA → pipeline thật | M |
| `lib/types.ts:27-31` | `AIArtifact{type:"document"\|"slide"\|"spreadsheet"; url; // mock link, không cần trỏ đến file thật}` | **ngược** bất biến "mọi URL phải nằm trong kết quả Exa" + capability đã hủy | XÓA type | S |
| `lib/types.ts:33-39` | `AIResult{triggeredBy, question, answer, artifacts?}` | Q&A, không phải topic→source→reason | SỬA | M |
| `lib/types.ts:20-25` | `AIAnalysisStatus` có `"error"`; `AIAnalysisStep` **không component nào dùng**, ví dụ comment là "Đang đọc câu hỏi…" | | SỬA | M |
| `lib/types.ts` (thiếu) | **không có** `Source`, `reason`, `isFinal`, `confidence`, `query`, `keywords` | output của MeetMate không có hình dạng dữ liệu | SỬA (thêm, khớp `agents/sidekick/shared/types.ts:17`) | M |
| `lib/mockApi.ts:13-18` | `analyzeQuestion()` **throw `"Not implemented — see CLAUDE.md mục 6"`**, `void question` | | SỬA | M |
| `lib/mockApi.ts:7-10` | `getParticipants()` trả `[]` + TODO, không ai gọi | stub sẽ xóa roster | XÓA | S |
| `lib/mockApi.ts:21-30` | `subscribeToTranscript` = `setInterval` **body bị comment** → timer 3 s chạy mãi, không phát gì | | XÓA | S |
| `lib/mockApi.ts:1-3` | comment "sau này có **backend** thật chỉ thay phần BÊN TRONG hàm" | MeetMate không backend | SỬA-CHUỖI | S |
| `hooks/useAIAnalysis.ts:6-11` | `status` vĩnh viễn `"idle"`, `result` vĩnh viễn `null`, `// TODO`, **`analyze`/`reset` không tồn tại** | | SỬA | M |
| `mocks/ai-responses.json:1` | `[]` | không có fixture nào chứa nguồn | XÓA + fixture mới | M |
| `LiveOverlay.tsx:421-446` | bong bóng **câu trả lời mẫu**, không link; toàn surface **không có `target="_blank"`** nào | | SỬA (nguồn có link) | M |
| `components/ui/` | chỉ `.gitkeep` (comment hứa shadcn button/dialog/spinner) | không có primitive nào | GIỮ nguyên (đừng dựng thư viện lúc này) | — |

## J. Ràng buộc tiếng Việt bị vi phạm toàn bộ (kèm 2 bẫy kỹ thuật)

| file:line | Vấn đề | Hành động | Size |
|---|---|---|---|
| toàn bộ `components/dashboard/*.tsx` + `lib/dashboardData.ts` | **818 chuỗi hiển thị tiếng Anh** vs Global Constraint "Toàn bộ chữ hiển thị cho người dùng viết bằng tiếng Việt" | SỬA | L |
| `app/layout.tsx:14` vs UI | `<html lang="vi">` nhưng dashboard renders tiếng Anh → markup và ngôn ngữ mâu thuẫn | SỬA (dịch) | — |
| `app/dashboard/layout.tsx:12-29` | `Chakra_Petch`, `JetBrains_Mono`, `Caveat` khai `subsets: ["latin"]` **không có `"vietnamese"`** → dấu tiếng Việt rơi về font hệ thống ở heading/mono (chỉ `Inter_Tight` có `vietnamese`) | SỬA: thêm `vietnamese` hoặc bỏ face | S |
| `dashboardData.ts:206-215` | `formatGroupDate` dùng `Intl.DateTimeFormat("en-US")` + `.toUpperCase()` → "NOV 1, 2026" | SỬA: `vi-VN`, bỏ uppercase | S |
| `dashboardData.ts:217-222` | `formatTime` dùng `en-GB` | SỬA | S |
| `globals.css:220,241,242,254` | `text-transform: uppercase` trên eyebrow/topic/intent badge + badge 7px — rủi ro hiển thị với dấu tiếng Việt | SỬA | S |
| `TranscriptPanel.tsx:156-161` | "Điểm nổi bật và **action item** sẽ xuất hiện tại đây." (dịch dở, hứa minutes) | SỬA | S |
| `mocks/transcript.json` | loanwords: deadline, review, transcript, trigger, popup, tile, bottom sheet, component, responsive, desktop, mobile, polish, preview, layout, CTA, slide, accent, caption, mock, backend | XÓA (fixture mới) | M |

## K. Fixture **tự bóc trần** bản demo

`mocks/transcript.json` = 23 dòng về một cuộc họp **để dựng chính trang demo này**; một hội đồng đọc màn hình sẽ thấy cả lời thú nhận.

| dòng | Chuỗi | Ý nghĩa |
|---|---|---|
| `t-03` | "Trong **sáu buổi phỏng vấn**, năm người thích việc AI trả lời ngay trong cuộc họp" | domain phỏng vấn + metric bịa |
| `t-05` | "**Tài liệu hay slide** có thể là **CTA mô phỏng**" | thừa nhận giả artifact |
| `t-08` | "MVP gồm lưới người tham gia, transcript chạy trực tiếp, nút **Ask Sidekick** và popup kết quả" | liệt kê đúng 4 thứ đã dựng — không có nghiên cứu nguồn |
| `t-09` | "mô phỏng độ trễ bằng **timer**… **chưa cần API key**" | trái Global Constraint (bắt buộc khóa Blaze/Exa) |
| `t-10`, `t-12` | "**trigger thủ công** là luồng chính", "toàn bộ **backend vẫn là mock**" | trái luồng auto theo chủ đề |
| `t-11` | "chuẩn bị **ba câu hỏi mẫu** … để kết quả **trông tự nhiên, không giống dữ liệu ngẫu nhiên**" | thú nhận dàn dựng |
| `t-14` | "người xem cần biết ngay **ai vừa đưa ra câu hỏi**" | đòi diarization |
| `t-22` | "**demo sẽ không gọi mạng**" | trái pipeline Blaze/Exa |
| clock | 3 đồng hồ không khớp: header `useState(24*60+18)` (`MeetingRoom.tsx:42`), JSON `timestamp` trải **207 s**, phát thật **95,7 s** (`useTranscriptStream.ts:20-22`, `text.length*34` clamp 3.4–5.6 s) | bấm "Tạm dừng" là lộ |

→ **Hành động:** thay fixture bằng một cuộc họp thật về một chủ đề thật (định giá gói SME), không nhắc đến demo, không nói chuyện người dựng sản phẩm.

## L. Trang `/` (`MeetingRoom`) — cộng thêm

| file:line | Chuỗi / feature | Xung đột | Hành động |
|---|---|---|---|
| `MeetingRoom.tsx:81` | `<strong>Product weekly</strong>`, "Phòng thiết kế · Hôm nay" (lặp ở `TranscriptPanel.tsx:113` và `t-01`) | metadata bịa | SỬA: lấy tên cuộc họp thật từ Meet hoặc bỏ |
| `MeetingRoom.tsx:94` + `useTranscriptStream.ts:34` | badge **"01/06"**; `topicCount` đọc từ **toàn bộ fixture ngay lần render đầu** | giả định biết trước agenda → "đã biết tương lai" | SỬA: đếm chủ đề **đã phát hiện** |
| `useTranscriptStream.ts:33` | default topic `"Mở đầu & mục tiêu"` trùng `transcript.json:5` | 2 nguồn sự thật | SỬA |
| `TranscriptPanel.tsx:17-22` | `intentLabels` = Câu hỏi / Quyết định / Việc cần làm / Tóm tắt | minutes classifier, không phải topic→source→reason | XÓA badge intent |
| `TranscriptPanel.tsx:62,108` | tab **"Ghi chú"** với counter `<span>0</span>` **hardcode** | dead feature | SỬA → tab "Nguồn" |
| `TranscriptPanel.tsx:24-35,92-102` | SearchIcon + `placeholder="Tìm nội dung..."`, `aria-label="Tìm trong bản ghi"`, `aria-label="Đóng bản ghi"` | notes-app feature | GIỮ (đúng, chỉ cần dịch nếu đổi label) |
| `TranscriptPanel.tsx:37-41,86-88` | PlaybackIcon, `aria-label` = "Phát lại cuộc hội thoại"/"Tiếp tục hội thoại"/"Tạm dừng hội thoại" + `title` trùng | media-player metaphor; **test dính verbatim** (`tests/meeting-layout.spec.ts:71-80`) | SỬA kèm test |
| `TranscriptPanel.tsx:79` | "Trực tiếp" + chấm đỏ pulse | "live" trên fixture replay | SỬA ngữ cảnh |
| `TranscriptPanel.tsx:144-152` | "Hội thoại đang tạm dừng · Tiếp tục", "Cuộc họp đã kết thúc · Phát lại" | | SỬA |
| `useTranscriptStream.ts:6-8` | `import transcriptData from "../mocks/transcript.json"` | toàn bộ hội thoại tương lai bị **bundle vào trang** | SỬA |
| `useTranscriptStream.ts:28-31` | `restart()` **không** reset `elapsedSeconds`, topic counter, AI state | | SỬA |

## M. Bộ kiểm chứng hiện tại **bị vô hiệu hóa bởi chính việc sửa**

Không sửa kèm mục này thì "suite xanh" trở thành một tuyên bố sai.

| file | Khối lượng | Phụ thuộc domain cụ thể |
|---|---|---|
| `scripts/dash-smoke.mjs` | **51 checks** | `getByRole("tab", {name:/Interview/})` (`:25`), `/^All/`, "Table view"/"Card view" (`:33,35`), "Sort by newest first"/"oldest" (`:50,52`), "View transcript" (`:60-66`), "Close details" (`:69`), `/^Actions for/` (`:72,82,88`), "Edit session"/`dialog "Edit session"` (`:73-74`), "Save changes" (`:77`), "Delete session" (`:83-84`), "Feedback"/"Send feedback"/`radio "4 stars"` (`:89-92`), "Upgrade" (`:96`), "Rate Sidekick", "Support chat", "Clear transcript", "Create session", "Credit options", `page.goto("/dashboard/cv")` (`:135`), "redirects to callSessions" (`:22`) |
| `scripts/dash-shots2.mjs` | **62 shots** | cùng accessible names tiếng Anh |
| `scripts/dash-shots.mjs` | 12+ | `shot("08-cv", {path:"/dashboard/cv"})` (`:47`), `09-documents`, `10-settings-dark` |
| `scripts/probe-net.mjs` | 4 routes | `"/dashboard/cv"` (`:11`) |
| `tests/meeting-layout.spec.ts` | 4 tests | `.transcript-entry` clone 35× (`:3-14`), `panelHeight ≤ viewport*0.73` (`:64`, khóa pattern bottom-sheet), `getByRole("button",{name:"Tạm dừng hội thoại"})` (`:71-79`), `waitForTimeout(4_000)` (`:80`) |
| `scripts/check-design-md.mjs` | — | validate `DESIGN.md`; phải chạy lại sau khi đổi token |

---

## Tổng kết theo file (để ước lượng)

| File | Dòng | Số xung đột chính | Xử lý |
|---|---|---|---|
| `lib/dashboardData.ts` | 685 | ~40 cụm | rewrite ~60% |
| `components/dashboard/DashboardShell.tsx` | 586 | 22 label + nav + credit + notifications | sửa nặng |
| `components/dashboard/LiveOverlay.tsx` | 572 | 23 label + SCRIPT + who + billing | sửa nặng |
| `components/dashboard/SessionList.tsx` | 477 | 20 label + filter + feedback dialog | sửa vừa |
| `components/dashboard/CreateSessionWizard.tsx` | 482 | 26 label + job fields | sửa nặng |
| `components/dashboard/UpgradeDialog.tsx` | 413 | 16 label + pricing | xóa/rewrite |
| `components/dashboard/SessionDetailPanel.tsx` | 368 | 10 label + Ask AI | sửa vừa |
| `components/dashboard/{ConnectSessionDialog,AnswerPreferencesDialog}` | 218 + 205 | 22 label | thay bằng surface mới |
| `components/dashboard/{CvLibrary,SupportWidget,ReviewPrompt,CreditMenu,DocumentsLibrary,ProfilePanel,SettingsPanel,UserMenu,NewSessionButton,SessionActionsMenu,Dialog,controls,modalStack}` | ~1.250 | 1 file giữ, 3 xóa, còn lại sửa nhẹ | |
| `components/meeting/*` + `hooks/*` + `mocks/*` + `lib/types.ts` + `lib/mockApi.ts` | ~560 | speakerId, brand, intent, stubs | sửa nặng |
| `app/{layout,page}.tsx`, `app/dashboard/*`, `app/globals.css`, `package.json` | — | brand, subsets, slug | sửa nhẹ |
| `scripts/*` + `tests/*` | — | 60 tham chiếu | **phải sửa đồng bộ từng stage** |

**Xóa sạch (rẻ hơn sửa/dịch):** `CvLibrary.tsx` (105) · `app/dashboard/cv/page.tsx` (4) · `SupportWidget.tsx` (119) · `ReviewPrompt.tsx` (101) · `CreditMenu.tsx` (66) · `ANSWER_LIBRARY`+`composeAnswer` (≈190) · `buildNotes`+`askAiReply`+`ASK_AI_SUGGESTIONS`+`SESSION_OPENERS`+`seedTranscript` (≈90) · `PRIVACY_ROWS`/`INVOICES`/`PRICING.custom` (≈60) · khối CSS `.cv-*`/`.drop-hint` (≈70) → **≈1.000 dòng** và **≈180 chuỗi** biến mất khỏi backlog.
