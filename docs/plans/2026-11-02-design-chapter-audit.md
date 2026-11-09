# Audit chương III — `RTS2026 - Bản Mô tả - MeetMateAI ….docx` theo hướng Chrome extension

Ngày: 02/11/2026. Nguồn thẩm quyền về phạm vi: `2026-11-01-meetmate-extension.md`.
File này là **phần phân tích**. Toàn văn tiếng Việt để dán nằm ở `2026-11-02-chapter-III-vi.md`.
Không sửa `.docx` bằng script (11 MB, style bảng và ảnh của template) — mọi thứ dưới đây để bạn dán thủ công.

## 0. Cách đọc

| Ký hiệu | Nghĩa |
|---|---|
| **KEEP** | Giữ nguyên, không sửa |
| **SIẾT** | Giữ khung, sửa vài mệnh đề đang vượt quá cái chạy được |
| **VIẾT LẠI** | Thay toàn bộ thân mục |
| **DI CHUYỂN** | Giữ mục + viết thành stub, nội dung chuyển xuống V.4 kèm gate đo được |
| **BỎ HẲN** | Xóa, không dán nhãn — vì tự mâu thuẫn hoặc bất khả thi |
| **THÊM MỚI** | Tài liệu hiện tại im lặng hoàn toàn |

Số dòng là số trong thân tài liệu khi trích xuất văn bản (`document.xml` → text), dùng để định vị lúc dán, không phải số trang Word.

**Học thuyết chỉ đạo:** không cắt tham vọng, mà **gắn nhãn phạm vi**. Rubric nằm trong chính file (`word/media/image8.png`, `image9.png`): Tính đổi mới/R&D **25%**, Khả năng triển khai & sản phẩm thử nghiệm **20%** (minh chứng bắt buộc là Prototype/MVP), Vấn đề & nhu cầu 20%, Mô hình kinh doanh 15%, Đội ngũ 10%, Trình bày/phản biện 10%. Xóa tham vọng thì mất 25%; tuyên bố vượt cái chạy được thì mất 20% + 10% phản biện. Nhãn phạm vi là nước đi duy nhất ăn cả hai.

## 1. Sự kiện nền đã kiểm chứng

| Sự kiện | Bằng chứng | Hệ quả với chương III |
|---|---|---|
| Thân III ở dòng 181–431. `Hình 1` = infographic chu trình + 4 năng lực; `Hình 2` = infographic 5 lớp INPUT→…→CREATE | `word/media/image3.png`, `image4.png` | Cả hai ảnh **nhãn tiếng Anh** và vẽ kiến trúc đã bỏ. Phải vẽ lại. |
| `Hình 3` là placeholder `[CHÈN ẢNH CHỤP MÀN HÌNH PROTOTYPE…]` | dòng 430 | Hôm nay tài liệu **không có một ảnh prototype nào**. |
| `Bảng 1`: cột MeetMateAI `✓` cả 8 dòng; footnote đã tự nhận "mục tiêu thiết kế" | dòng 224–309 | `✓` nhìn **giống hệt** `✓` đã kiểm chứng của đối thủ. Đây là mặt tấn công lớn nhất. |
| "Độ chính xác kiểm chứng" xuất hiện **3** lần, "Nhóm xác nhận" **7** lần, "phân biệt người nói" **1** lần, "Blaze" **1** lần | đếm trong thân doc | Số lần lặp của một chỉ số chưa build tỉ lệ thuận với xác suất hội đồng hỏi về nó. |
| **Không có `manifest.json` ở đâu cả; "blaze" chỉ xuất hiện trong file kế hoạch** | `find`/`grep` toàn repo | III.3.1 và III.3.3 đang mô tả một hệ thống **0 dòng code**. |
| STT hiện tại = OpenAI realtime `gpt-live-transcribe` @ 24 kHz, LiveKit/WebRTC, khóa phía server | `agents/sidekick/server/providers/transcription.ts:3`, `.env.example:1-14` | Mọi câu "dịch vụ STT", "Hybrid local STT", quản lý khóa đang mô tả một mô hình tin cậy **khác**. Demo **chưa** đổi sang Blaze. |
| `Source = {title,url,text}` — không ngày, không điểm, không trạng thái | `agents/sidekick/shared/types.ts:17` | Dòng "ngày công bố" trong `Bảng 1`/`Bảng 2` **không có cấu trúc dữ liệu nào chống lưng**. |
| Không embeddings, không vector DB, không IndexedDB, không thư viện DOCX/PPTX/XLSX, không diarization | `grep` | III.1.2, III.1.6, III.2.8, vài ô III.3.1 là **hư cấu theo đúng nghĩa**. |
| `app/dashboard` là bản clone UI của **đối thủ** cho sản phẩm luyện phỏng vấn | `2026-11-02-frontend-conflict-register.md` | Không được xuất hiện ở III.3.3 với tư cách prototype. |
| `III.2.7` có mảng chữ lặp: `…chỉ ở mức giới hạn.Không phụ thuộc nền tảng họp. Copilot gắn với Teams…` | dòng 315 | BỎ HẲN vế sau — lỗi copy-paste nhìn thấy ngay. |
| MỤC LỤC liệt kê `2.1…2.7` nhưng thân có `2.8` | dòng 90–96 vs 319 | TOC cũ; Update Field sau khi sửa. |
| Sau tài liệu tham chiếu có **bản sao thứ hai của toàn bộ trang đầu**, bao gồm bìa riêng đề "Tháng 9/2026" | dòng 961+ | BỎ HẲN trước khi nộp. |

