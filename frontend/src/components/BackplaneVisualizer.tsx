import { useConfigStore } from '../store/configStore';
import { cn } from '../lib/utils';

export function BackplaneVisualizer() {
    const { slots } = useConfigStore();

    // Constants for SVG drawing
    const SLOT_WIDTH = 40;
    const SLOT_HEIGHT = 200;
    const GAP = 5;
    const PADDING = 20;

    const totalWidth = (slots.length * SLOT_WIDTH) + ((slots.length - 1) * GAP) + (PADDING * 2);
    const totalHeight = SLOT_HEIGHT + (PADDING * 2);

    return (
        <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex justify-center">
            <svg
                width={totalWidth}
                height={totalHeight}
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                className="max-w-full h-auto"
            >
                {/* Backplane PCB Background */}
                <rect
                    x={0}
                    y={0}
                    width={totalWidth}
                    height={totalHeight}
                    rx={8}
                    fill="#1e293b"
                />

                {/* Slots */}
                {slots.map((slot, index) => {
                    const x = PADDING + (index * (SLOT_WIDTH + GAP));
                    const y = PADDING;
                    const isSystem = slot.type === 'system';
                    const isPsu = slot.type === 'psu';

                    return (
                        <g key={slot.id} transform={`translate(${x}, ${y})`}>
                            {/* Slot Connector */}
                            <rect
                                width={SLOT_WIDTH}
                                height={SLOT_HEIGHT}
                                fill={isSystem ? "#ef4444" : isPsu ? "#f97316" : "#3b82f6"}
                                rx={2}
                                className={cn(
                                    "transition-colors duration-300",
                                    isSystem ? "fill-red-500" : isPsu ? "fill-orange-500" : "fill-blue-500"
                                )}
                            />

                            {/* Slot Label */}
                            <text
                                x={SLOT_WIDTH / 2}
                                y={SLOT_HEIGHT + 20}
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                fontFamily="sans-serif"
                            >
                                {slot.id}
                            </text>

                            {/* Type Label */}
                            <text
                                x={SLOT_WIDTH / 2}
                                y={-10}
                                textAnchor="middle"
                                fill={isSystem ? "#fca5a5" : isPsu ? "#fdba74" : "#93c5fd"}
                                fontSize="10"
                                fontFamily="sans-serif"
                                fontWeight="bold"
                            >
                                {isSystem ? "SYS" : isPsu ? "PSU" : "PER"}
                            </text>

                            {/* Connector Pins (Visual Detail) */}
                            <rect x={10} y={20} width={20} height={160} fill="rgba(255,255,255,0.2)" rx={1} />
                        </g>
                    );
                })}

                {/* Installed Components Layer */}
                {slots.map((slot, index) => {
                    if (slot.blockedBy) return null; // Skip blocked slots, they are covered by the blocker
                    if (!slot.componentId) return null;

                    const x = PADDING + (index * (SLOT_WIDTH + GAP));
                    const y = PADDING;

                    // Calculate width based on slot.width (HP)
                    // 4HP = 1 slot width
                    // 8HP = 2 slot widths + 1 gap
                    const slotsCovered = Math.ceil((slot.width || 4) / 4);
                    const width = (slotsCovered * SLOT_WIDTH) + ((slotsCovered - 1) * GAP);

                    return (
                        <g key={`comp-${slot.id}`} transform={`translate(${x}, ${y})`}>
                            <rect
                                width={width}
                                height={SLOT_HEIGHT}
                                fill="rgba(255, 255, 255, 0.1)"
                                stroke="white"
                                strokeWidth={2}
                                rx={4}
                            />
                            <text
                                x={width / 2}
                                y={SLOT_HEIGHT / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="14"
                                fontWeight="bold"
                                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                                className="pointer-events-none select-none"
                            >
                                {slot.componentId}
                            </text>
                            {slotsCovered > 1 && (
                                <text
                                    x={width / 2}
                                    y={SLOT_HEIGHT / 2 + 20}
                                    textAnchor="middle"
                                    fill="rgba(255,255,255,0.7)"
                                    fontSize="10"
                                >
                                    ({slot.width}HP)
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
