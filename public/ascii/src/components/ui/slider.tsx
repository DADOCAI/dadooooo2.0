"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider@1.2.3";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  // Generate tick marks
  const tickMarks = React.useMemo(() => {
    const count = 20;
    return Array.from({ length: count + 1 }, (_, i) => (i / count) * 100);
  }, []);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 py-3",
        className,
      )}
      {...props}
    >
      {/* Tick marks */}
      <div className="absolute inset-x-0 flex justify-between pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        {tickMarks.map((position, i) => (
          <div
            key={i}
            className="w-px bg-neutral-300"
            style={{
              height: i % 5 === 0 ? '8px' : '4px',
            }}
          />
        ))}
      </div>

      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-neutral-200 relative grow overflow-visible rounded-full h-0.5 w-full"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-black absolute h-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block w-1 h-6 bg-black rounded-sm shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