## 2. Bảng phân loại từng mục

| Vị trí | Hành động | Lý do quy về một câu | Bằng chứng |
|---|---|---|---|
| III intro (183–186) | SIẾT | Chu trình Talk→Understand→Research→Verify→Create là xương sống và là thứ `Hình 1` vẽ; chỉ cần nói rõ 6 thành phần không phải cái nào cũng đang build. | dòng 183–186 |
| 1.1 Live Meeting Intelligence | VIẾT LẠI | STT là Blaze chứ không phải "dịch vụ thương mại vô danh"; hệ thống tách **chủ đề**, không phân loại 5 loại phát biểu; code-switching chưa tinh chỉnh. | plan Task 4–5; `language=vi`; không fine-tune |
| 1.2 User Knowledge Base | DI CHUYỂN (stub) | 0 triển khai, 0 độ phủ trong plan — nhưng II.1, IV.3.2, V.2.2 đều neo vào nó, nên compress chứ không xóa. | không embeddings/vector DB |
| 1.3 Context-grounded Evidence Intelligence | **VIẾT LẠI — sửa đổi quan trọng nhất** | Bốn trạng thái bằng chứng không tồn tại dưới dạng dữ liệu, nhưng **bất biến URL** thì có và **mạnh hơn**: là bảo đảm kiểm chứng được 100%, không phải điểm model tự chấm. | `shared/types.ts:17`; plan "Mọi URL gửi vào chat phải nằm trong kết quả Exa trả về" |
| 1.4 Deep Research & Source Comparison | SIẾT | Exa trả tối đa 4 nguồn × 4.500 ký tự và prompt có xếp hạng độ tin cậy — có thật; "phân rã thành nhiều truy vấn" và "thời điểm công bố" thì không. | `providers/exa.ts`; plan Task 6 |
| 1.5 Session Context Memory | VIẾT LẠI | Trạng thái thực chỉ có hai: cửa sổ transcript 120 s + chủ đề hiện tại, cả hai **mất khi bấm Dừng**. | plan Global Constraints |
| 1.6 Artifact Generation | DI CHUYỂN (stub) | Plan chỉ sinh tin nhắn chat; luồng 3 định dạng trong `agents/sidekick` ghi vào workspace của bên thứ ba và không nằm trong đường MeetMate. | `agents/sidekick/README` (fork commit `10c9c0e`) |
| 2.1 Documentation → Research | SIẾT | Luận điểm đúng và có trích dẫn; chỉ vế cuối ("nhận diện nhận định cần kiểm chứng… trạng thái bằng chứng") chứa hai thứ chưa build. | — |
| 2.2 Kết hợp meeting context với dữ liệu người dùng | VIẾT LẠI | Ví dụ "Mức giá này có phù hợp không?" đúng là thứ demo **không làm được**; nhưng "cùng một câu, ngữ cảnh khác → truy vấn khác" thì kiểm chứng được. | `query` sinh từ transcript window |
| 2.3 Fact-check trong workflow | VIẾT LẠI | Tuyên bố "chưa đối thủ nào có" đang tựa vào `Bảng 1` mà demo không đỡ được; phải gắn nó vào cơ chế đã chạy. | `Bảng 1` dòng 6 |
| 2.4 Vietnamese-first ở lớp semantic | SIẾT | Mục đã cẩn thận; thiếu đúng cái nên nói: Vietnamese-first **hôm nay nghĩa là gì**, bằng 4 điểm cụ thể. | plan Task 5–6 |
| 2.5 Research-to-Artifact | DI CHUYỂN | Phụ thuộc 1.6; xóa sẽ làm treo "tỷ lệ artifact được dùng tiếp" (V.3.2) và quota "10 artifact" (IV.3.1). | — |
| 2.6 Bối cảnh cạnh tranh + `Bảng 1` | SIẾT + phẫu thuật bảng | Phần khảo sát đối thủ là khối **chứng cứ tốt nhất** của tài liệu (cụ thể, có ngày, có nguồn); chỉ cột MeetMateAI là không bảo vệ được trước hội đồng. | dòng 224–309 |
| 2.7 Lợi thế bền vững | SIẾT + BỎ HẲN 1 mảng chữ | Đây là mục **dự đoán đúng** plan mới (Chrome extension, host bật là đủ, không bot, Meet web trước). | dòng 315, 317–320 |
| 2.8 Độ bền dữ liệu & Chế độ Riêng tư | **VIẾT LẠI + ĐỔI TÊN** | Over-claim lớn nhất chương: IndexedDB buffer, snapshot, audit log bất biến, ba chế độ Cloud/Hybrid/Riêng tư — không cái nào tồn tại; trong khi cơ chế suy giảm **thật** thì tài liệu không nhắc. | offscreen giữ mọi thứ in-memory; mọi frame audio đi tới `dev-api.blaze.vn` |
| 3.1 Kiến trúc | VIẾT LẠI + THÊM MỚI | Mô hình 5 lớp là thiết kế tổng thể, không phải kiến trúc demo; phần R&D đáng điểm nhất (4 bối cảnh MV3 + *tại sao offscreen*) hoàn toàn vắng mặt. | MV3 service worker bị treo, không giữ `MediaStream`/`AudioWorklet` |
| 3.2 Luồng end-to-end | VIẾT LẠI | `Bảng 2` cũ có 5 dòng mô tả thứ không chạy (05:12 Partially Supported, 18:05 ghi quyết định, 24:30 treo giả định, 31:00 bảng tính, 45:00 xuất brief). | `SessionType`/`buildNotes` không có ở extension |
| 3.3 Prototype | VIẾT LẠI toàn bộ | Bảng 7-module toàn ô `Đã chạy/Đang phát triển` × `Nhóm xác nhận` **tệ hơn không có bảng**; placeholder `[CHÈN ẢNH]` nằm ngay dưới tiêu chí 20% đòi minh chứng. | dòng 395–430 |

