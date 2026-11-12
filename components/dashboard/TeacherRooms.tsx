"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { teacherApi } from '../../lib/backendApi';
import type { TeacherConfig, TeacherRoomSummary } from '../../lib/teacher';
import { useDashboard } from './DashboardContext';
import { IconBook, IconChevronRight, IconPlus } from './icons';

export function TeacherRooms() {
  const { openWizard } = useDashboard();
  const [rooms, setRooms] = useState<TeacherRoomSummary[]>([]);
  const [config, setConfig] = useState<TeacherConfig | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try { const [rooms, config] = await Promise.all([teacherApi.list(), teacherApi.config()]); setRooms(rooms); setConfig(config); }
    catch (error) { setError(error instanceof Error ? error.message : 'Không tải được phòng học.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="teacher-home">
    <section className="teacher-intro">
      <div><span className="teacher-eyebrow">MEETMATE / TEACHER</span><h2>Hiểu bài. Tự tin làm được.</h2>
        <p>Mang tài liệu của bạn đến. Teacher cùng bạn học từng ý, giải thích điều còn vướng và luyện tập để ghi nhớ lâu hơn.</p></div>
      <div className="teacher-intro__note"><IconBook /><span>Học một mình hoặc cùng nhóm.<br />Cùng tài liệu, cùng một cuộc trao đổi.</span></div>
    </section>
    {config && !config.ai && <p className="teacher-notice">Teacher chưa được kết nối AI. Bạn vẫn có thể tạo phòng, tải tài liệu và mời nhóm; cần cấu hình dịch vụ AI để bắt đầu giảng bài.</p>}
    <div className="teacher-section-head"><div><h3>Phòng học của bạn</h3><p>Tài liệu và hội thoại được lưu để bạn quay lại học tiếp.</p></div>
      <button className="btn btn--primary" onClick={() => openWizard()}><IconPlus /> Tạo phòng học</button></div>
    {loading ? <p role="status">Đang tải phòng học…</p> : error ? <div className="teacher-error" role="alert">{error} <button className="btn btn--secondary btn--sm" onClick={load}>Thử lại</button></div>
      : rooms.length ? <div className="teacher-room-grid">{rooms.map(room => <Link className="teacher-room-card" href={`/dashboard/teacher/${room.id}`} key={room.id}>
        <span className="teacher-eyebrow">{room.mode === 'group' ? 'HỌC NHÓM' : 'HỌC CÁ NHÂN'} · {room.level}</span>
        <h3>{room.title}</h3><p>{room.subject}</p><p className="teacher-room-card__goal">{room.goal || 'Cùng Teacher khám phá kiến thức mới.'}</p>
        <div><span>{room.memberCount} thành viên · {room.documentCount} tài liệu</span><IconChevronRight /></div>
      </Link>)}</div>
      : <section className="teacher-empty"><IconBook /><h3>Bài học tiếp theo bắt đầu từ đây</h3><p>Tạo một phòng, chọn Teacher và tải slide hoặc Word. Bạn có thể bắt đầu bằng chính câu hỏi mình chưa hiểu.</p></section>}
  </div>;
}
