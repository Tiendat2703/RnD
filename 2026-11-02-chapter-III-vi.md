# Chương III viết lại — toàn văn tiếng Việt để dán

File này chứa **toàn bộ văn bản mới**, xếp theo thứ tự xuất hiện trong tài liệu. Mỗi khối có vị trí dán và thao tác (THAY / THÊM / XÓA). Giọng văn theo đúng bản mô tả hiện tại.

Quy ước: khối nguyên văn để dán nằm trong `>` . Tên file, tên biến, URL và giao thức giữ nguyên tiếng Anh; **toàn bộ chữ hiển thị cho người dùng và trong ảnh là tiếng Việt**.

Số dòng tham chiếu là số trong thân tài liệu trích xuất, dùng để định vị khi dán.

---

# PHẦN 0 — Hai thiết bị cấu trúc (đọc trước, áp dụng cho cả chương)

## 0.1 Nhãn phạm vi

Mỗi mục con của III.1 và III.2 kết bằng **đúng một dòng in đậm**, lấy từ ba câu chữ cố định sau. Không dùng biến thể nào khác trong toàn tài liệu.

> **Phạm vi bản demo:** đã triển khai.

> **Phạm vi bản demo:** một phần — <cái gì có, cái gì chưa>.

> **Phạm vi bản demo:** chưa — lớp mục tiêu, xem mục V.4.

## 0.2 Chú thích ký hiệu thêm dưới `Bảng 1`

> ✓ Hỗ trợ đầy đủ  ◐ Hỗ trợ một phần  ✗ Chưa hỗ trợ  ○ Chưa triển khai, được xác định là mục tiêu thiết kế

---

# PHẦN 1 — Sửa tối thiểu ngoài chương III

## 1.1 TÓM TẮT DỰ ÁN, dòng 68 — THAY nửa sau câu

Vấn đề: hai mệnh đề ở thì hiện tại ("trình bày trạng thái bằng chứng cho từng nhận định…", "chuyển kết quả thành báo cáo, bảng so sánh, slide hoặc bảng tính") đều chưa được triển khai.

> …; trình bày từng nguồn kèm lý do chọn và bảo đảm mọi đường dẫn đưa vào cuộc họp đều là nguồn có thật. Các đầu ra dạng tài liệu, bảng tính và slide được xác định là mục tiêu của lộ trình sản phẩm.

## 1.2 TÓM TẮT DỰ ÁN, dòng 69 — THAY

Vấn đề: "độ chính xác kiểm chứng" là chỉ số của máy trạng thái bốn mức chưa xây.

> … được đo lường bằng các chỉ số độ trễ, độ tin cậy của nguồn, chi phí trên mỗi cuộc họp, thời gian tiết kiệm và mức sẵn sàng chi trả.

## 1.3 MỤC I, sau dòng 145 — THÊM một câu

Giữ nguyên cả bốn nhóm chức năng; không thu hẹp tầm nhìn, chỉ gắn nhãn.

> Trong đó, Live Meeting Intelligence, một phần của Context-grounded Evidence Intelligence và Session Context Memory thuộc phạm vi bản demo tháng 11/2026; User Knowledge Base và Artifact Generation là hai lớp mục tiêu được trình bày chi tiết tại các mục III.1.2, III.1.6 và V.4.

## 1.4 MỤC I, dòng 146 — THAY

> Tính năng trọng tâm của dự án là Context-grounded Evidence Intelligence: hệ thống dựa vào bối cảnh hội thoại để tự tìm nguồn, trình bày từng nguồn kèm lý do, và bảo đảm mọi nguồn đưa vào cuộc họp đều có thật. Việc gán trạng thái bằng chứng cho từng nhận định là bước phát triển tiếp theo của tính năng này.

## 1.5 MỤC II.1.2, dòng 161 — KHÔNG SỬA

Giữ nguyên. Chương II mô tả vấn đề của người dùng, không mô tả giải pháp; nó là căn cứ cho việc **giữ** các lớp mục tiêu. Không hạ chương II xuống tầm của bản demo.

---

# PHẦN 2 — Mở đầu chương III và Hình 1

## 2.1 Sau dòng 184 — THÊM một đoạn

> Phạm vi triển khai được trình bày trong tài liệu này là bản demo tháng 11/2026. Bản demo hiện thực hóa ba thành phần: Live Meeting Intelligence (mục 1.1), Context-grounded Evidence Intelligence ở phần truy xuất và trình bày nguồn (mục 1.3), và Session Context Memory ở dạng cửa sổ transcript (mục 1.5). Hai thành phần User Knowledge Base (mục 1.2) và Artifact Generation (mục 1.6) được mô tả như các lớp mục tiêu của kiến trúc và được đưa vào lộ trình tại mục V.4. Mục III.3 và mục V.3.3 mô tả đúng những gì bản demo thực hiện.

Không sửa gì khác trong đoạn intro. Chu trình Talk → Understand → Research → Verify → Create và khung "bốn năng lực chính / sáu thành phần kỹ thuật" là xương sống của dự án và là thứ `Hình 1` biểu đạt.

## 2.2 `Hình 1` — caption mới và mô tả vẽ

Caption (giữ số, mở rộng):

> Hình 1. Chu trình và bốn năng lực cốt lõi của MeetMateAI. Đoạn nét liền chỉ phần nằm trong bản demo tháng 11/2026; đoạn nét đứt chỉ lớp mục tiêu của lộ trình sản phẩm.

Mô tả vẽ lại: giữ năm chevron. **Talk / Understand / Research** vẽ nét liền màu nhận diện. **Verify** và **Create** vẽ nét đứt màu xám. Trong bốn thẻ năng lực bên dưới, gắn badge nhỏ màu xanh `Demo` lên Live Meeting Intelligence và Evidence Intelligence; gắn badge xám `Mục tiêu` lên User Knowledge Base và Artifact Generation. **Toàn bộ chữ trong ảnh phải là tiếng Việt** — ảnh hiện tại gắn nhãn tiếng Anh, tự mâu thuẫn với tuyên bố Vietnamese-first ở mục 2.4 và với ràng buộc "toàn bộ chữ hiển thị cho người dùng viết bằng tiếng Việt".

---

# PHẦN 3 — III.1, các năng lực cốt lõi

## 3.1 · Mục 1.1 — Live Meeting Intelligence — THAY TOÀN BỘ

Ba tuyên bố hiện tại không đứng: nhà cung cấp nhận dạng là Blaze chứ không phải một "dịch vụ thương mại" vô danh; hệ thống xác định **chủ đề**, không phân loại phát biểu thành năm loại; và Vietnamese-first hôm nay nằm ở lớp ngôn ngữ đầu vào–đầu ra, chưa phải lớp semantic có tinh chỉnh.

> MeetMateAI tiếp nhận âm thanh của cuộc họp và chuyển thành văn bản theo thời gian thực, sau đó xác định **chủ đề đang được bàn** trong từng khoảng hội thoại. Chủ đề được biểu diễn bằng bốn trường: tên chủ đề tiếng Việt, tối đa tám từ khóa, một truy vấn tìm kiếm, và một cờ cho biết chủ đề đã thay đổi hay chưa.
>
> Bản demo sử dụng dịch vụ nhận dạng giọng nói tiếng Việt Blaze STT ở chế độ realtime với tham số ngôn ngữ cố định `vi`. Âm thanh đầu vào gồm hai nguồn: âm thanh của tab Google Meet — tức giọng của những người khác — và micro của người dùng, được trộn và lấy mẫu ở 16 kHz.
>
> Phân loại phát biểu thành câu hỏi, nhận định, giả định, yêu cầu nội dung và quyết định là một phần của thiết kế nhưng chưa thuộc phạm vi bản demo. Ở giai đoạn hiện tại, mọi nhu cầu thông tin đều được tiếp cận qua đơn vị chủ đề: hệ thống chờ đến khi một chủ đề đủ rõ rồi mới tìm nguồn, thay vì chờ một câu hỏi được phát biểu. Đây là lựa chọn có chủ đích, vì nhu cầu thông tin trong họp thường xuất hiện dưới dạng một chủ đề đang mở ra, chứ không phải một câu hỏi tường minh.
>
> Khả năng xử lý hội thoại Việt–Anh đan xen hiện phụ thuộc vào model nhận dạng thương mại và chưa được tinh chỉnh riêng. Nghiên cứu PhoWhisper (Le và cộng sự, 2024) và hướng xử lý code-switching Việt–Anh (Nguyen và cộng sự, 2025) là cơ sở cho giai đoạn tinh chỉnh model trên dữ liệu cuộc họp của nhóm, được đưa vào mục V.4.
>
> **Phạm vi bản demo:** một phần — nhận dạng tiếng Việt và tách chủ đề đã chạy; phân loại nhận định, giả định và quyết định, cùng tinh chỉnh model cho hội thoại code-switching, là lớp mục tiêu.

## 3.2 · Mục 1.2 — User Knowledge Base — THAY TOÀN BỘ (giữ mục, thành stub)

Không xóa mục này: chương II viết hai điểm đau hoàn toàn bằng ngôn ngữ tài liệu nội bộ, mục IV.3.2 gọi kho tri thức chung là "điểm chạm mạnh nhất" của chuyển Free→Paid, và V.2.2 có dòng chi phí "Embedding, lưu trữ". Xóa sẽ buộc sửa bốn chỗ khác; nén thành stub không mất gì.

> MeetMateAI được thiết kế để tiếp nhận các nguồn dữ liệu riêng của người dùng — PDF, báo cáo, tài liệu nội bộ, nghiên cứu thị trường, customer interview, spreadsheet, CSV, presentation, PRD — và ưu tiên truy xuất theo chuỗi Meeting Context → User Knowledge Base → External Research. Cách tiếp cận này dựa trên nguyên lý Retrieval-Augmented Generation (Lewis và cộng sự, 2020).
>
> Trong bản demo tháng 11/2026, MeetMate chỉ sử dụng hai mắt xích đầu và cuối của chuỗi này: ngữ cảnh cuộc họp được lấy từ cửa sổ transcript hai phút gần nhất, còn thông tin được truy xuất từ nguồn bên ngoài qua công cụ tìm nguồn Exa. Mắt xích giữa — kho tri thức của người dùng — chưa được triển khai. Việc xây dựng pipeline chia đoạn, tạo embedding và truy xuất theo ngữ nghĩa được đưa vào lộ trình tại mục V.4, với điều kiện chuyển giai đoạn đo được trên một bộ câu hỏi có đáp án nằm trong tài liệu nội bộ.
>
> **Phạm vi bản demo:** chưa — lớp mục tiêu, xem mục V.4.