**BỎ HẲN (không dán nhãn):** ô `phân biệt người nói`; `Web app (React/Next.js) + backend API`, `pgvector/Qdrant`, `thư viện xuất DOCX/PPTX/XLSX` với tư cách **cam kết công nghệ**; bảng 7 module; placeholder `[CHÈN ẢNH]`; mảng chữ lặp 2.7; bản sao trang bìa sau references.

Riêng ô `phân biệt người nói` là trường hợp đáng giải thích: tài liệu **tự mâu thuẫn trong cùng một chương** — III.2.8 đã thừa "Âm thanh tab đã được trộn nên việc gán người nói có giới hạn", mà III.3.1 vẫn tuyên bố có nó. Và nó bất khả thi về tín hiệu: âm thanh tới extension đã là stream trộn, bỏ thêm bao nhiêu công cũng không tách lại được. Một tuyên bố vừa trái với mục khác của chính tài liệu vừa về mặt vật lý không chạm tới được là chính xác thứ hội đồng thích đào. Bỏ hẳn, thay bằng `thu âm thanh của tab và micro, phát lại âm thanh tab cho người dùng`.

## 3. Hai thiết bị cấu trúc

**Thiết bị A — nhãn phạm vi.** Mỗi mục III.1/III.2 kết bằng **đúng một dòng**, từ vựng khép kín, không biến thể:

> **Phạm vi bản demo:** đã triển khai.
> **Phạm vi bản demo:** một phần — <cái gì có, cái gì chưa>.
> **Phạm vi bản demo:** chưa — lớp mục tiêu, xem mục V.4.

Ba câu chữ cố định là điểm then chốt: nếu mỗi mục một kiểu diễn đạt, hội đồng đọc là vòng vo. Nhất quán thì nó đọc thành phương pháp luận.

**Thiết bị B — tách cột MeetMateAI trong `Bảng 1`** thành `MeetMateAI (demo T11/2026)` và `MeetMateAI (mục tiêu thiết kế)`, thêm `○ Chưa triển khai, được xác định là mục tiêu thiết kế`. Hơn footnote ở ba chỗ: footnote là một câu chữ nằm dưới 8 dấu `✓` mà tất cả đều đọc là "xong"; hai cột biến phân biệt thành **cấu trúc**, không thể bỏ sót; và nó cho phép giữ nguyên mọi `✓` ở cột thứ hai mà không nói dối ở cột thứ nhất. Nếu chỉ được làm **một** sửa đổi trong cả plan, làm cái này.

Hai dòng tiêu chí **thêm mới** vào `Bảng 1` vì vừa đúng vừa khác biệt: *"Nguồn kèm lý do chọn, URL được kiểm chứng là có thật"* (7 cột đối thủ `✗`, cột demo `✓`) và *"Phát hiện nhu cầu thông tin không cần người hỏi"* (ChatGPT Record và các công cụ VN đều user-initiated). Một dòng **hạ cấp**: `Không phụ thuộc nền tảng họp` cột demo xuống `◐` — vì plan là Meet-web-only, một cuộc họp, chỉ Chrome.

## 4. Điểm minh bạch mới — 6 ràng buộc tài liệu đang im lặng

Vì bám form template, **không mở mục `III.4`**. Gom vào hai chỗ:

| Ràng buộc | Dán vào | Nội dung cốt |
|---|---|---|
| (a) Suy giảm có kiểm soát | III.2.8 | 3 quy tắc: lỗi nhà cung cấp AI **chỉ ở popup**, không bao giờ vào chat; mất micro → vẫn chạy với âm thanh tab; JSON hỏng/URL bịa → **bỏ qua lượt**, không đoán bù |
| (b) Phát lại âm thanh tab | III.2.8 | Chrome cắt âm thanh khỏi người dùng khi capture; phải có 2 AudioContext riêng (một ở rate mặc định để người dùng nghe, một ở 16 kHz cho pipeline) |
| (c) Truy vết bằng chat history | III.2.8 | Sổ truy vết của demo **chính là chuỗi tin `MeetMate:`**; audit log có cấu trúc là lớp mục tiêu |
| (d) Ranh giới tin cậy mới | III.2.8 | Khóa do người dùng nhập → `chrome.storage.local`; `api_key` nằm trên URL WebSocket vì trình duyệt không đặt được header bắt tay; **trích nguyên câu "Never add these keys to browser code"** ở `agents/sidekick/.env.example` để nó đọc như một **quyết định kiến trúc**, không phải một sơ suất |
| (e) Bề mặt quyền hạn MV3 | III.2.8 | `tabCapture`, `offscreen`, `storage` + 3 host; nguyên tắc "chỉ offscreen document gọi mạng" |
| (f) Selector DOM dễ vỡ | III.2.8 | Danh sách selector thử lần lượt, ưu tiên `jsname`/`data-*`; hướng nâng cấp (release chỉ chứa selector) và hạ cấp (`ok:false` → báo popup → sao chép tay) |
| Nền tảng | khối cuối III.3.3 | Chrome ≥116, web-only, một cuộc họp, **không** tách người nói |
| Âm vang & tai nghe | khối cuối III.3.3 | Loa ngoài làm một câu xuất hiện hai lần trong nguồn âm → chuẩn hóa + khử trùng 5 s; khuyến nghị đeo tai nghe |
| Sự đồng ý, danh tính, điều khoản dịch vụ | khối cuối III.3.3 | Luật 91/2025/QH15 + NĐ 356/2025/NĐ-CP; tin nhắn đứng **tên người dùng**, không phải bot; tự động hóa Meet chưa được mô tả công khai |

