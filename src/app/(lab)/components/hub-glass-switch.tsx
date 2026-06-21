"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import styles from "./entity-hub.module.css";

type Option<T extends string> = { value: T; label: string };

type HubGlassSwitchProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
  optionClassName?: string;
  draggable?: boolean;
  "aria-label"?: string;
};

type HubAnimatedTabBarProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
  tabClassName?: string;
  "aria-label"?: string;
};

function switchDataValue(value: string) {
  return value || "__all__";
}

function measureIndicator(_bar: HTMLElement, activeBtn: HTMLElement) {
  return {
    left: activeBtn.offsetLeft,
    width: activeBtn.offsetWidth,
  };
}

export function HubAnimatedTabBar<T extends string>({
  value,
  onChange,
  options,
  className,
  tabClassName,
  "aria-label": ariaLabel,
}: HubAnimatedTabBarProps<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const activeBtn = bar.querySelector<HTMLElement>(`[data-tab-value="${CSS.escape(value)}"]`);
    if (!activeBtn) return;
    setIndicator(measureIndicator(bar, activeBtn));
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [updateIndicator, options]);

  return (
    <div
      ref={barRef}
      className={`${styles.tabBar} ${styles.hubAnimatedTabBar} ${className ?? ""}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      <span
        className={styles.hubAnimatedTabIndicator}
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
        aria-hidden
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          data-tab-value={opt.value}
          className={`${styles.tab} ${tabClassName ?? ""} ${value === opt.value ? styles.tabActive : ""}`}
          onClick={() => {
            if (opt.value !== value) onChange(opt.value);
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function HubGlassSwitch<T extends string>({
  value,
  onChange,
  options,
  className,
  optionClassName,
  draggable = false,
  "aria-label": ariaLabel,
}: HubGlassSwitchProps<T>) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pending: false,
    dragging: false,
    blockClick: false,
    startX: 0,
    scrollLeft: 0,
    pointerId: -1,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const bar = barRef.current;
    if (!bar) return;
    const activeBtn = bar.querySelector<HTMLElement>(
      `[data-switch-value="${switchDataValue(value)}"]`,
    );
    if (!activeBtn) return;
    setIndicator(measureIndicator(bar, activeBtn));
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [updateIndicator, options]);

  useLayoutEffect(() => {
    if (!draggable) return;

    function onPointerMove(e: PointerEvent) {
      const bar = barRef.current;
      const drag = dragRef.current;
      if (!bar || !drag.pending) return;

      const dx = e.clientX - drag.startX;

      if (!drag.dragging) {
        if (Math.abs(dx) < 6) return;
        drag.dragging = true;
        bar.setPointerCapture(drag.pointerId);
        bar.classList.add(styles.hubGlassSwitchDragging);
      }

      bar.scrollLeft = drag.scrollLeft - dx;
      e.preventDefault();
    }

    function endDrag() {
      const bar = barRef.current;
      const drag = dragRef.current;
      if (!bar || !drag.pending) return;

      if (drag.dragging) {
        drag.blockClick = true;
        if (bar.hasPointerCapture(drag.pointerId)) {
          bar.releasePointerCapture(drag.pointerId);
        }
      }

      bar.classList.remove(styles.hubGlassSwitchDragging);
      drag.pending = false;
      drag.dragging = false;
      drag.pointerId = -1;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [draggable]);

  function onBarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggable || !barRef.current || e.button !== 0) return;
    dragRef.current = {
      pending: true,
      dragging: false,
      startX: e.clientX,
      scrollLeft: barRef.current.scrollLeft,
      pointerId: e.pointerId,
    };
  }

  function selectOption(opt: Option<T>, e: React.MouseEvent<HTMLButtonElement>) {
    if (dragRef.current.blockClick) {
      e.preventDefault();
      dragRef.current.blockClick = false;
      return;
    }
    if (opt.value !== value) onChange(opt.value);
  }

  return (
    <div
      ref={barRef}
      className={`${styles.hubGlassSwitch} ${draggable ? styles.hubGlassSwitchDraggable : ""} ${className ?? ""}`}
      role="tablist"
      aria-label={ariaLabel}
      onPointerDown={draggable ? onBarPointerDown : undefined}
    >
      <span
        className={styles.hubGlassSwitchIndicator}
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
        aria-hidden
      />
      {options.map((opt) => (
        <button
          key={switchDataValue(opt.value)}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          data-switch-value={switchDataValue(opt.value)}
          className={`${styles.hubGlassSwitchOption} ${optionClassName ?? ""} ${value === opt.value ? styles.hubGlassSwitchOptionActive : ""}`}
          onClick={(e) => selectOption(opt, e)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