Giữ nguyên phần thư mục tham chiếu của Lewis và cộng sự, 2020 — mục này vẫn trích dẫn đến nó.

## 3.3 · Mục 1.3 — Context-grounded Evidence Intelligence — THAY TOÀN BỘ

**Đây là sửa đổi quan trọng nhất của cả tài liệu.** Hai chiều di chuyển rhetoric cần làm đúng: **hạ** bộ bốn trạng thái bằng chứng từ "tính năng" xuống "hướng nghiên cứu", và **nâng** bất biến truy vết URL từ "chi tiết cài đặt" lên "nguyên tắc thiết kế". Chiều thứ hai mới là chỗ giữ được điểm Tính đổi mới, vì nó biến một tuyên bố chất lượng thành một **bảo đảm kiểm chứng được**.

> Đây là tính năng lõi của MeetMateAI. Hệ thống phát hiện nhu cầu thông tin ngay trong cuộc họp và tiến hành nghiên cứu dựa trên bối cảnh hội thoại, sau đó trình bày kết quả dưới dạng **từng nguồn kèm lý do chọn nguồn**.
>
> Quy trình đã triển khai: Chủ đề → Truy vấn tìm kiếm → Nguồn → Kiểm chứng tính có thật của nguồn → Viết lý do chọn từng nguồn → Trình bày vào chat.
>
> Hai nguyên tắc thiết kế chi phối cách trình bày kết quả.
>
> Thứ nhất, **nguyên tắc truy vết nguồn**: mọi URL xuất hiện trong cuộc họp phải là URL do công cụ tìm nguồn trả về. Nếu mô hình ngôn ngữ đưa ra một URL không có trong danh sách nguồn, nguồn đó bị loại trước khi gửi; tiêu đề hiển thị được lấy từ kết quả tìm nguồn chứ không từ mô hình. Nhờ đó, "có nguồn" trong MeetMateAI là một khẳng định kiểm chứng tự động được, với kết quả kỳ vọng là tuyệt đối, chứ không phải một điểm số do mô hình tự đánh giá.
>
> Thứ hai, **nguyên tắc không kết luận thay nhóm**: hệ thống tóm tắt điều mà các nguồn nói, nhưng không tuyên bố một nhận định là đúng hay sai; việc diễn giải và ra quyết định thuộc về cuộc họp. Đây là lựa chọn thiết kế có chủ đích trong môi trường mà một nhận định sai có thể dẫn tới một quyết định chi tiền.
>
> Bước tiếp theo của thiết kế là gán trạng thái bằng chứng cho từng nhận định — được ủng hộ, ủng hộ một phần, mâu thuẫn, hoặc chưa đủ căn cứ — trên cơ sở so sánh nội dung nhiều nguồn. Các nghiên cứu về attribution và fact-checking là cơ sở của hướng này: RARR (Gao và cộng sự, 2023) chứng minh mô hình ngôn ngữ có thể tự động tìm bằng chứng bên ngoài và điều chỉnh nội dung không được nguồn hỗ trợ; Self-RAG (Asai và cộng sự, 2024) cho thấy truy xuất có chọn lọc kết hợp tự đánh giá giúp cải thiện chất lượng và tính xác thực của kết quả sinh.
>
> Trọng tâm của MeetMateAI vì vậy không phải "AI tìm kiếm nhanh hơn", mà là bảo đảm mọi thông tin đưa vào cuộc họp đều truy vết được về một nguồn có thật, và để phần kết luận cho con người.
>
> **Phạm vi bản demo:** một phần — truy xuất nguồn kèm lý do và kiểm chứng URL đã chạy; phân loại trạng thái bằng chứng bốn mức là lớp mục tiêu.

## 3.4 · Mục 1.4 — Deep Research và Source Comparison — SIẾT

Giữ nguyên câu đầu của đoạn hiện tại (mô tả mục tiêu) và giữ nguyên đoạn trích Ge (2025) — nó biện minh cho thứ tự ưu tiên độ tin cậy **đang thực sự nằm trong prompt**. Chèn tiếp:

> Trong bản demo, mỗi chủ đề được ánh xạ tới **một** truy vấn tìm kiếm do mô hình ngôn ngữ chọn, và hệ thống làm việc trên tối đa bốn nguồn do công cụ tìm nguồn trả về, mỗi nguồn kèm văn bản trích xuất. Việc lựa chọn nguồn tuân theo thứ tự ưu tiên độ tin cậy: tài liệu chính thức, nghiên cứu hoặc benchmark độc lập, văn bản pháp luật, báo uy tín, blog.
>
> Phân rã một câu hỏi phức tạp thành nhiều truy vấn và đối chiếu các nguồn mâu thuẫn nhau là phần mục tiêu của thiết kế. Khi đó, hệ thống không lựa chọn kết quả một cách cơ học mà xem xét độ tin cậy của nguồn, thời điểm công bố, phạm vi dữ liệu, đối tượng nghiên cứu, định nghĩa và mức độ liên quan đến câu hỏi.
>
> **Phạm vi bản demo:** một phần — một truy vấn và tối đa bốn nguồn, có xếp hạng theo độ tin cậy nguồn; phân rã đa truy vấn và đối chiếu nguồn mâu thuẫn là lớp mục tiêu.

Bỏ hai mệnh đề cũ: "phân rã vấn đề thành các câu hỏi nhỏ hơn, tiến hành nhiều truy vấn" (bản demo đúng một truy vấn/chủ đề) và "xem xét thời điểm công bố" như một năng lực đang chạy (cấu trúc dữ liệu nguồn không có trường ngày).

## 3.5 · Mục 1.5 — Session Context Memory — THAY TOÀN BỘ

Văn bản hiện tại liệt kê năm thứ trạng thái phiên đang giữ (chủ đề, câu hỏi, nguồn, quyết định, artifact). Thực tế chỉ có hai, cả hai mất khi bấm Dừng. Cách trình bày trung thực và vẫn đáng giá: đây là **ngữ cảnh cửa sổ ngắn**, một quyết định kiến trúc có lý do (khống chế độ dài ngữ cảnh và chi phí), không phải một thất bại về bộ nhớ.

> Trong bản demo, MeetMate duy trì một **cửa sổ transcript** gồm các câu đã chốt trong 120 giây gần nhất và **chủ đề hiện tại**. Hai trạng thái này đủ để việc tách chủ đề và chọn truy vấn tìm kiếm bám sát nội dung đang bàn, đồng thời giữ độ dài ngữ cảnh gửi cho mô hình ngôn ngữ trong một giới hạn cố định — điều kiện cần để chi phí trên mỗi cuộc họp dự đoán được.
>
> Cửa sổ transcript nằm trong bộ nhớ của tài liệu offscreen và mất khi người dùng bấm Dừng hoặc khi tab bị đóng. Các trạng thái dài hơn — danh sách câu hỏi đã phát sinh, nguồn đã nghiên cứu, quyết định đã ghi nhận, artifact đang tạo — thuộc thiết kế mục tiêu. Bộ nhớ xuyên nhiều cuộc họp cũng chưa thuộc phạm vi hiện tại và được xác định là hướng phát triển tại mục V.4.
>
> **Phạm vi bản demo:** một phần — cửa sổ transcript 120 giây và chủ đề hiện tại, không bền vững sau khi dừng.

## 3.6 · Mục 1.6 — Artifact Generation — THAY TOÀN BỘ (giữ mục, thành stub)

> Sau quá trình nghiên cứu và kiểm chứng, MeetMateAI được thiết kế để chuyển kết quả thành các đầu ra tiếp tục sử dụng được trong công việc: research brief, báo cáo cuộc họp, proposal, PRD, presentation, spreadsheet. Quy trình vì vậy không dừng ở Research → Answer mà hướng tới Research → Evidence → Structured Output → Artifact.
>
> Trong bản demo, đầu ra của MeetMate là một chuỗi tin nhắn có cấu trúc trong chat của cuộc họp — mỗi tin gồm tên nguồn, URL và lý do chọn — chứ không phải một tệp tài liệu. Việc sinh và xuất artifact chưa thuộc phạm vi triển khai và được đưa vào mục V.4. Nhóm có tham chiếu một luồng tạo tài liệu ba định dạng trong mã nguồn sidekick kế thừa, song luồng đó ghi vào không gian làm việc của một bên thứ ba và không nằm trong kiến trúc của bản demo này.
>
> **Phạm vi bản demo:** chưa — lớp mục tiêu, xem mục V.4.

---

# PHẦN 4 — III.2, điểm mới và lợi thế cạnh tranh

## 4.1 · Mục 2.1 — Từ Meeting Documentation sang Meeting Research — SIẾT

Đoạn lập luận (Fireflies đã tìm kiếm web trong họp, nên "tìm kiếm" không phải điểm mới; cái mới là mở rộng workflow) là đúng và có trích dẫn. Chỉ câu cuối của đoạn hai vượt quá cái chạy được. Thay vế cuối bằng:

> Hệ thống không chờ người dùng đặt câu hỏi, mà liên tục xác định chủ đề đang bàn trong hội thoại và tự động tìm nguồn cho chủ đề đó, qua đó giải quyết nhu cầu nghiên cứu ngay tại thời điểm nó xuất hiện.

Thêm một câu để tầm nhìn không bị mất:

> Mở rộng từ chủ đề sang phân loại nhận định và đối chiếu với dữ liệu riêng của nhóm là hai bước tiếp theo của thiết kế (mục 1.1 và 1.2).
>
> **Phạm vi bản demo:** một phần — nhận diện chủ đề và research tự động đã chạy.

## 4.2 · Mục 2.2 — Kết hợp meeting context với dữ liệu của người dùng — THAY TOÀN BỘ