Mục (d) là chỗ dễ bị hỏi nhất và hiện **không trả lời được**. `agents/sidekick/.env.example` nói ngược lại hoàn toàn với plan mới — đó là một thay đổi kiến trúc thật, phải tuyên bố như một thay đổi thật.

## 5. Mười điểm hội đồng sẽ tấn công, xếp hạng

| # | Câu hỏi | Vì sao nguy hiểm | Trả lời dựng sẵn |
|---|---|---|---|
| 1 | "Bảng đối thủ của bạn nói bạn làm được mọi thứ." | Xác suất cao nhất, hại cao nhất: nhìn thấy trong 3 giây, và là chỗ duy nhất tài liệu tuyên bố vừa **hơn** vừa **đủ**. | Thiết bị B. Hai cột, `○` cho ba dòng chưa build, `◐` cho dòng nền tảng. |
| 2 | "Mở fact-checker, cho tôi xem một nhận định gắn nhãn Contradicted." | Máy 4 trạng thái xuất hiện trong **tên** tính năng lõi, trong `Bảng 1`, ở I, ở TÓM TẮT và ở V.3.2 với mục tiêu ≥80%. Một câu hỏi demo lộ cả năm chỗ. | VIẾT LẠI 1.3 + sửa V.3.2/V.3.3/V.4 **cùng lúc** — nếu chỉ sửa III mà để nguyên bảng chỉ số, bảng chỉ số sẽ là chỗ lộ. |
| 3 | "Mục prototype của bạn có một dòng chỉ dẫn đặt trong ngoặc vuông." | `[CHÈN ẢNH…]` trong tài liệu đã nộp đọc là chưa xong, và nó nằm đúng dưới tiêu chí 20% đòi minh chứng Prototype/MVP. | Chụp **Hình 3 và Hình 5 trước tiên** — hai ảnh đó tự nó biến III.3.3 từ hứa thành bằng chứng. |
| 4 | "Khóa API đi đâu, và ai là bên xử lý dữ liệu?" | Hôm nay **không trả lời được**. Câu này hay tới từ giám khảo không chuyên kỹ thuật, dưới dạng kinh doanh: " gì ngăn người khác copy cái này". | III.2.8(d) + (e): khóa ở `chrome.storage.local` của máy người dùng, không qua máy chủ nhóm, mỗi người trả theo khóa của mình; nói luôn hệ quả (disk plaintext, `api_key` trên URL, khuyến nghị khóa ngắn hạn thu hồi được). |
| 5 | "2.8 nói tách người nói có giới hạn, mà 3.1 lại claim nó." | Tự mâu thuẫn **trong cùng một chương** là thứ rẻ nhất để bắt, và làm mọi tuyên bố khác mất tin cậy. | BỎ HẲN ô đó. Không dán nhãn. |
| 6 | "Cái dashboard này là UI của ParakeetAI." | Chỉ xảy ra **nếu** trưng ra. | Không trưng. Dashboard không xuất hiện ở III.3.3; nếu muốn ghi nhận công sức, một câu ở II/III.2.6 nói rõ là bản khảo sát mẫu tương tác, dùng dữ liệu mẫu, không phải prototype. |
| 7 | "Bạn đã xóa nửa giải pháp của mình." | Rủi ro ngược của chính bản sửa này — **phải chủ động phòng**. | Cấu trúc trả lời: 6 mục vẫn còn; `Hình 1` vẫn 4 năng lực + 5 đoạn; RARR/Self-RAG/RAG/PhoWhisper còn nguyên; mỗi món dời đi có **một dòng V.4 với gate định lượng**. Nói ở đoạn intro III, đừng đợi bị hỏi. |
| 8 | "Bảng chi phí và giá của bạn dựng trên lớp bạn không có." | Đúng và hợp lệ: gói Pro "60 lượt kiểm chứng, 10 artifact" định giá hai thứ chưa build. | Đánh dấu 2 dòng V.2.2 là "Lớp mục tiêu — chưa phát sinh", tính lại tổng, footnote. **Giữ** câu "Bảng giá là giả định" ở IV — nó đang chịu tải. |
| 9 | "Chỉ chạy trên Google Meet, trong Chrome, một cuộc họp, phải đeo tai nghe." | Không chí mạng **nếu III tự nói trước**. Ràng buộc nhóm tự nêu là quyết định phạm vi; ràng buộc hội đồng tự phát hiện là khiếm khuyết. | Khối cuối III.3.3 nêu cả bốn, kèm lý do tín hiệu của cái thứ năm (không tách người nói). |
| 10 | "Tài liệu có một trang bìa thứ hai đề tháng 9." | Vệ sinh thuần, **không có** câu phản biện. | Xóa từ block bìa thứ hai trở đi, Update Field MỤC LỤC. |

