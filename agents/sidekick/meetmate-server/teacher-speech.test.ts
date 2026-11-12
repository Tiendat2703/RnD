import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { TeacherVoiceQuestions, spokenTeacherAction } from '../../../lib/teacherVoice';

describe('Teacher spoken requests', () => {
  it.each([
    ['giảng slide này cho mình', 'teach'], ['ra bài tập về xác suất', 'exercises'],
    ['giải bài tập số 2', 'solve'], ['tìm tài liệu trên web về đạo hàm', 'research'],
    ['giải thích tại sao dùng công thức này', 'ask'],
  ])('chooses the Teacher action for %s', (text, action) => {
    expect(spokenTeacherAction(text)).toBe(action);
  });

  it('listens to ordinary conversation but only submits requests with the assistant keyword', () => {
    const requests: unknown[] = [];
    const questions = new TeacherVoiceQuestions(question => requests.push(question));
    questions.onFinal('Mình đang xem slide về phân phối chuẩn.');
    questions.onFinal('Nó nghĩa là gì?');
    questions.onFinal('MeetMate ơi, giảng bài đi.');
    expect(requests).toEqual([]);
    questions.onFinal('Trợ lý, giảng slide này cho mình.');
    expect(requests).toMatchObject([{ text: 'giảng slide này cho mình.', action: 'teach', context: [
      'Mình đang xem slide về phân phối chuẩn.', 'Nó nghĩa là gì?', 'MeetMate ơi, giảng bài đi.',
    ] }]);
    questions.onFinal('Còn bài tập thì sao?');
    expect(requests).toHaveLength(1);
  });

  it('accepts one follow-up after a standalone keyword and expires it after 10 seconds', () => {
    let time = 0;
    const requests: unknown[] = [];
    const questions = new TeacherVoiceQuestions(question => requests.push(question), () => time);
    questions.onFinal('Trợ lý ơi.'); time += 5000;
    questions.onFinal('Ra bài tập về nội dung này.');
    questions.onFinal('Giải bài tập luôn nhé.');
    expect(requests).toHaveLength(1);
    questions.onFinal('Trợ lý ơi.'); time += 10_001;
    questions.onFinal('Giảng lại bài này.');
    expect(requests).toHaveLength(1);
  });
});

describe('Teacher audio worklet', () => {
  it.each([16000, 44100, 48000])('captures PCM16 / 16 kHz at device sample rate %d', async sampleRate => {
    const frames: Int16Array[] = [];
    let Processor!: new () => { process(input: Float32Array[][]): boolean };
    const source = await readFile(new URL('../../../public/teacher-pcm.js', import.meta.url), 'utf8');
    runInNewContext(source, {
      AudioWorkletProcessor: class { port = { postMessage: (data: ArrayBuffer) => frames.push(new Int16Array(data).slice()) }; },
      sampleRate, Int16Array, registerProcessor: (_name: string, ctor: typeof Processor) => { Processor = ctor; },
    });
    const processor = new Processor();
    for (let i = 0; i < sampleRate; i += 128) processor.process([[new Float32Array(Math.min(128, sampleRate - i)).fill(0.5)]]);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toHaveLength(8000);
    expect([...frames[0]].every(sample => Math.abs(sample - 16384) <= 1)).toBe(true);
  });
});
