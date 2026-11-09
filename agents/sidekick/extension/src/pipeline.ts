import { DocAssistant } from './assistant';
import { checkDocs, type DocLibrary, type Finding } from './doccheck';
import { citation, formatFinding, shouldPost } from './format';
import type { Chat } from './llm';
import type { Card, PanelEvent, Settings } from './messages';
import { formatChatMessages, research, type ResearchResult, type Search } from './research';
import { ResearchSession } from './session';
import { detectTopic } from './topic';
import { TranscriptWindow } from './transcript';

export type Pipeline = {
  /** Called from the STT callback; returns at once, all model work runs in the background. */
  onFinal(text: string): void;
  onPartial(text: string): void;
  stop(): void;
};

/**
 * The meeting brain, shared by the extension's offscreen page and the Node meeting simulation:
 * transcript → (dedupe) → document checks and web research → cards and chat messages.
 */
export function createPipeline(deps: {
  chat: Chat;
  library: () => DocLibrary | null;
  /** null when no Exa key: web research stays off. */
  search: Search | null;
  settings: () => Settings;
  emit: (event: PanelEvent) => void;
  post: (cardId: string, messages: string[]) => void;
  now?: () => number;
  newId?: () => string;
}): Pipeline {
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const window = new TranscriptWindow();
  const error = (message: string) => deps.emit({ kind: 'notice', level: 'error', message });

  const publish = (card: Omit<Card, 'id' | 'at' | 'chat'>, messages: string[], post: boolean) => {
    const chat = post && deps.settings().postToChat;
    const full: Card = { ...card, id: newId(), at: now(), chat: chat ? 'pending' : 'off' };
    deps.emit({ kind: 'card', card: full });
    if (chat) deps.post(full.id, messages);
  };

  const onFinding = (f: Finding) => publish({
    kind: f.kind, mode: f.mode, utterance: f.utterance || undefined, text: f.text,
    quote: f.quote || undefined, source: citation(f) || undefined,
  }, [formatFinding(f)], shouldPost(f));

  const onResearch = (r: ResearchResult) => publish({
    kind: 'research', title: r.topic, text: r.summary, links: r.sources,
  }, formatChatMessages(r), true);

  const assistant = new DocAssistant({
    library: deps.library,
    check: (input, signal) => {
      const lib = deps.library();
      return lib ? checkDocs(deps.chat, lib, input, signal) : Promise.resolve([]);
    },
    emit: onFinding,
    onError: message => error(`Đối chiếu tài liệu: ${message}`),
    now,
  });

  const search = deps.search;
  const web = search && new ResearchSession({
    detect: (current, transcript, signal) => detectTopic(deps.chat, current, transcript, signal),
    research: (topic, signal) => research(topic, { search, chat: deps.chat }, signal),
    deliver: onResearch,
    onError: message => error(`Research web: ${message}`),
    transcript: () => window.text(now()),
    now,
  });

  return {
    onFinal(text) {
      const at = now();
      if (!window.add(text, at)) return; // the same sentence heard twice (loudspeaker into mic)
      deps.emit({ kind: 'final', text, at });
      assistant.onLine(text);
      if (deps.settings().webResearch) web?.onLine();
    },
    onPartial(text) {
      deps.emit({ kind: 'partial', text });
    },
    stop() {
      assistant.stop();
      web?.stop();
    },
  };
}