Ví dụ làm việc sẵn có trong mục này ("Mức giá này có phù hợp không?" cần dữ liệu khảo sát nội bộ) chính xác là thứ demo **không làm được**. Nhưng tuyên bố nền — cùng một câu hỏi cho kết quả khác nhau tùy hội thoại sinh ra nó — thì kiểm chứng được, vì truy vấn gửi tới công cụ tìm nguồn do mô hình rút ra từ transcript chứ không do ai gõ. Viết lại quanh trục đó:

> Nếu chỉ sử dụng web search, AI có thể đưa ra thông tin đúng về mặt chung nhưng không phù hợp với dự án cụ thể. MeetMateAI kết hợp Live Conversation Context với External Information: truy vấn gửi tới công cụ tìm nguồn không do người dùng gõ mà do mô hình ngôn ngữ rút ra từ các câu đang bàn trong hai phút gần nhất. Cùng một câu nói về giá, nếu khoảng hội thoại trước đó đang bàn về phân khúc SME thì truy vấn sinh ra sẽ khác với khoảng hội thoại đang bàn về chi phí triển khai. Đây là điểm cốt lõi của Context-grounded Research ở phạm vi hiện tại, và là điểm đo được: hai transcript khác nhau tạo ra hai truy vấn khác nhau.
>
> Mắt xích thứ ba — dữ liệu riêng của người dùng — chưa thuộc phạm vi bản demo và được mô tả tại mục 1.2. Ví dụ về câu hỏi "Mức giá này có phù hợp không?" đòi hỏi hệ thống hiểu giả thuyết giá và dữ liệu khảo sát nội bộ của nhóm, chỉ khả thi khi lớp kho tri thức người dùng được triển khai.
>
> **Phạm vi bản demo:** một phần — ngữ cảnh cuộc họp có thật và đo được; dữ liệu riêng của người dùng là lớp mục tiêu.

## 4.3 · Mục 2.3 — Fact-check như một phần của workflow cuộc họp — THAY TOÀN BỘ

Mục này đang chứa câu "chưa có sản phẩm nào cung cấp cơ chế trạng thái bằng chứng tương tự (mục 2.6)" — một tuyên bố độc đáo tựa vào dòng `Bảng 1` mà demo không đỡ được. Tái cấu trúc để tuyên bố độc đáo gắn vào cái **đã chạy**:

> MeetMateAI đưa hoạt động kiểm chứng vào thẳng dòng công việc của cuộc họp theo hai cơ chế đã triển khai.
>
> Thứ nhất, **kiểm chứng nguồn hơn là kiểm chứng kết luận**. Mỗi thông tin hệ thống đưa vào chat đều kèm URL và lý do chọn nguồn, và mọi URL đều bị đối chiếu bắt buộc với tập kết quả do công cụ tìm nguồn trả về. Cơ chế này loại bỏ tận gốc lớp lỗi mà các hệ thống tổng hợp gặp phải: mô hình ngôn ngữ tự bịa nguồn.
>
> Thứ hai, **minh bạch về giới hạn của máy**. Hệ thống không gán nhãn đúng/sai cho một phát biểu và không kết luận thay nhóm; người dùng nhìn thấy nguồn và căn cứ chọn nguồn, còn việc diễn giải thuộc về cuộc họp.
>
> Trên cơ sở khảo sát tại mục 2.6, chưa có sản phẩm nào trong bảy nhóm đối thủ được ghi nhận kết hợp đồng thời hai cơ chế trên với việc chủ động phát hiện nhu cầu thông tin trong hội thoại.
>
> Thiết kế mở rộng — phân biệt câu hỏi, nhận định và giả định, rồi gán trạng thái Chưa kiểm chứng → Được ủng hộ / Ủng hộ một phần / Mâu thuẫn / Chưa đủ căn cứ cho từng nhận định — là phần mục tiêu của tính năng này và là đối tượng đo lường chính của pilot (mục V.3.2).
>
> **Phạm vi bản demo:** một phần — hai cơ chế kiểm chứng nguồn đã chạy; bộ phân loại ba loại phát biểu và bốn trạng thái bằng chứng là lớp mục tiêu.

## 4.4 · Mục 2.4 — Vietnamese-first ở lớp semantic — SIẾT

Mục đã cẩn thận ("hỗ trợ tiếng Việt đơn thuần không được xem là điểm đổi mới cốt lõi"). Thiếu đúng cái nên nói: Vietnamese-first **hôm nay nghĩa là gì**. Thêm sau đoạn hiện tại:

> Trong bản demo, Vietnamese-first thể hiện ở bốn điểm cụ thể. Tham số ngôn ngữ của dịch vụ nhận dạng giọng nói được cố định ở tiếng Việt. Tên chủ đề và toàn bộ chữ hiển thị cho người dùng viết bằng tiếng Việt. Lý do chọn nguồn được viết bằng tiếng Việt. Và mô hình được quyền chọn tiếng Việt hoặc tiếng Anh cho truy vấn tìm kiếm, tùy theo ngôn ngữ nào dự kiến cho kết quả tốt hơn — một quyết định thiết kế dành riêng cho môi trường song ngữ của họp Việt Nam.
>
> **Phạm vi bản demo:** một phần — bốn điểm trên đã chạy; hiểu sâu hội thoại code-switching và thuật ngữ nghiệp vụ là mục tiêu của giai đoạn tinh chỉnh model (mục 1.1 và V.4).

## 4.5 · Mục 2.5 — Research-to-Artifact — THAY TOÀN BỘ

Tuyên bố này phụ thuộc hoàn toàn vào 1.6. Xóa sẽ làm treo dòng "tỷ lệ artifact được dùng tiếp" ở V.3.2 và quota "10 artifact" ở IV.3.1, nên sửa là **dời tuyên bố**, không bỏ:

> Kết quả nghiên cứu của MeetMateAI được thiết kế để chuyển trực tiếp thành artifact. Thay vì Search → Answer, hệ thống hướng tới Research → Evidence → Structured Output → Artifact.
>
> Ở phạm vi hiện tại, chuỗi này dừng lại ở Structured Output: mỗi kết quả nghiên cứu được xuất thành một chuỗi tin nhắn có cấu trúc thống nhất trong chat — một tin mở đầu nêu chủ đề và tóm tắt, tiếp theo là một tin cho mỗi nguồn theo dạng `[i/n] tên nguồn / URL / Vì sao chọn`. Định dạng có cấu trúc này là bước đệm để sau này sinh tài liệu, slide hoặc bảng tính, và được đưa vào mục V.4.
>
> **Phạm vi bản demo:** chưa — lớp mục tiêu, xem mục V.4.

## 4.6 · Mục 2.6 — Bối cảnh cạnh tranh và `Bảng 1`

Khảo sát đối thủ là khối chứng cứ tốt nhất của tài liệu: cụ thể, có số, có nguồn (Fireflies 100+ ngôn ngữ; Otter sáu ngôn ngữ, không có tiếng Việt; Meet Notes tám ngôn ngữ, không có tiếng Việt; Copilot đòi kèm license; ChatGPT Record giới hạn nền tảng). **Giữ toàn bộ.** Chỉ cột MeetMateAI là không bảo vệ được.

**Dán `Bảng 1` ở bước cuối cùng của giai đoạn sửa chương III** — các ô chỉ chốt được khi mọi tuyên bố khác đã có nhãn, nếu không `✓/○` sẽ bị đoán lại từ đầu.

Thay cột MeetMateAI duy nhất bằng hai cột, thêm hai dòng tiêu chí, hạ một dòng. Tám cột đối thủ giữ nguyên.

| Tiêu chí | Fireflies | Otter | Meet AI Notes | Copilot | Gemini | ChatGPT Record | bNote (Blaze) | Công cụ VN khác* | **MeetMateAI (demo T11/2026)** | **MeetMateAI (mục tiêu thiết kế)** |
|---|---|---|---|---|---|---|---|---|---|---|
| Transcript tiếng Việt | ✓ | ✗ | ✗ | ◐ | ◐ | ◐ | ✓ | ◐ | **✓** | ✓ |
| Hiểu hội thoại Việt–Anh đan xen | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ | ◐ | **✗** | ✓ |
| Research ngay trong cuộc họp | ◐ | ✗ | ✗ | ◐ | ◐ | ✓ | ✗ | ✗ | **✓** | ✓ |
| *Nguồn kèm lý do chọn, URL được kiểm chứng là có thật* | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| Fact-check có trạng thái bằng chứng | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **○** | ✓ |
| *Phát hiện nhu cầu thông tin không cần người hỏi* | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** | ✓ |
| Khai thác knowledge base riêng | ◐ | ◐ | ◐ | ◐ | ◐ | ✗ | ◐ | ◐ | **○** | ✓ |
| Tạo artifact (báo cáo, slide, bảng tính) | ◐ | ◐ | ◐ | ✓ | ✓ | ✗ | ◐ | ◐ | **○** | ✓ |
| Không phụ thuộc nền tảng họp | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | **◐** | ✓ |
| Giá khởi điểm (trả năm) | theo nhà cung cấp | theo nhà cung cấp | kèm Google Workspace | license riêng | kèm Google Workspace | kèm ChatGPT | theo nhà cung cấp | cần tra cứu | **Miễn phí trong giai đoạn thử nghiệm** | 199.000đ/tháng (giả định) |

Dòng in nghiêng là **hai dòng thêm mới**, vừa đúng vừa khác biệt:
- *"Nguồn kèm lý do chọn, URL được kiểm chứng là có thật"* — cột demo `✓`, kiểm chứng trực tiếp trong buổi demo. Đây là chỗ thay thế trung thực cho `✓` fact-check cũ.
- *"Phát hiện nhu cầu thông tin không cần người hỏi"* — hệ thống chạy liên tục và kích hoạt khi chủ đề đổi; các sản phẩm còn lại đều do người dùng khởi tạo. **Trước khi dán, đối chiếu lại bảy cột đối thủ với khảo sát ở chính mục 2.6** — nếu tài liệu đã ghi nhận sản phẩm nào tự đẩy thông tin mà không cần hỏi, sửa ô đó thành `◐`.

