"use client";

// The last-mounted modal owns the keyboard. Every dialog used to attach its own
// Escape listener to `document`, so pressing Escape while Answer Preferences was
// stacked over the create-session wizard dismissed the wizard behind it and left
// the dialog the person was actually looking at.
const stack: HTMLElement[] = [];

export function pushModal(el: HTMLElement) {
  if (stack[stack.length - 1] !== el) stack.push(el);
}

export function popModal(el: HTMLElement) {
  const i = stack.indexOf(el);
  if (i >= 0) stack.splice(i, 1);
}

export function isTopModal(el: HTMLElement) {
  return stack[stack.length - 1] === el;
}
