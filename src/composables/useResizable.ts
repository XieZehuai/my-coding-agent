import { ref, type Ref } from "vue";

export interface ResizableOptions {
  value: Ref<number>;
  min: number | Ref<number>;
  max: number | Ref<number>;
  axis: "horizontal" | "vertical";
  invert?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onReset?: () => void;
}

export function useResizable(options: ResizableOptions) {
  const { value, min, max, axis, invert, onDragStart, onDragEnd, onReset } = options;
  const isDragging = ref(false);

  function resolveBound(bound: number | Ref<number>): number {
    return typeof bound === "number" ? bound : bound.value;
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    isDragging.value = true;
    onDragStart?.();

    const startPos = axis === "horizontal" ? e.clientX : e.clientY;
    const startValue = value.value;

    function onPointerMove(e: PointerEvent) {
      const currentPos = axis === "horizontal" ? e.clientX : e.clientY;
      let delta = currentPos - startPos;
      if (axis === "vertical") delta = -delta;
      if (invert) delta = -delta;
      let newValue = startValue + delta;

      const minBound = resolveBound(min);
      const maxBound = resolveBound(max);
      newValue = Math.max(minBound, Math.min(maxBound, newValue));
      value.value = newValue;
    }

    function onPointerUp() {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      isDragging.value = false;
      onDragEnd?.();
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  function onDoubleClick() {
    onReset?.();
  }

  return {
    isDragging,
    onPointerDown,
    onDoubleClick,
  };
}