Ba sửa đổi khác trong `Bảng 1`:
- `Hiểu hội thoại Việt–Anh đan xen` cột demo là `✗`, **không** phải `◐`: model chưa tinh chỉnh và ta không đo code-switching ở demo.
- `Không phụ thuộc nền tảng họp` cột demo **hạ từ `✓` xuống `◐`** — bản demo chỉ Chrome, chỉ Meet web, một cuộc họp. Giữ `✓` ở cột mục tiêu (Zoom/Teams web nằm ở mục 2.7).
- **XÓA** mệnh đề footnote "Năng lực của MeetMateAI thể hiện mục tiêu thiết kế" — thừa sau khi đã tách cột, và để lại sẽ đọc như một disclaimer gắn vào bảng không còn cần nó. Thay bằng dòng chú thích ký hiệu ở PHẦN 0.2.

Thêm một câu vào đoạn "Một số điểm đáng chú ý", xử lý một mâu thuẫn sống mà hội đồng có thể chạm: `III.2.6` liệt kê bNote như đối thủ "(Blaze)" trong tài liệu tham chiếu (dòng 959), trong khi kiến trúc mới chạy trên API của Blaze.

> Một lưu ý về nguồn tham chiếu: bNote do Blaze phát hành, đồng thời Blaze cũng là nhà cung cấp dịch vụ nhận dạng giọng nói và mô hình ngôn ngữ mà bản demo của MeetMateAI sử dụng. Hai vai trò này không loại trừ nhau: MeetMateAI cạnh tranh với bNote ở trải nghiệm workflow, còn Blaze được lựa chọn ở tầng hạ tầng ngôn ngữ tiếng Việt trong nước.

Nói thẳng an toàn hơn nhiều so với hy vọng không ai để ý, và nó còn **tăng** hướng hạ tầng nội địa mà tiêu chí tác động của cuộc thi đánh giá cao.

> **Phạm vi bản demo:** một phần — cột demo của Bảng 1 chỉ chứa các ô kiểm chứng được trong buổi thử; ba ô ○ tương ứng ba lớp mục tiêu đã dán nhãn tại các mục 1.2, 1.3 và 1.6.

## 4.7 · Mục 2.7 — Lợi thế bền vững trước các nền tảng lớn — SIẾT

Đây là mục dự đoán đúng nhất về kiến trúc mới: đã viết Chrome extension, host bật là đủ, không cần mời bot vào phòng, Meet web trước rồi Zoom/Teams web. Giữ, và chỉnh bốn điểm.

**XÓA** mảng chữ lặp ở bullet nền tảng (dòng 315). Văn bản hiện tại là `…chỉ ở mức giới hạn.Không phụ thuộc nền tảng họp. Copilot gắn với Teams, Gemini gắn với Meet, trong khi nhiều startup và SME Việt Nam dùng song song Google Meet, Zoom, và họp trực tiếp.` — từ `Không phụ thuộc nền tảng họp.` trở đi là bản sao cũ của câu mở đoạn. Giữ câu thứ nhất, xóa phần còn lại.

**VIẾT LẠI** câu thứ hai của bullet "Workflow kiểm chứng chuyên biệt":

> MeetMateAI xác định chủ đề đang bàn, tự tìm nguồn, trình bày từng nguồn kèm lý do và để ngỏ phần kết luận cho cuộc họp. Đây là bài toán thiết kế sản phẩm và quy trình, không chỉ là một tính năng gọi API.

**SIẾT** bullet đầu: `bộ dữ liệu kiểm thử claim tiếng Việt` → `bộ dữ liệu kiểm thử hội thoại tiếng Việt và Việt–Anh`. Chưa tồn tại bộ claim nào để kiểm, và dòng benchmark ở V.3.3 đang là `CẦN ĐIỀN`.

**THÊM** một bullet, vì đây là lợi thế bền vững thật mà plan tạo ra và tài liệu đang bỏ sót:

> Không cần bot vào phòng và không cần quyền quản trị không gian họp. Người dùng chỉ cần bật tab Meet. Điều này loại bỏ hai rào cản triển khai lớn nhất với nhóm nhỏ: lời mời một thành viên lạ vào phòng, và quyền quản trị trên tài khoản Google của tổ chức.
>
> **Phạm vi bản demo:** một phần — các yếu tố nền tảng (tiện ích Chrome, không bot, Meet web) đã chạy; Zoom và Teams web là lớp mục tiêu.

## 4.8 · Mục 2.8 — ĐỔI TÊN thành "Độ bền dữ liệu, quyền riêng tư và các ràng buộc của bản demo" — THAY TOÀN BỘ

Over-claim lớn nhất chương. Ba cơ chế được tuyên bố — buffer IndexedDB, snapshot định kỳ, sổ truy vết bất biến — và ba chế độ Cloud / Hybrid / Riêng tư đều không tồn tại ở đâu cả; tài liệu offscreen giữ mọi thứ trong bộ nhớ, và mọi frame âm thanh đi trực tiếp tới `dev-api.blaze.vn`. Nếu hội đồng nói "mở sổ truy vết cho tôi xem", không có gì để mở.

Nhưng thiết kế suy giảm **thật** của plan lại thú vị và dễ demo hơn thứ tài liệu đang tuyên bố, nên đây là viết-lại-nâng-cấp chứ không thu hẹp. Sáu ràng buộc mà tài liệu đang im lặng được gom vào đây (theo quyết định bám form template, không mở mục `III.4` mới).

> **(a) Suy giảm có kiểm soát.** Cuộc họp vẫn tiếp diễn khi MeetMate gặp sự cố, và MeetMate không được phép làm hỏng cuộc họp. Ba quy tắc được áp dụng trong bản demo: lỗi của nhà cung cấp dịch vụ AI chỉ hiển thị ở popup, không bao giờ được gửi vào chat; khi micro không khả dụng, hệ thống tiếp tục chỉ với âm thanh của tab và nêu rõ giới hạn đó; khi nội dung trả về không hợp lệ — mô hình trả JSON hỏng, hoặc một URL bịa — lượt đó bị bỏ qua thay vì đoán bù.
>
> **(b) Âm thanh của cuộc họp là ưu tiên trên hết.** Khi một tab bị capture, Chrome mặc định cắt âm thanh khỏi người dùng. MeetMate phát lại âm thanh của tab qua một AudioContext riêng ở tốc độ lấy mẫu mặc định, còn pipeline xử lý dùng một AudioContext thứ hai ở 16 kHz. Tách hai context này là bắt buộc: dùng chung context 16 kHz sẽ làm hỏng chất lượng âm thanh mà người dùng phải nghe trong suốt cuộc họp.
>
> **(c) Truy vết bằng chat history.** Trong bản demo, sổ truy vết là chính chuỗi tin nhắn MeetMate trong chat của cuộc họp: mỗi tin mang tên nguồn, URL và lý do chọn. Người dùng kiểm tra lại được bằng cách mở nguồn. Sổ truy vết có cấu trúc — lưu câu gốc, mốc thời gian, phiên bản prompt, model, chế độ xử lý, và chỉ ghi thêm không sửa đè — là một phần của thiết kế mục tiêu.
>
> **(d) Ranh giới tin cậy mới: khóa API do người dùng cung cấp.** Bản demo không có backend riêng của MeetMateAI, nên mô hình quản lý khóa thay đổi so với thiết kế ban đầu. Người dùng tự nhập khóa Blaze và khóa Exa vào popup; khóa được lưu trong `chrome.storage.local`, không nằm trong mã nguồn, không nằm trong file build và không đi qua bất kỳ máy chủ nào của nhóm. Mỗi người dùng trả chi phí theo khóa của mình. Đây là một thay đổi kiến trúc có chủ đích, không phải cách lách một ràng buộc: ở thiết kế backend, repository của nhóm ghi rõ nguyên tắc "Never add these keys to browser code"; khi bỏ backend, nguyên tắc đó được thay bằng một mô hình khác có ràng buộc riêng, và ràng buộc đó được nêu đầy đủ dưới đây.
>
> Ba hệ quả được ghi nhận rõ. Thứ nhất, khóa lưu trong `chrome.storage.local` ở dạng văn bản trên đĩa của máy người dùng và chỉ được bảo vệ bởi cơ chế của hệ điều hành; thiết bị bị chiếm quyền điều khiển sẽ đọc được khóa. Thứ hai, dịch vụ nhận dạng giọng nói realtime xác thực bằng tham số `api_key` trên chuỗi URL WebSocket — do API của trình duyệt không cho phép tự đặt header bắt tay — nên khóa xuất hiện trong URL và có thể được ghi vào nhật ký mạng ở các thành phần trung gian; đây là lý do nhóm khuyến nghị dùng khóa ngắn hạn, thu hồi được, cấp riêng cho từng người dùng trong giai đoạn thử nghiệm. Thứ ba, khi thương mại hóa, mô hình SaaS ở mục IV.3.1 đòi hỏi khóa nằm phía nhà cung cấp dịch vụ; kiến trúc backend proxy là một hạng mục của lộ trình V.4 và làm thay đổi cả bảng chi phí V.2.2.
>
> **(e) Bề mặt quyền hạn của Manifest V3.** Tiện ích khai báo ba quyền `tabCapture`, `offscreen`, `storage` và ba host: `https://meet.google.com/*`, `https://dev-api.blaze.vn/*`, `https://api.exa.ai/*` (cộng tên miền của dịch vụ ngôn ngữ nếu khác). `tabCapture` cho phép nghe toàn bộ âm thanh của một tab; host permission trên `meet.google.com` cho phép script chạy trong trang họp. Hai quyền này cần về mặt chức năng nhưng cũng là rủi ro: bất kỳ phiên bản nào của tiện ích đều có thể đọc và ghi vào nội dung trang họp. Ba nguyên tắc được áp dụng: không có host permission nào ngoài ba tên miền trên; service worker không gọi mạng — chỉ tài liệu offscreen gọi, nhờ đó phạm vi dữ liệu rời khỏi máy được xác định tại đúng một chỗ trong mã nguồn; và mọi nội dung mô hình sinh ra đều được chèn vào trang dưới dạng văn bản thuần, không bao giờ dưới dạng HTML.
>
> **(f) Tính dễ vỡ của selector DOM.** MeetMate không dùng API công khai nào của Google Meet; nó gõ chữ vào khung chat của trang. Giao diện Meet do Google thay đổi không báo trước, vì vậy đây là rủi ro vận hành chứ không phải lỗi cài đặt. *Hướng nâng cấp:* mỗi phần tử — ô nhập, nút gửi, nút mở chat — có một **danh sách selector** được thử lần lượt, ưu tiên các thuộc tính không đổi theo ngôn ngữ giao diện. Khi Meet đổi cấu trúc DOM, nhóm phát hành một bản cập nhật chỉ chứa danh sách selector, không đụng tới pipeline; bộ test tự động và buổi thử hai người là cổng phát hiện sớm. *Hướng hạ cấp:* nếu không selector nào khớp, content script trả về trạng thái thất bại và popup báo "Không gửi được vào chat Meet"; kết quả vẫn hiển thị trong popup để người dùng sao chép và dán tay. MeetMate không bao giờ gửi thông báo lỗi vào chat của cuộc họp.
>
> **Quyền riêng tư ở phạm vi hiện tại.** Bản demo không có backend riêng của MeetMateAI: âm thanh và transcript đi trực tiếp từ trình duyệt tới nhà cung cấp dịch vụ ngôn ngữ, còn truy vấn tìm kiếm đi trực tiếp tới công cụ tìm nguồn. Dữ liệu không được lưu lại phía MeetMate. Ba chế độ Cloud / Hybrid / Riêng tư mô tả trong thiết kế mục tiêu — trong đó Hybrid chạy nhận dạng trên máy và Riêng tư giữ toàn bộ xử lý trong Chrome — chưa thuộc phạm vi bản demo. Giới hạn đã biết của chúng: tìm nguồn trên web bắt buộc gửi truy vấn ra ngoài, chưa có số đo độ chính xác tiếng Việt cho model chạy local, và máy người dùng cần đủ cấu hình.
>
> **Phạm vi bản demo:** một phần — cơ chế suy giảm, phát lại âm thanh tab và quản lý khóa ở popup đã chạy; buffer IndexedDB, snapshot định kỳ, sổ truy vết có cấu trúc và ba chế độ riêng tư là lớp mục tiêu.

