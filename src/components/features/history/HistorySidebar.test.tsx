import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HistoryItemData, HistorySidebarProps } from "./HistorySidebar.data";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useRef: <T,>(initial: T) => ({ current: initial }),
    useEffect: () => {},
    useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

import { HistorySidebar } from "./HistorySidebar";

const sampleItem: HistoryItemData = {
  id: "hist-1",
  calcId: "quadratic",
  calcTitle: "Quadratic Solver",
  inputs: { a: "1", b: "1", c: "-6" },
  result: "x = 2, -3",
  unit: "",
  ts: 1700000000000,
};

function renderExpandedTree(node: React.ReactNode): React.ReactNode {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(renderExpandedTree);
  }
  if (!React.isValidElement(node)) {
    return node;
  }
  const el = node as React.ReactElement<Record<string, unknown>>;
  if (typeof el.type === "function") {
    const fn = el.type as (props: Record<string, unknown>) => React.ReactNode;
    return renderExpandedTree(fn(el.props));
  }
  if (typeof el.type === "object" && el.type !== null && "type" in el.type) {
    const memoType = el.type as { type: (props: Record<string, unknown>) => React.ReactNode };
    if (typeof memoType.type === "function") {
      return renderExpandedTree(memoType.type(el.props));
    }
  }
  const children = el.props.children as React.ReactNode | undefined;
  return React.cloneElement(el, undefined, children !== undefined ? renderExpandedTree(children) : undefined);
}

function findElements(
  node: React.ReactNode,
  predicate: (el: React.ReactElement<Record<string, unknown>>) => boolean
): React.ReactElement<Record<string, unknown>>[] {
  const matches: React.ReactElement<Record<string, unknown>>[] = [];
  if (node == null || typeof node !== "object") return matches;
  if (Array.isArray(node)) {
    for (const child of node) {
      matches.push(...findElements(child, predicate));
    }
    return matches;
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<Record<string, unknown>>;
    if (predicate(el)) {
      matches.push(el);
    }
    if (el.props.children !== undefined) {
      matches.push(...findElements(el.props.children as React.ReactNode, predicate));
    }
  }
  return matches;
}

function hasNestedInteractiveButtons(node: React.ReactNode, insideInteractive = false): boolean {
  if (node == null || typeof node !== "object") return false;
  if (Array.isArray(node)) {
    return node.some((child) => hasNestedInteractiveButtons(child, insideInteractive));
  }
  if (!React.isValidElement(node)) return false;
  const el = node as React.ReactElement<Record<string, unknown>>;
  const isInteractiveButton = el.type === "button" || el.props.role === "button";
  if (insideInteractive && el.type === "button") {
    return true;
  }
  const nextInside = insideInteractive || isInteractiveButton;
  return hasNestedInteractiveButtons(el.props.children as React.ReactNode, nextInside);
}

describe("HistorySidebar accessibility & action isolation (D-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeProps = (): HistorySidebarProps => ({
    show: true,
    onClose: vi.fn(),
    lang: "en",
    history: [sampleItem],
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    onClearAll: vi.fn(),
    isMobile: false,
  });

  it("renders zero nested button or role=button ancestors around buttons", () => {
    const props = makeProps();
    const html = renderToStaticMarkup(React.createElement(HistorySidebar, props));
    expect(html).toContain('aria-label="Delete"');
    expect(html).not.toMatch(/role="button"[^>]*>[\s\S]*?<button/);

    const SidebarComp = (HistorySidebar as unknown as { type: (p: HistorySidebarProps) => React.ReactNode }).type;
    const tree = renderExpandedTree(SidebarComp(props));
    expect(hasNestedInteractiveButtons(tree)).toBe(false);
  });

  it("invokes onRestore once and onDelete zero times when primary history item button is activated", () => {
    const props = makeProps();
    const SidebarComp = (HistorySidebar as unknown as { type: (p: HistorySidebarProps) => React.ReactNode }).type;
    const tree = renderExpandedTree(SidebarComp(props));

    const restoreButtons = findElements(
      tree,
      (el) => el.type === "button" && el.props["aria-label"] !== "Delete" && el.props["aria-label"] !== "Close history" && String(el.props.className ?? "").includes("itemRestoreBtn")
    );
    expect(restoreButtons).toHaveLength(1);

    const onClick = restoreButtons[0].props.onClick as () => void;
    onClick();

    expect(props.onRestore).toHaveBeenCalledTimes(1);
    expect(props.onRestore).toHaveBeenCalledWith(sampleItem);
    expect(props.onDelete).toHaveBeenCalledTimes(0);
  });

  it("invokes onDelete once and onRestore zero times when delete button is activated", () => {
    const props = makeProps();
    const SidebarComp = (HistorySidebar as unknown as { type: (p: HistorySidebarProps) => React.ReactNode }).type;
    const tree = renderExpandedTree(SidebarComp(props));

    const hsItems = findElements(
      tree,
      (el) => el.type === "div" && String(el.props.className ?? "").split(/\s+/).includes("hs-item")
    );
    expect(hsItems).toHaveLength(1);
    expect(hsItems[0].props.role).toBeUndefined();
    expect(hsItems[0].props.onKeyDown).toBeUndefined();

    const deleteButtons = findElements(
      tree,
      (el) => el.type === "button" && el.props["aria-label"] === "Delete"
    );
    expect(deleteButtons).toHaveLength(1);

    const onDeleteClick = deleteButtons[0].props.onClick as () => void;
    onDeleteClick();

    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onRestore).toHaveBeenCalledTimes(0);
  });
});