## 6. Bộ chỉ số thay thế — 12 dòng extension đo được thật

Thay khối chỉ số V.3.2. **Bốn dòng in đậm là bất biến, không phải trung bình** — chúng là quân bài mạnh nhất của tài liệu, vì hội đồng không phản biện được một tính chất đã có test.

| # | Chỉ số | Cách đo | Mục tiêu |
|---|---|---|---|
| 1 | Độ trễ chủ đề → tin nhắn | log mốc trong `offscreen.ts` + timestamp tin chat; báo p50/p90 | p50 ≤ 20 s; p90 ≤ 30 s |
| 2 | **Tỷ lệ nguồn được kiểm chứng** | đối chiếu log `parseResearch` với `meetmate.post` | **100%** — bất biến, có test |
| 3 | Tỷ lệ URL bị loại | đếm trong `parseResearch` | ghi nhận thực đo; ≤ 10% |
| 4 | Độ chính xác khử câu trùng | gán nhãn thủ công transcript 2 buổi thử | ≥ 95% |
| 5 | Tỷ lệ câu trùng bị lọt | như trên | ≤ 5% |
| 6 | **Tỷ lệ spam khi nói chuyện phiếm** | test điều phối + 2 buổi thử có chủ ý phiếm | **0** |
| 7 | **Tính toàn vẹn độ dài tin** | test `formatChatMessages` + đo chat thật: mọi tin ≤ 450 ký tự **và** URL còn nguyên | **100%** |
| 8 | **Tỷ lệ hủy đúng** | `session.test.ts` + log phiên thật: số tin của chủ đề đã bị thay thế vẫn được gửi | **0** |
| 9 | Tỷ lệ gửi tin thành công | `ok: true` / số tin yêu cầu gửi | ≥ 95% |
| 10 | Chi phí Blaze mỗi cuộc họp | bảng kê Blaze đối chiếu log phiên | điền thực đo; thay giả định 1 USD ở V.2.3 |
| 11 | Tỷ lệ thời lượng người dùng vẫn nghe được | đo khoảng lặng phát lại âm thanh tab | ≥ 99%, không khoảng lặng nào > 2 s |
| 12 | Số lần người dùng phải can thiệp | ghi chú người vận hành | ghi nhận thực đo |

Hai quy ước viết: (1) "độ trễ" luôn là `chủ đề → tin nhắn`, **không bao giờ** `câu nói → phản hồi` — hệ thống không phản hồi từng phát biểu; (2) bỏ hẳn "Độ chính xác kiểm chứng ≥80%" khỏi thì hiện tại ở mọi chỗ (3 lần trong tài liệu).

## 7. Ripple ngoài III (sửa tối thiểu, không tái cấu trúc)

