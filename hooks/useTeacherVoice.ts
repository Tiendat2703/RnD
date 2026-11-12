"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { teacherApi } from '../lib/backendApi';
import { startTeacherMicrophone } from '../lib/teacherMicrophone';
import { TeacherVoiceQuestions, type TeacherSpokenQuestion } from '../lib/teacherVoice';
import type { TeacherVoiceSnapshot } from '../lib/teacher';

type VoiceState = 'idle' | 'starting' | 'listening' | 'reconnecting' | 'error';

export function useTeacherVoice(roomId: string, token: string, onQuestion: (question: TeacherSpokenQuestion) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [partial, setPartial] = useState('');
  const [heard, setHeard] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const onQuestionRef = useRef(onQuestion); onQuestionRef.current = onQuestion;
  const activeRef = useRef<{ stop(): void } | null>(null);

  useEffect(() => {
    setSupported(Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.AudioContext && window.AudioWorkletNode));
    setState('idle'); setPartial(''); setHeard([]); setError('');
    const leave = () => activeRef.current?.stop();
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, [roomId, token]);

  const stop = useCallback(() => { activeRef.current?.stop(); setState('idle'); setPartial(''); }, []);

  const start = useCallback(async () => {
    if (activeRef.current || !token) return;
    if (!supported) { setError('Micro cần HTTPS hoặc localhost và trình duyệt hỗ trợ thu âm.'); return; }
    setState('starting'); setError(''); setPartial(''); setHeard([]);
    let active = true;
    let stopMicrophone: (() => void) | null = null;
    let voiceId = '';
    let packet = 0;
    let lastFinal = 0;
    let pumping = false;
    const frames: ArrayBuffer[] = [];
    const controller = new AbortController();
    const questions = new TeacherVoiceQuestions(question => onQuestionRef.current(question));
    const handle = { stop: () => {
      if (!active) return;
      active = false; controller.abort(); stopMicrophone?.(); frames.length = 0;
      if (voiceId) void teacherApi.stopVoice(roomId, token, voiceId, true).catch(() => undefined);
      if (activeRef.current === handle) activeRef.current = null;
    } };
    activeRef.current = handle;
    const fail = (message: string) => {
      if (!active) return;
      handle.stop(); setError(message); setState('error'); setPartial('');
    };
    const receive = (snapshot: TeacherVoiceSnapshot) => {
      if (!active) return;
      if (snapshot.status === 'error' || snapshot.status === 'closed') {
        fail(snapshot.error || 'Phiên nhận giọng nói đã dừng. Hãy bật lại micro.'); return;
      }
      setState(snapshot.status === 'reconnecting' ? 'reconnecting' : 'listening');
      setPartial(snapshot.partial);
      for (const final of snapshot.finals) {
        if (final.sequence <= lastFinal) continue;
        lastFinal = final.sequence;
        setHeard(previous => [...previous.slice(-7), final.text]);
        questions.onFinal(final.text);
      }
    };
    const pump = async () => {
      if (pumping || !active || !voiceId) return;
      pumping = true;
      try {
        while (active && frames.length) {
          const snapshot = await teacherApi.voiceAudio(roomId, token, voiceId, packet++, frames.shift()!, controller.signal);
          receive(snapshot);
        }
      } catch (error) {
        if (active) fail(error instanceof Error ? error.message : 'Mất kết nối nhận giọng nói.');
      } finally { pumping = false; }
    };
    try {
      stopMicrophone = await startTeacherMicrophone(audio => {
        if (!active || !voiceId) return;
        if (frames.length >= 6) { fail('Kết nối chậm nên micro đã dừng để tránh xử lý lời nói cũ. Hãy bật lại khi mạng ổn định.'); return; }
        frames.push(audio); void pump();
      }, () => fail('Thiết bị micro đã ngắt kết nối.'));
      if (!active) { stopMicrophone(); return; }
      const session = await teacherApi.startVoice(roomId, token, controller.signal);
      voiceId = session.id;
      if (!active) { void teacherApi.stopVoice(roomId, token, voiceId, true).catch(() => undefined); return; }
      receive(session);
    } catch (error) {
      if (!active) return;
      const name = error instanceof Error ? error.name : '';
      fail(name === 'NotAllowedError' ? 'Chưa có quyền micro. Hãy cho phép micro trong trình duyệt rồi bật lại.'
        : name === 'NotFoundError' ? 'Không tìm thấy micro trên thiết bị này.'
          : error instanceof Error ? error.message : 'Không bật được micro.');
    }
  }, [roomId, token, supported]);

  return { state, partial, heard, error, supported, start, stop, active: state === 'starting' || state === 'listening' || state === 'reconnecting' };
}
