import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ dialog: { open: false, showModal: vi.fn(), close: vi.fn() }, cleanup: undefined as (() => void) | undefined, refs: 0 }));
vi.mock("react", () => ({
  useRef: () => ({ current: state.refs++ % 2 === 0 ? state.dialog : false }),
  useEffect: (effect: () => (() => void) | undefined) => { state.cleanup = effect(); },
}));
import { useDialog } from "./useDialog";

describe("native dialog lifecycle", () => {
  it("opens and closes the dialog and forwards cancel", () => {
    state.refs = 0;
    state.dialog.open = false;
    const onClose = vi.fn();
    const { dialogProps } = useDialog({ open: true, onClose });
    expect(state.dialog.showModal).toHaveBeenCalled();
    const preventDefault = vi.fn();
    dialogProps.onCancel({ preventDefault } as never);
    expect(preventDefault).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    state.dialog.open = true;
    state.cleanup?.();
    expect(state.dialog.close).toHaveBeenCalled();
  });
});