| Chỗ | Vấn đề | Sửa |
|---|---|---|
| TÓM TẮT, dòng 68 | hai mệnh đề chưa được triển khai: 4 trạng thái + chuyển thành báo cáo/slide/bảng tính | thay nửa sau, thêm "các đầu ra dạng tài liệu, bảng tính và slide được xác định là mục tiêu của lộ trình sản phẩm" |
| TÓM TẮT, dòng 69 | "độ chính xác kiểm chứng" là chỉ số 4-trạng-thái | → "độ trễ, độ tin cậy của nguồn, chi phí trên mỗi cuộc họp, thời gian tiết kiệm và mức sẵn sàng chi trả" |
| I, 140–145 | 4 nhóm chức năng gồm KB + Artifact | **Giữ cả 4**, nối 1 câu nhãn phạm vi trỏ tới III.1.2/III.1.6/V.4 |
| I, 146 | "Tính năng trọng tâm… gán trạng thái bằng chứng" | → "trình bày từng nguồn kèm lý do, kèm bảo đảm mọi nguồn đều có thật; gán trạng thái bằng chứng là bước tiếp theo" |
| II.1.2, 161 | — | **Không sửa.** Vấn đề là cái biện minh cho việc giữ các lớp mục tiêu; đừng hạ chương II xuống tầm demo |
| III.2.6 | `Bảng 1` | thiết bị B + 2 dòng mới + hạ 1 dòng + thêm câu minh bạch **bNote do Blaze phát hành, và Blaze cũng là hạ tầng của demo** (đối chiếu dòng 959) |
| V.2.2 | "Lớp nghe liên tục 90 lần gọi (mỗi 30 giây)"; dòng "Tạo artifact", "Embedding, lưu trữ" | thay giả định thành `số đoạn có ≥ 3 câu mới và cách nhau ≥ 15 giây`; **điền cận trên lý thuyết 180 lần cho cuộc 45 phút và để trống ô thực đo** (≤120 chỉ là ước đoán, chưa đo — đừng viết số chưa đo vào bảng chi phí); đánh dấu 2 dòng artifact/embedding là lớp mục tiêu; thêm dòng `Nhận dạng giọng nói realtime (Blaze)` |
| V.3.2 | 5 dòng đo classifier / UI không tồn tại | đổi theo mục 6; dời "Độ chính xác kiểm chứng" sang khối `Chỉ số mục tiêu (giai đoạn sau V.4)`; **xóa** "tỷ lệ artifact được dùng tiếp" |
| V.3.2, dòng 787 | toàn bộ đoạn durability đo IndexedDB / local STT / ẩn danh | dời nguyên đoạn dưới heading `Chỉ số mục tiêu cho các lớp chưa thuộc phạm vi demo` |
| V.3.3 | 2 dòng `CẦN ĐIỀN` sẽ mãi trống | thay bằng các chỉ số đo được ở mục 6 |
| V.4 | gate T11–T12 đòi chỉ số chưa build | gate mới: chuỗi tin `MeetMate` trong chat một cuộc thật 2 người + 100% URL đối chiếu được + chi phí/cuộc đo được. **Thêm 2 dòng roadmap**: KB (RAG) với gate "truy xuất đúng đoạn ≥ 80% trên bộ câu hỏi có đáp án", 4 trạng thái với gate "độ chính xác trạng thái ≥ 70% trên bộ nhận định đã gán nhãn". Đây là chỗ nội dung DI CHUYỂN đáp xuống — nên "move to roadmap" không phải nói giảm của "xóa" |
| V.6 | mitigation hallucination là thứ chưa build; mitigation PhoWhisper lệch plan | đổi item đầu thành "bắt buộc mọi URL có mặt trong tập kết quả tìm nguồn, loại nguồn không đối chiếu được, không kết luận thay nhóm"; thêm dòng `Giao diện Google Meet thay đổi làm hỏng việc gửi tin` |
| Vệ sinh | bản sao trang bìa dòng 961+; TOC thiếu 2.8 | xóa từ block bìa thứ hai; Update Field |

## 8. Map đánh số Bảng/Hình

| Cũ | Mới |
|---|---|
| Hình 1 (chu trình + 4 năng lực) | **Hình 1** — vẽ lại, nhãn tiếng Việt, Talk/Understand/Research nét liền, Verify/Create nét đứt, badge `Demo`/`Mục tiêu` |
| Hình 2 (5 lớp) | **thay bằng Hình 2** — kiến trúc MV3, 4 swimlane + dải dịch vụ ngoài |
| Hình 3 (placeholder `[CHÈN ẢNH]`) | **thay bằng Hình 3…9** (7 ảnh chụp thật). If muốn giữ ảnh 5 lớp: appendix `Hình 2b` |
| Bảng 1 (đối thủ) | **Bảng 1** — số không đổi, tách cột, thêm 2 dòng |
| Bảng 2 (end-to-end) | **Bảng 5** |
| Bảng 3 (prototype status, 7 module) | **Bảng 7** (viết lại với cột `Căn cứ kiểm chứng`) |
| Bảng (Lean Canvas, IV) | **Bảng 8** |
| Bảng (roadmap, V) | **Bảng 9** |
| — | **Bảng 2** 4 bối cảnh · **Bảng 3** 9 bước · **Bảng 4** 5 lớp + trạng thái · **Bảng 6** sự cố · **Bảng 10** ràng buộc III.2.8 nếu muốn đưa thành bảng |