---

# PHẦN 5 — III.3, kiến trúc và prototype

## 5.1 · III.3.1 Kiến trúc hệ thống

**THAY** câu ở dòng 327 ("ba nguồn đầu vào và năm lớp xử lý") bằng:

> Kiến trúc được trình bày dưới đây là kiến trúc của bản demo tháng 11/2026: một tiện ích mở rộng Chrome theo Manifest V3, chạy hoàn toàn trong trình duyệt của người dùng, không có bot vào phòng và không có backend riêng. Mô hình năm lớp của thiết kế tổng thể được giữ lại ở Bảng 4 kèm trạng thái triển khai của từng lớp, để người đọc thấy rõ khoảng cách giữa bản demo và mục tiêu dài hạn.

### `Bảng 2`. Bốn bối cảnh xử lý và giao thức message

| Bối cảnh | File | Vai trò | Nhận | Gửi | Gọi dịch vụ AI |
|---|---|---|---|---|---|
| Popup | `popup.html`, `popup.ts` | Nhập khóa API, nút Bắt đầu/Dừng, hiển thị trạng thái | `meetmate.status` (qua `chrome.storage.session`) | `meetmate.start {tabId, streamId}`, `meetmate.stop` | Không |
| Service worker nền | `background.ts` | Vòng đời của offscreen document, chuyển tin nhắn tới tab, lưu trạng thái phiên | `meetmate.start`, `meetmate.stop`, `meetmate.post`, `meetmate.status` | `meetmate.offscreen.start {streamId, blazeApiKey, exaApiKey}`, `meetmate.offscreen.stop`, `chrome.tabs.sendMessage` | Không |
| Offscreen document | `offscreen.html`, `offscreen.ts` và các module `audio`, `pcm-worklet`, `pcm`, `stt`, `llm`, `transcript`, `topic`, `research`, `session` | Toàn bộ pipeline: ghi âm, phiên âm, cửa sổ transcript, tách chủ đề, tìm nguồn, viết lý do, điều phối | `meetmate.offscreen.start`, `meetmate.offscreen.stop` | `meetmate.post {text}`, `meetmate.status {status}` | **Có** — Blaze STT (WebSocket), Blaze LLM (HTTPS), Exa (HTTPS) |
| Content script | `content/content.ts`, `content/selectors.ts` | Gõ kết quả vào khung chat Google Meet | `meetmate.post` | `{ok: true/false}` | Không |
| Trang quyền micro | `mic-permission.html`, `mic-permission.ts` | Xin quyền micro một lần cho tiện ích ở cấp extension | — | — | Không |

Đoạn dưới bảng — **đây mới là phần R&D đáng điểm Tính đổi mới cao nhất trong chương**, vì nó trả lời một câu hỏi mà mọi người từng đọc Manifest V3 đều gặp:

> Việc chia bốn bối cảnh không phải lựa chọn tùy tiện mà do ràng buộc của Manifest V3. Service worker của MV3 bị dừng sau vài chục giây không hoạt động và không có quyền truy cập `MediaStream` hay `AudioWorklet`, nên nó không thể giữ một pipeline âm thanh chạy liên tục trong 45 phút. Offscreen document là cơ chế chính thức duy nhất cho phép một tiện ích mở rộng giữ các API phương tiện sống nền lâu dài. Service worker vì vậy chỉ làm hai việc có tuổi thọ ngắn: tạo và đóng offscreen document, và chuyển một chuỗi ký tự tới tab. Toàn bộ logic AI nằm ở một nơi duy nhất.

### `Bảng 3`. Chín bước của pipeline

| # | Bước | Module | Đầu vào | Đầu ra | Ngưỡng / ràng buộc |
|---|---|---|---|---|---|
| 1 | Ghi âm và trộn | `audio.ts` | Stream của tab (`chromeMediaSource: 'tab'`) + micro | Float32 đã trộn, mono | Âm thanh tab được phát lại qua AudioContext riêng; micro bật `echoCancellation`, `noiseSuppression` |
| 2 | Lấy mẫu và chia frame | `pcm-worklet.ts`, `pcm.ts` | Float32 | PCM s16le, 16 kHz, 1.600 mẫu/frame | ~10 frame/giây, mỗi frame 100 ms |
| 3 | Phiên âm | `stt.ts` | Frame nhị phân | Câu đã chốt (`transcript.text.done`) | Model `blaze-stt-1.5-realtime`, `language=vi`; câu đang soạn bị bỏ; kết thúc phiên bằng `input_audio.done` |
| 4 | Cửa sổ transcript | `transcript.ts` | Câu đã chốt | Văn bản 120 giây gần nhất | Câu trùng — sau chuẩn hóa chữ thường và gộp khoảng trắng — trong 5 giây bị loại và không tính vào số câu mới |
| 5 | Tách chủ đề | `topic.ts` + `llm.ts` | Chủ đề hiện tại + transcript | `{topic, keywords ≤ 8, query, changed}` | Chỉ chạy khi có ≥ 3 câu mới, đã qua ≥ 15 giây, và không có lượt tách nào đang chạy |
| 6 | Tìm nguồn | `research.ts` + Exa | `query` | Tối đa 4 nguồn `{title, url, text}` | Timeout 30 s; không gọi mô hình nếu không có nguồn nào |
| 7 | Viết lý do và lọc URL | `research.ts` + `llm.ts` | Chủ đề + từng nguồn (văn bản cắt còn 1.500 ký tự) | `{summary ≤ 300 ký tự, sources: [{url, reason ≤ 200 ký tự}]}` | URL ngoài tập nguồn bị loại; `title` lấy từ kết quả tìm nguồn, không lấy từ mô hình |
| 8 | Điều phối | `session.ts` | Kết quả bước 5–7 | Hàng đợi tin nhắn | Chủ đề đổi → hủy lượt đang chạy; chủ đề rỗng → không gửi; lỗi → chỉ báo popup |
| 9 | Gửi chat | `content/content.ts` | `text` | Tin `MeetMate: …` trong chat Meet | ≤ 450 ký tự/tin; URL không bao giờ bị cắt; các tin gửi cách nhau 600 ms |

Ghi chú cho hàng 9: ngưỡng 450 ký tự không phải số chọn đẹp, mà là **giới hạn độ dài một tin của chat Meet đo trực tiếp trong buổi thử** (gửi lần lượt chuỗi 300, 500 và 1.000 ký tự, lấy giá trị dài nhất gửi trọn vẹn rồi trừ 20 ký tự dự phòng). Đây là kiểu chi tiết chứng minh hệ thống đã chạy thật.

### `Bảng 4`. Mô hình năm lớp và trạng thái triển khai

Bảng này là **chỗ chứa trung thực của các lớp bị bỏ**, và cố ý đứng thứ tư chứ không đứng đầu.

| Lớp xử lý (mô hình thiết kế) | Vai trò | Bản demo hiện tại | Trạng thái |
|---|---|---|---|
| Thu nhận & phiên âm | Thu âm thanh cuộc họp, chuyển thành văn bản theo thời gian thực | Blaze STT realtime 16 kHz, tiếng Việt, hai nguồn âm | **Đã triển khai** |
| Hiểu hội thoại | Nhận diện nhu cầu thông tin trong hội thoại | Tách chủ đề trên cửa sổ transcript; chưa phân loại câu hỏi/nhận định/giả định/quyết định | **Một phần** |
| Tri thức người dùng | Chia đoạn, tạo embedding, truy xuất theo ngữ nghĩa tài liệu đã tải | Chưa có | **Lớp mục tiêu — chưa thuộc phạm vi demo** |
| Nghiên cứu & kiểm chứng | Điều phối truy vấn, so sánh nguồn, gán trạng thái bằng chứng | Exa + Blaze LLM viết lý do, kiểm chứng URL bắt buộc; chưa có trạng thái bằng chứng bốn mức | **Một phần** |
| Tạo đầu ra | Sinh research brief, báo cáo, slide, bảng tính | Đầu ra là chuỗi tin nhắn có cấu trúc trong chat | **Lớp mục tiêu — chưa thuộc phạm vi demo** |
| Giao diện | Nơi người dùng nhìn thấy kết quả | Popup của tiện ích + khung chat Meet; không có web workspace | **Đã triển khai (dạng chat)** |

Thay note "các ô tô vàng là công nghệ dự kiến, nhóm cập nhật theo stack thực tế" bằng:

> Ghi chú: các ô ở cột "Bản demo hiện tại" mô tả đúng hệ thống sẽ được chạy trước hội đồng. Ô "Chưa có" và "Một phần" được theo dõi tại mục V.4.

**BỎ HẲN ô `phân biệt người nói`** ở hàng 1, thay bằng `thu âm thanh của tab và micro, phát lại âm thanh tab cho người dùng`. Đây là tuyên bố duy nhất trong chương đáng xóa hẳn thay vì dán nhãn: âm thanh tới tiện ích đã là stream trộn nên tách giọng là bất khả thi về tín hiệu, và mục 2.8 vốn đã thừa nhận giới hạn của việc gán người nói. Giữ lại sẽ tạo ra một mâu thuẫn nội chương mà hội đồng bắt được trong một phút.

**BỎ HẲN** ô `Web app (React/Next.js) + backend API` (đã thay bằng hàng "Giao diện" ở trên). **BỎ HẲN** `Vector database (ví dụ pgvector/Qdrant)` và `Thư viện xuất DOCX/PPTX/XLSX` **với tư cách cam kết công nghệ**; chúng chỉ xuất hiện lại bên trong các ô "Lớp mục tiêu", trung thực vì chưa có quyết định stack nào cho chúng.

### `Hình 2` (mới) — caption và mô tả vẽ

> **Hình 2.** Kiến trúc tiện ích mở rộng MeetMate theo Manifest V3: bốn bối cảnh xử lý và luồng message một chiều.

Vẽ bốn swimlane dọc từ trái sang phải, cộng một dải dịch vụ ngoài ở đáy:

- **Lane 1 — Popup:** hộp `Nhập khóa Blaze / Exa` → `chrome.storage.local`; hộp `Nút Bắt đầu` → `chrome.tabCapture.getMediaStreamId`; mũi tên nhãn `meetmate.start {tabId, streamId}`.
- **Lane 2 — Service worker nền:** hộp `Tạo / đóng offscreen document`; hộp `Lưu trạng thái` → `chrome.storage.session`; hai mũi tên vào, hai mũi tên ra.
- **Lane 3 — Offscreen document** (vẽ rộng nhất, ~50% bề ngang hình): chuỗi chín hộp nằm ngang khớp `Bảng 3`: `AudioWorklet 16 kHz` → `Blaze STT` → `Cửa sổ transcript 120 s` → `Tách chủ đề (Blaze LLM)` → `Exa` → `Lý do chọn nguồn (Blaze LLM)` → `Lọc URL` → `Cắt tin ≤ 450 ký tự`. Thêm mũi tên hồi tiếp nét đứt từ `Tách chủ đề` về `Exa`, nhãn `đổi chủ đề → hủy lượt đang chạy`.
- **Lane 4 — Content script:** hộp `Ô nhập chat Meet` → `execCommand('insertText')` + Enter; hộp `hàng đợi 600 ms/tin`.
- **Dải đáy — Dịch vụ ngoài:** ba hộp kèm nhãn giao thức: `Blaze STT — wss://dev-api.blaze.vn/v1/audio/transcriptions/realtime`, `Blaze LLM — HTTPS`, `Exa — https://api.exa.ai/search`. Nối chúng **chỉ** với Lane 3 — đó chính xác là điều hình phải nói được: không bối cảnh nào khác chạm mạng.
- Hai chú thích xám: `Bot không vào phòng họp` ở Lane 1, và `Không có backend MeetMate` dưới dải dịch vụ.

Toàn bộ nhãn trong ảnh là tiếng Việt, trừ tên giao thức và identifier message.

## 5.2 · III.3.2 Luồng end-to-end

**XÓA** khỏi khung cảnh cũ chi tiết "đã tải báo cáo khảo sát" — không có kho tri thức nên chi tiết đó không tồn tại được. **THAY** bằng:

> **Tình huống minh họa:** một nhóm startup năm người họp 45 phút trên Google Meet để quyết định giá cho sản phẩm mới. Một người dùng MeetMate trong tab Meet, đeo tai nghe. Bốn người còn lại không cài gì cả.

### `Bảng 5`. Ví dụ luồng xử lý của MeetMate trong một cuộc họp 45 phút

Mọi mốc thời gian dưới đây đều khớp ngưỡng thật ở `Bảng 3`: tách chủ đề cần ≥ 3 câu mới và ≥ 15 giây kể từ lần kiểm tra trước; tiêu chí nghiệm thu của buổi thử là "tin đầu tiên xuất hiện trong vòng khoảng 30 giây sau khi chủ đề rõ ràng".

| Thời điểm | Diễn biến cuộc họp | MeetMate xử lý |
|---|---|---|
| 00:20 | Người dùng bấm icon MeetMate trong tab Meet, nhập hai khóa, bấm **Bắt đầu** | Popup gọi `chrome.tabCapture.getMediaStreamId`, gửi `meetmate.start`; service worker tạo offscreen document; popup hiện "Đang chạy". Không có thành viên mới vào phòng. |
| 03:10 | Ba câu liên tiếp về mức giá cho SME, cách nhau hơn 15 giây kể từ lần kiểm tra trước | `topic.ts` gọi Blaze LLM trên cửa sổ transcript, nhận về `{topic: "Mức giá gói cho SME Việt Nam", changed: true, query: "bảng giá phần mềm cho SME Việt Nam 2026"}`. |
| 03:31 | Cuộc họp vẫn tiếp tục, không ai dừng lại chờ | Exa trả bốn nguồn; Blaze LLM viết lý do cho từng nguồn; năm tin được gửi vào chat trong khoảng 2,4 giây, cách nhau 600 ms: `MeetMate: Chủ đề: Mức giá gói cho SME Việt Nam` kèm tóm tắt 300 ký tự, rồi `MeetMate: [1/4]` … `[4/4]`. |
| 06:40 | Hai người nói chuyện bóng đá khoảng một phút | Chủ đề trả về rỗng; không có truy vấn nào được gửi, không có tin nào vào chat. |
| 11:05 | Một thành viên bật loa ngoài; câu "Tỷ lệ chuyển đổi bao nhiêu?" lọt vào micro hai lần | Sau chuẩn hóa, câu thứ hai bị cửa sổ transcript bỏ trong vòng 5 giây; không bị tính là câu mới, không nhân đôi tin nhắn. |
| 14:20 | "Hay mình thử mô hình freemium xem sao" — chủ đề đổi khi bộ tin của chủ đề trước còn đang tìm nguồn | Bộ điều phối hủy lượt research đang chạy; kết quả cũ trả về muộn bị loại; chỉ kết quả của chủ đề mới được gửi. |
| 21:30 | "Đối thủ X có bản tiếng Việt chưa?" | Tin chat có dạng `MeetMate: [1/4] <tiêu đề lấy từ kết quả tìm nguồn>` / `https://…` / `Vì sao chọn: <lý do ≤ 200 ký tự>`. Một URL do mô hình thêm vào, không có trong kết quả Exa, bị loại trước khi gửi. |
| 38:15 | Người dùng bấm **Dừng** | `meetmate.stop` → offscreen nhận `meetmate.offscreen.stop`; pipeline hủy mọi lượt đang chạy, gửi `input_audio.done` để đóng phiên nhận dạng, dừng pipeline âm thanh. Không còn tin mới. |

**BỎ HẲN năm dòng của bảng cũ:** 05:12 (Partially Supported từ báo cáo khảo sát đã tải — không có KB, không có trạng thái bằng chứng), 18:05 (ghi quyết định), 24:30 (treo giả định), 31:00 (sinh bảng tính), 45:00 (xuất research brief). Có thể giữ lại **câu nói** ở 18:05 nếu muốn một dòng đậm chất Việt, nhưng chỉ với tư cách một **lượt đổi chủ đề**, không tuyên bố hệ thống ghi nhận điều gì.

### `Bảng 6`. Hành vi của MeetMate khi gặp sự cố trong cùng cuộc họp

Bảng thứ hai này là thứ khiến mục đọc như engineering chứ không phải marketing.

