import type { PipelineStage } from '../../../../../lib/types';
import { PIPELINE_LABEL } from '../../../../../lib/types';

/** Sáu bước theo đúng thứ tự pipeline của web console. */
export const STAGE_ORDER: PipelineStage[] = [
  'listening',
  'transcribing',
  'topic',
  'searching',
  'writing',
  'posting',
];

/**
 * Hàng sáu bước: một dòng ngang, nhãn chỉ nằm ở bước đang chạy — trong cột 360px đó
 * là thứ duy nhất vẫn đọc được. Đã qua = nền nhạt, đang chạy = đặc, chưa tới = vòng viền.
 * `active` null nghĩa là không chạy: cả sáu bước ở trạng thái chưa tới.
 */
export function renderStages(active: PipelineStage | null): HTMLElement {
  const row = document.createElement('div');
  row.className = 'stages';
  row.setAttribute('role', 'list');
  row.setAttribute('aria-label', 'Các bước xử lý');
  const at = active ? STAGE_ORDER.indexOf(active) : -1;
  STAGE_ORDER.forEach((stage, i) => {
    const item = document.createElement('span');
    item.setAttribute('role', 'listitem');
    const state = i === at ? 'active' : i < at ? 'done' : 'pending';
    item.className = `stage stage--${state}`;
    item.textContent = state === 'active' ? `${i + 1} ${PIPELINE_LABEL[stage]}` : String(i + 1);
    if (state !== 'active') item.title = PIPELINE_LABEL[stage];
    if (state === 'active') item.setAttribute('aria-current', 'step');
    row.append(item);
  });
  return row;
}
