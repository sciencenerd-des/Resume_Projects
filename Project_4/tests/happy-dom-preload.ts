// Preload script to register happy-dom globals before any test files are loaded
import { Window } from 'happy-dom';

const happyWindow = new Window({
  url: 'http://localhost:3000',
  width: 1024,
  height: 768,
});

// NodeFilter polyfill for Radix UI's FocusScope
const NodeFilterPolyfill = {
  SHOW_ALL: 0xffffffff,
  SHOW_ELEMENT: 0x1,
  SHOW_ATTRIBUTE: 0x2,
  SHOW_TEXT: 0x4,
  SHOW_CDATA_SECTION: 0x8,
  SHOW_ENTITY_REFERENCE: 0x10,
  SHOW_ENTITY: 0x20,
  SHOW_PROCESSING_INSTRUCTION: 0x40,
  SHOW_COMMENT: 0x80,
  SHOW_DOCUMENT: 0x100,
  SHOW_DOCUMENT_TYPE: 0x200,
  SHOW_DOCUMENT_FRAGMENT: 0x400,
  SHOW_NOTATION: 0x800,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
};

// PointerEvent polyfill for Radix UI
class PointerEventPolyfill extends happyWindow.MouseEvent {
  pointerId: number;
  width: number;
  height: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  isPrimary: boolean;

  constructor(type: string, params: PointerEventInit = {}) {
    // Cast params to any to satisfy TypeScript with happy-dom's MouseEvent
    super(type, params as any);
    this.pointerId = params.pointerId ?? 0;
    this.width = params.width ?? 1;
    this.height = params.height ?? 1;
    this.pressure = params.pressure ?? 0;
    this.tangentialPressure = params.tangentialPressure ?? 0;
    this.tiltX = params.tiltX ?? 0;
    this.tiltY = params.tiltY ?? 0;
    this.twist = params.twist ?? 0;
    this.pointerType = params.pointerType ?? 'mouse';
    this.isPrimary = params.isPrimary ?? false;
  }
}

// ResizeObserver polyfill for Radix UI
class ResizeObserverPolyfill {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

// Register all DOM globals on globalThis
Object.assign(globalThis, {
  window: happyWindow,
  document: happyWindow.document,
  navigator: happyWindow.navigator,
  location: happyWindow.location,
  history: happyWindow.history,
  localStorage: happyWindow.localStorage,
  sessionStorage: happyWindow.sessionStorage,
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
  PointerEvent: PointerEventPolyfill,
  MutationObserver: happyWindow.MutationObserver,
  ResizeObserver: ResizeObserverPolyfill,
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
  HTMLTableElement: happyWindow.HTMLTableElement,
  HTMLTableRowElement: happyWindow.HTMLTableRowElement,
  HTMLTableCellElement: happyWindow.HTMLTableCellElement,
  HTMLTableSectionElement: happyWindow.HTMLTableSectionElement,
  SVGElement: happyWindow.SVGElement,
  NodeList: happyWindow.NodeList,
  HTMLCollection: happyWindow.HTMLCollection,
  DOMParser: happyWindow.DOMParser,
  NodeFilter: NodeFilterPolyfill,
  getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(callback, 16),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

// Add scrollIntoView polyfill for cmdk and Radix UI components
// Use type assertion to add the method to the prototype
(happyWindow.HTMLElement.prototype as unknown as HTMLElement).scrollIntoView = function() {};
(happyWindow.Element.prototype as unknown as Element).scrollIntoView = function() {};

// Create a root div for React to render into
const rootDiv = happyWindow.document.createElement('div');
rootDiv.id = 'root';
happyWindow.document.body.appendChild(rootDiv);
