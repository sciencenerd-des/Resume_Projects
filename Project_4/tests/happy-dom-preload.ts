// Preload script to register happy-dom globals before any test files are loaded
import { Window } from 'happy-dom';

const happyWindow = new Window({
  url: 'http://localhost:3000',
  width: 1024,
  height: 768,
});

// Register all DOM globals on globalThis
Object.assign(globalThis, {
  window: happyWindow,
  document: happyWindow.document,
  navigator: happyWindow.navigator,
  location: happyWindow.location,
  history: happyWindow.history,
  HTMLElement: happyWindow.HTMLElement,
  Element: happyWindow.Element,
  Node: happyWindow.Node,
  Text: happyWindow.Text,
  Comment: happyWindow.Comment,
  DocumentFragment: happyWindow.DocumentFragment,
  Event: happyWindow.Event,
  CustomEvent: happyWindow.CustomEvent,
  MouseEvent: happyWindow.MouseEvent,
  KeyboardEvent: happyWindow.KeyboardEvent,
  FocusEvent: happyWindow.FocusEvent,
  InputEvent: happyWindow.InputEvent,
  MutationObserver: happyWindow.MutationObserver,
  HTMLInputElement: happyWindow.HTMLInputElement,
  HTMLButtonElement: happyWindow.HTMLButtonElement,
  HTMLDivElement: happyWindow.HTMLDivElement,
  HTMLSpanElement: happyWindow.HTMLSpanElement,
  HTMLAnchorElement: happyWindow.HTMLAnchorElement,
  HTMLFormElement: happyWindow.HTMLFormElement,
  HTMLBodyElement: happyWindow.HTMLBodyElement,
  HTMLHeadElement: happyWindow.HTMLHeadElement,
  HTMLHtmlElement: happyWindow.HTMLHtmlElement,
  HTMLLabelElement: happyWindow.HTMLLabelElement,
  HTMLSelectElement: happyWindow.HTMLSelectElement,
  HTMLTextAreaElement: happyWindow.HTMLTextAreaElement,
  SVGElement: happyWindow.SVGElement,
  NodeList: happyWindow.NodeList,
  HTMLCollection: happyWindow.HTMLCollection,
  DOMParser: happyWindow.DOMParser,
  getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(callback, 16),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

// Create a root div for React to render into
const rootDiv = happyWindow.document.createElement('div');
rootDiv.id = 'root';
happyWindow.document.body.appendChild(rootDiv);