| Thời điểm | Diễn biến | MeetMate xử lý |
|---|---|---|
| 09:50 | Chrome từ chối quyền micro (người dùng bấm Không) | Popup báo "Không dùng được micro — chỉ nghe âm thanh từ người khác"; pipeline vẫn chạy với âm thanh tab. |
| 26:00 | Nhà cung cấp nhận dạng báo hết credit | Popup hiện `Blaze STT: Insufficient credits`; **không** có tin nào được gửi vào chat; người dùng vẫn nghe cuộc họp bình thường. |
| 33:40 | Mô hình trả kết quả bọc trong khối ```json | Bộ phân tích trích phần từ `{` đầu tới `}` cuối và vẫn đọc được; lượt không bị mất. |
| 41:20 | Meet cập nhật giao diện, content script không tìm thấy ô nhập | Popup báo "Không gửi được vào chat Meet"; kết quả vẫn hiển thị trong popup để sao chép tay. |

## 5.3 · III.3.3 Giao diện prototype

### Những gì XÓA

- **XÓA toàn bộ bảng bảy-module trạng thái** (dòng 395–428). Mọi ô là `Đã chạy / Đang phát triển` và mọi note là `Nhóm xác nhận`. Đó là tự chứng nhận không có nội dung phân biệt; một người đọc bảng này chỉ kết luận được rằng nhóm chưa quyết định mình đã build gì. Nó **tệ hơn không có bảng**.
- **XÓA** dòng placeholder `[CHÈN ẢNH CHỤP MÀN HÌNH PROTOTYPE: màn hình meeting workspace, thẻ claim kèm trạng thái bằng chứng, artifact được tạo]` — nó mô tả ba thứ sẽ không tồn tại, và một ngoặc vuông chỉ dẫn còn sót trong tài liệu đã nộp đọc là chưa xong ngay dưới tiêu chí 20% đòi minh chứng Prototype/MVP.

### `Bảng 7`. Trạng thái triển khai theo hạng mục kiểm chứng

Nguyên tắc thiết kế của bảng: thay `Nhóm xác nhận` bằng cột **Căn cứ kiểm chứng** trỏ vào **tên file test hoặc lệnh chạy thật** mà một giám khảo có thể yêu cầu chạy, và cột **Bằng chứng** trỏ vào một hình. Đây chuyển một tuyên bố không kiểm chứng được thành một tuyên bố kiểm chứng được — sửa đổi giá trị nhất trong chương đối với tiêu chí 20%.

| Hạng mục | Trạng thái | Căn cứ kiểm chứng | Bằng chứng |
|---|---|---|---|
| Khung tiện ích: manifest MV3, build, popup, quyền micro, service worker, offscreen | Đã kiểm thử thủ công | `npm run extension:build`; Load unpacked tại `chrome://extensions` | Hình 6 |
| Ghi âm tab + micro, phát lại âm thanh tab, frame PCM 16 kHz | Đã kiểm thử tự động + thủ công | `vitest extension/src/pcm.test.ts`; đo ~10 frame/giây trong phiên Meet thật | Hình 4 |
| Client nhận dạng giọng nói realtime, xử lý câu chốt và lỗi | Đã kiểm thử tự động | `vitest extension/src/stt.test.ts` (7 ca: URL kết nối, `session.created`, `transcript.text.done`, câu đang soạn, lỗi, đóng socket, `input_audio.done`) | — |
| Client mô hình ngôn ngữ và phân tích kết quả | Đã kiểm thử tự động | `vitest extension/src/llm.test.ts` (HTTP 200, HTTP 402, header `Authorization`) | — |
| Cửa sổ transcript và khử câu trùng | Đã kiểm thử tự động | `vitest extension/src/transcript.test.ts` (trùng ở 3 s bị loại, trùng ở 9 s được nhận, câu hết cửa sổ 120 s) | Hình 5 |
| Tách chủ đề và đọc kết quả JSON | Đã kiểm thử tự động | `vitest extension/src/topic.test.ts` (JSON thuần, JSON bọc khối ```json, chủ đề rỗng, thiếu `query`, cắt `keywords` còn 8) | — |
| Tìm nguồn, viết lý do, loại URL bịa, cắt tin theo độ dài | Đã kiểm thử tự động | `vitest extension/src/research.test.ts` (URL ngoài danh sách bị loại, `title` lấy từ kết quả tìm nguồn, mọi tin ≤ ngưỡng, URL không bị cắt) | Hình 5 |
| Điều phối phiên: đổi chủ đề thì hủy research cũ | Đã kiểm thử tự động | `vitest extension/src/session.test.ts` (8 ca, gồm "kết quả trả về muộn của chủ đề cũ không được gửi") | — |
| Gửi chat Meet và chạy thử thật hai người | Đã kiểm thử thủ công | Hai người, một chủ đề AI rồi đổi chủ đề, một đoạn nói chuyện phiếm; chuỗi tin `MeetMate:` hiện trong chat | Hình 3, Hình 5 |
| **Chưa triển khai:** truy xuất tài liệu người dùng; trạng thái bằng chứng bốn mức; xuất artifact; lưu phiên bền vững; gán người nói | Chưa | Được xác định tại mục V.4 | — |

Hàng cuối làm việc quan trọng: đó là **chỗ duy nhất** trong tài liệu mà danh sách cái-*không*-có xuất hiện trọn vẹn trong một dòng, và chính nó làm mọi `✓` ở các chỗ khác đáng tin.

**Cảnh báo trước khi dán:** các hàng `Đã kiểm thử tự động` chỉ hợp lệ **sau khi** extension chạy thật và `vitest` xanh. Tính tới 02/11/2026, repo **chưa có dòng code extension nào** và chưa tồn tại file test nào. Nếu tài liệu nộp trước khi hoàn tất, hoặc đổi nhãn cột thành `Kế hoạch kiểm chứng`, hoặc để trống cột Trạng thái — đừng nộp bảng này nguyên vẹn khi chưa chạy. Tương tự, dịch vụ Blaze chưa được cài đặt ở đâu trong repo: đường nhận dạng đang chạy là OpenAI realtime qua backend LiveKit, không phải Blaze 16 kHz trong trình duyệt.

### Bảy ảnh cần chụp, theo thứ tự chụp

| Hình | Nội dung chụp | Caption tiếng Việt | Ghi chú khi chụp |
|---|---|---|---|
| **Hình 3** | Toàn cửa sổ Chrome: khung Meet ở giữa, khung chat bên phải có chuỗi tin `MeetMate:`, popup MeetMate mở ở góc trên phải | Hình 3. MeetMate trong một cuộc họp Google Meet thật | Chụp trong buổi thử hai người. **Đây là bằng chứng mạnh nhất của cả chương** — một ảnh trả lời ba câu hỏi ("chạy thật chưa", "kết quả trông ra sao", "ai đứng tên tin nhắn"). |
| **Hình 4** | Popup ở trạng thái "Đang chạy": hai ô khóa đã điền (che một phần), nút **Dừng**, dòng trạng thái | Hình 4. Popup MeetMate trong phiên đang chạy | — |
| **Hình 5** | Crop khung chat: một tin `MeetMate: Chủ đề: …` và ba tin `MeetMate: [i/4] …` có `Vì sao chọn:` | Hình 5. Chuỗi tin nhắn kết quả trong chat của cuộc họp | Chọn chủ đề có link bấm được thật; để thấy cả tên người gửi là tên của chính người dùng. |
| **Hình 6** | `chrome://extensions`: hàng MeetMate 0.1.0 và nút Load unpacked | Hình 6. Cài đặt tiện ích bằng Load unpacked | Chứng minh "cài trong năm phút, không cần tài khoản, không cần backend". |
| **Hình 7** | Dialog Chrome hỏi quyền micro trên trang quyền | Hình 7. Xin quyền micro một lần ở cấp tiện ích | — |
| **Hình 8** | Cặp hai khung: popup hiện `Blaze STT: Insufficient credits`, khung chat Meet bên cạnh **không có** tin lỗi nào | Hình 8. Suy giảm có kiểm soát: lỗi chỉ hiện ở popup, chat không bị nhiễu | Tương phản chính là nội dung ảnh — chụp hai khung làm một ảnh. |
| **Hình 9** *(tùy chọn)* | Terminal chạy `npm test` với các test file PASS | Hình 9. Kết quả bộ kiểm thử tự động | **Chỉ đưa nếu toàn bộ test xanh.** |

### Khối cuối của III.3.3 — Ràng buộc nền tảng, âm học và pháp lý

Không mở mục `III.4` mới (bám form template); phần ràng buộc còn lại đặt ở cuối III.3.3 dưới dạng một khối đoạn văn, sau `Bảng 7`.

> **Ràng buộc nền tảng.** Bản demo chạy trên Chrome từ phiên bản 116 trở lên, chỉ với Google Meet mở trong tab trình duyệt; ứng dụng Zoom hoặc Teams cài trên máy chưa được hỗ trợ. Mỗi lượt chỉ phục vụ một cuộc họp. Hệ thống không phân biệt người nói: âm thanh của tab đã được trộn trước khi tới MeetMate nên việc tách giọng là bất khả thi ở kiến trúc này, không phải một tính năng còn thiếu.
>
> **Âm vang và khuyến nghị tai nghe.** Khi một thành viên bật loa ngoài, giọng của những người khác lọt lại vào micro của người dùng và cùng một câu xuất hiện hai lần trong nguồn âm. Nếu không xử lý, hệ thống tính sai số câu mới và có thể gửi trùng kết quả. MeetMate chuẩn hóa câu — chuyển chữ thường, gộp khoảng trắng — và bỏ câu trùng trong vòng 5 giây. Biện pháp bổ sung được khuyến nghị cả khi demo lẫn khi triển khai: người vận hành đeo tai nghe.
>
> **Sự đồng ý.** MeetMate thu âm thanh của tab — tức toàn bộ nội dung âm thanh của cuộc họp — và micro của người dùng, rồi gửi tới nhà cung cấp dịch vụ ngôn ngữ. Trước khi bật, người vận hành phải thông báo và được những người tham gia đồng ý, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP đã được viện dẫn ở mục V.6. Ở bản demo, việc thông báo này do người vận hành thực hiện; một cơ chế thông báo trong sản phẩm là hạng mục của V.4.
>
> **Danh tính tin nhắn.** Tin nhắn được gõ vào chat dưới tên của chính người dùng, không phải một tài khoản bot. Đây là lựa chọn có chủ đích — nó loại bỏ rào cản mời bot vào phòng — nhưng cũng là trách nhiệm: người dùng phải kiểm soát được nội dung hệ thống gửi. Hai cơ chế bảo đảm: mọi tin bắt đầu bằng `MeetMate: ` để người đọc phân biệt được với người thật, và hệ thống chỉ gửi nguồn kèm lý do chứ không gửi kết luận.
>
> **Điều khoản dịch vụ.** Tự động hóa tương tác với Google Meet chưa được mô tả trong tài liệu công khai của nền tảng này. Nhóm xem đây là rủi ro cần xác minh trước khi thương mại hóa, và là lý do bản demo chỉ chạy trong các cuộc họp do chính nhóm tổ chức với sự đồng ý của người tham gia.
>
> **Giao diện người dùng của bản demo.** Toàn bộ tương tác của người dùng nằm trong popup của tiện ích và khung chat Meet. Không có web workspace trong phạm vi demo; nhóm có xây dựng một bản mô phỏng giao diện của một sản phẩm cùng phân khúc để khảo sát các mẫu tương tác (phiên họp trực tiếp, hàng đợi phản hồi, tùy chọn định dạng đầu ra). Bản mô phỏng dùng dữ liệu mẫu, không đấu nối với luồng AI, và **không phải prototype của MeetMateAI**, nên không xuất hiện trong mục này.

Ghi chú cho việc chọn ảnh: **không** đưa dashboard Next.js vào III.3.3 với ba lý do — sai domain (không có gì trong đó là meeting research), sai provenance (layout là capture từ UI của đối thủ; xem `DESIGN.md` và `2026-11-02-frontend-conflict-register.md`), và tự mâu thuẫn với kiến trúc vừa tuyên bố ở III.3.1 ("không có web workspace").

---

# PHẦN 6 — Ripple trong chương V

## 6.1 · V.2.2 bảng chi phí

- **SỬA** giả định "Lớp nghe liên tục 90 lần gọi (mỗi 30 giây)" thành: `Số lần tách chủ đề = số đoạn có ≥ 3 câu mới và cách nhau ≥ 15 giây`. Cận trên lý thuyết cho cuộc 45 phút là 180 lần; **điền số thực đo sau buổi thử**, đừng viết một số chưa đo vào bảng chi phí.
- **Đánh dấu** hai dòng `Tạo artifact` và `Embedding, lưu trữ` là `Lớp mục tiêu — chưa phát sinh trong bản demo`, tính lại hai cột tổng và thêm footnote.
- **THÊM** một dòng `Nhận dạng giọng nói realtime (Blaze)` với giá theo phút điền sau khi đo.

## 6.2 · V.3.2 — khối chỉ số của bản demo (thay cho các dòng đo classifier và UI không tồn tại)

Bốn dòng in đậm là **bất biến**, không phải trung bình — chúng là quân bài mạnh nhất của tài liệu, vì một tính chất đã có test thì không phản biện được.

| Chỉ số | Định nghĩa | Cách đo | Mục tiêu |
|---|---|---|---|
| Độ trễ chủ đề → tin nhắn | Từ câu chốt cuối cùng của cụm câu tạo nên chủ đề đến tin `MeetMate: Chủ đề:` đầu tiên xuất hiện trong chat | log mốc trong offscreen và timestamp của tin chat; báo cáo p50/p90 | p50 ≤ 20 s; p90 ≤ 30 s |
| **Tỷ lệ nguồn được kiểm chứng** | Tỷ lệ URL gửi vào chat có mặt trong kết quả tìm nguồn của đúng lượt đó | đối chiếu log phân tích kết quả với log gửi tin | **100%** — bất biến, có test |
| Tỷ lệ URL bị loại | Số URL do mô hình đề xuất nhưng không có trong kết quả tìm nguồn, trên tổng số URL mô hình đề xuất | đếm trong bước lọc URL | ghi nhận thực đo; ≤ 10% |
| Độ chính xác khử câu trùng | Số câu bị bỏ là câu trùng thật / tổng số câu bị bỏ | gán nhãn thủ công transcript của hai buổi thử | ≥ 95% |
| Tỷ lệ câu trùng bị lọt | Số câu trùng vẫn đi vào cửa sổ transcript / tổng số câu trùng | như trên | ≤ 5% |
| **Tỷ lệ spam khi nói chuyện phiếm** | Số tin được gửi trong các đoạn hội thoại không có chủ đề | test điều phối + quan sát hai buổi thử có chủ ý nói chuyện phiếm | **0** |
| **Tính toàn vẹn độ dài tin** | Tỷ lệ tin có độ dài ≤ ngưỡng **và** URL còn nguyên | test định dạng tin + đo trên chat thật | **100%** |
| **Tỷ lệ hủy đúng** | Số tin của chủ đề đã bị thay thế vẫn được gửi | test điều phối + log phiên thật | **0** |
| Tỷ lệ gửi tin thành công | Số tin content script báo thành công / số tin yêu cầu gửi | log service worker | ≥ 95% |
| Chi phí dịch vụ AI mỗi cuộc họp | Credit tiêu thụ cho một cuộc họp 45 phút | bảng kê nhà cung cấp đối chiếu log phiên | điền thực đo; thay giả định 1 USD ở V.2.3 |
| Tỷ lệ thời lượng người dùng vẫn nghe được cuộc họp | Tỷ lệ thời gian phiên mà âm thanh tab được phát lại liên tục | quan sát + đo khoảng lặng trong buổi thử | ≥ 99%, không khoảng lặng nào quá 2 s |
| Số lần người dùng phải can thiệp | Số lần phải gửi tay hoặc nhập lại khóa trong một buổi | ghi chú của người vận hành | ghi nhận thực đo |

Thêm heading dời nguyên văn đoạn durability (dòng 787) vào dưới đó: `Chỉ số mục tiêu cho các lớp chưa thuộc phạm vi demo` — các dòng "giữ transcript khi backend lỗi ≥95%", "khôi phục phiên sau khi tắt Chrome ≥95%", "dữ liệu mất ≤30 giây", "chênh lệch WER local/cloud ≤5 điểm", "truy vấn Hybrid được ẩn danh đúng ≥98%" đều đo IndexedDB, local STT và ẩn danh, tức là những thứ chưa build.

Quy ước viết: "độ trễ" ở mọi chỗ trong bảng này là `chủ đề → tin nhắn`, **không bao giờ** `câu nói → phản hồi` — hệ thống không phản hồi từng phát biểu.

## 6.3 · V.3.3 bảng kết quả

Thay hai dòng `CẦN ĐIỀN` (`Precision/recall phát hiện claim`, `Độ chính xác trạng thái bằng chứng`) bằng các dòng đo được thật:

> Tỷ lệ URL được kiểm chứng (kỳ vọng 100%) · Độ trễ p50/p90 chủ đề → tin nhắn · Độ chính xác khử câu trùng · Số tin gửi trong đoạn nói chuyện phiếm (kỳ vọng 0) · Chi phí dịch vụ AI đo thực tế trên mỗi cuộc họp

Chỉ giữ `CẦN ĐIỀN` ở những dòng nhóm sẽ thật sự có số trước ngày nộp.

## 6.4 · V.4 lộ trình — chỗ nội dung "di chuyển" đáp xuống

**SỬA** gate của dòng "Prototype hardening T11–T12/2026" (đang đòi "Độ chính xác kiểm chứng ≥ 70%" — chỉ số bản build hiện tại không sản sinh được) thành:

> Chuỗi tin MeetMate xuất hiện trong chat của một cuộc họp thật có hai người; 100% URL đối chiếu được với kết quả tìm nguồn; đã đo chi phí trên mỗi cuộc họp từ số thực tế.

**THÊM hai dòng trước Pilot:**

> Kho tri thức người dùng (RAG) — điều kiện chuyển giai đoạn: truy xuất đúng đoạn tài liệu nội bộ ≥ 80% trên bộ câu hỏi có đáp án.
>
> Trạng thái bằng chứng bốn mức — điều kiện: độ chính xác trạng thái ≥ 70% trên bộ nhận định đã gán nhãn.

Hai dòng này là lý do "dời xuống lộ trình" không phải cách nói giảm của "xóa": mỗi lớp bị bỏ khỏi thì hiện tại đều có một gate định lượng mang tên nó.

## 6.5 · V.6 bảng rủi ro

- **SỬA** mitigation của dòng "Kiểm chứng sai (hallucination)": item đầu thành `bắt buộc mọi URL có mặt trong tập kết quả tìm nguồn, loại nguồn không đối chiếu được, không kết luận thay nhóm`. Giữ các item còn lại.
- **SỬA** mitigation của dòng "Nhận dạng giọng nói kém": PhoWhisper không còn là fallback của bản demo; diễn đạt thành *tinh chỉnh model trên dữ liệu họp của nhóm (V.4)*, giữ trích dẫn PhoWhisper như cơ sở nghiên cứu.
- **THÊM** một dòng: `Giao diện Google Meet thay đổi làm hỏng việc gửi tin` — mitigation `danh sách selector dự phòng, báo lỗi ở popup, cho phép sao chép tay`.

## 6.6 · V.4/IV.4 — một câu cho go-to-market

Đưa vào phần rào cản triển khai: hồ sơ quyền hạn của `tabCapture` và host permission trên `meet.google.com` sẽ phải **giải trình bằng văn bản** khi nộp lên Chrome Web Store. Đây là ràng buộc thương mại hóa thật, nêu một lần là đủ và tăng độ tin cậy.

---

# PHẦN 7 — Vệ sinh tài liệu và đánh số lại

1. **XÓA** toàn bộ từ block trang bìa thứ hai trở đi (dòng 961+): bản sao trang đầu, bìa riêng đề "Tháng 9/2026", phần hướng dẫn template. Một trang bìa trùng là lỗi vệ sinh thuần, **không có** câu phản biện.
2. Chuột phải MỤC LỤC → **Update Field** (TOC hiện thiếu `2.8`).
3. Đánh số lại caption:

| Cũ | Mới |
|---|---|
| Hình 1 (chu trình + 4 năng lực) | **Hình 1** — vẽ lại, tiếng Việt, nét liền/nét đứt + badge `Demo`/`Mục tiêu` |
| Hình 2 (5 lớp) | **thay bằng Hình 2** — MV3, 4 swimlane + dải dịch vụ ngoài |
| Hình 3 (placeholder) | **thay bằng Hình 3…9** — bảy ảnh chụp thật. Nếu muốn giữ ảnh 5 lớp: appendix `Hình 2b` |
| Bảng 1 (đối thủ) | **Bảng 1** — số không đổi, tách cột, thêm 2 dòng |
| Bảng 2 (end-to-end) | **Bảng 5** |
| Bảng 3 (prototype, 7 module) | **Bảng 7** (viết lại, có cột Căn cứ kiểm chứng) |
| Bảng Lean Canvas (IV) | **Bảng 8** |
| Bảng roadmap (V) | **Bảng 9** |
| — | **Bảng 2** 4 bối cảnh · **Bảng 3** 9 bước · **Bảng 4** 5 lớp + trạng thái · **Bảng 6** sự cố · **Bảng 10** ràng buộc 2.8 (nếu muốn tabulate) |

4. Soát mọi cross-reference trong thân: `mục 2.6`, `III.3.3`, `V.3.3`, `V.4`, và các số Bảng/Hình vừa đổi.

---

# PHẦN 8 — Bốn chỗ cần người dán kiểm tra lại

1. **Tám cột đối thủ trong `Bảng 1`.** Cột MeetMate mới là phần bản này chốt; giá trị ô của Fireflies/Otter/Copilot/… phải khớp với khảo sát đã viết ở chính mục 2.6, đặc biệt hai dòng thêm mới.
2. **Số dòng trong tài liệu.** "dòng 327", "dòng 395–428"… là số của bản trích xuất text, không phải số trang Word — dùng để định vị nội dung, không để nhảy trang.
3. **`Bảng 7`** — xem cảnh báo ở 5.3: chỉ dán nguyên trạng sau khi extension chạy và test xanh.
4. **Style bảng sau khi dán.** Không kiểm chứng được việc paste vào Word có giữ đúng format bảng của template; đó là bước mở file và nhìn.