Chỉ 4 bảng ở IV/V có caption nên churn nhỏ. Sau khi đánh số, soát mọi cross-reference trong thân: `mục 2.6`, `III.3.3`, `V.3.3`, `V.4`.

## 9. Ranh giới trung thực của chính bản audit này

Nói thẳng khi giao, không để hội đồng tìm ra:

1. Các hàng `Đã kiểm thử tự động` trong `Bảng 7` **chỉ hợp lệ sau khi** extension thật chạy `vitest`. Hôm nay **0 dòng code extension** trong repo; chưa tồn tại file test nào. Bảng 7 hiện là **kế hoạch kiểm chứng**, không phải kết quả — nếu nộp trước khi Task 1–8 xong thì phải để trống cột trạng thái hoặc đổi nhãn thành "Kế hoạch kiểm chứng".
2. **Blaze chưa được cài ở đâu cả.** STT đang chạy trong repo là OpenAI `gpt-live-transcribe` 24 kHz qua LiveKit. Đừng để ai đọc tài liệu rồi tin rằng demo đã đổi xong.
3. Không kiểm chứng được việc **dán vào Word có giữ đúng style bảng** — bước đó bạn làm.
4. Kế hoạch này sửa **tài liệu**, không tạo bằng chứng chạy được. Ảnh `Hình 3/4/5/8` phụ thuộc Task 2 và Task 8; `Hình 9` chỉ được đưa nếu toàn bộ test xanh.

## 10. Thứ tự viết (6 giai đoạn)

- **G0 — quyết định, ½ ngày, cả nhóm:** chốt từ vựng nhãn phạm vi và công bố cho người cùng viết; chốt thiết bị B (quyết định của PM, không phải của người viết); chốt dashboard **không** vào III.3.3.
- **G1 — xương sống kỹ thuật (đi trước, mọi mục khác trích dẫn nó):** III.3.1 (Bảng 2/3/4 + đoạn "tại sao offscreen") → III.3.2 (Bảng 5/6). Viết trước để **fix từ vựng tiếng Việt chuẩn** cho mọi bối cảnh/module/ngưỡng (`offscreen document`, `cửa sổ transcript`, `tách chủ đề`, `khử câu trùng`, `hủy lượt đang chạy`) — nếu không, ba người cùng viết sẽ đặt ba tên cho một cái hộp.
- **G2 — lớp khái niệm:** **III.1.3 trước III.1.1** (nguyên tắc truy vết là neo mới của cả chương; 1.1, 1.4, 2.2, 2.3 đều chiếu vào nó) → 1.1, 1.4, 1.5 → 1.2, 1.6, 2.5 (stub + move) → intro III + brief vẽ lại `Hình 1`.
- **G3 — tính mới:** 2.3, 2.2, 2.4, 2.1, 2.7 → **`Bảng 1` chót của giai đoạn này** (ô chỉ chốt được khi mọi tuyên bố đã có nhãn, không thì `✓/○` bị đoán lại từ đầu).
- **G4 — nội dung mới:** III.2.8 viết lại + đổi tên, gom 6 ràng buộc.
- **G5 — ripple + prototype:** TÓM TẮT → I → V.2.2 → V.3.2 → V.3.3 → V.4 → V.6 → rồi **III.3.3**: dựng khung `Bảng 7` (tên test file lấy từ plan, ổn định), để nguyên tham chiếu `Hình 3…9`, dán ảnh khi Task 2/Task 8 xong. **Đừng viết văn mục này trước khi tồn tại một tin chat thật** — caption mô tả một ảnh chưa chụp chính xác là lý do placeholder `[CHÈN ẢNH]` sống tới giờ.
- **G6 — cơ học tài liệu:** đánh số lại, xóa bản sao trang bìa, Update Field MỤC LỤC, soát cross-reference.
